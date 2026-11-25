import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
  SalidaAlmacen,
  DetalleSalidaAlmacen,
  InventarioAlmacenLote,
  InventarioAlmacenProducto,
  Usuario
} from '../models/index.js';
import { ErrorNegocio } from '../utils/error-negocio.js';
import { inicioDelDia, finDelDia, fechaLocal, diasEntre } from '../utils/fechas-bolivia.js';
import { salidaPublico, redondear } from '../utils/inventario-publico.js';
import { responderError } from '../utils/responder-error.js';

const ITEMS_DE_LA_SALIDA = sequelize.literal(`(
  SELECT COUNT(*)
  FROM detalle_salida_almacen AS d
  WHERE d.salida_almacen_id = "SalidaAlmacen"."id"
)`);

const INCLUIR_DESPACHADO_POR = {
  model: Usuario,
  as: 'despachadoPor',
  attributes: ['id', 'nombre', 'apellido']
};

const buscarSalida = (id) => {
  return SalidaAlmacen.findByPk(id, {
    include: [
      INCLUIR_DESPACHADO_POR,
      {
        model: DetalleSalidaAlmacen,
        as: 'detalles',
        include: [
          {
            model: InventarioAlmacenLote,
            as: 'lote',
            include: [
              {
                model: InventarioAlmacenProducto,
                as: 'producto'
              }
            ]
          }
        ]
      }
    ]
  });
};

// Decide de que lotes sale cada item, sin escribir nada. Los lotes que se tocan quedan
// bloqueados (FOR UPDATE). Si algo no cuadra se lanza un ErrorNegocio y la transaccion
// termina sin haber modificado filas.
//
// Sin lote indicado se aplica FEFO: primero el lote que vence antes, sin contar los
// vencidos, repartiendo entre lotes si hace falta; los lotes sin fecha de vencimiento (SFV)
// van al final. Con lote indicado se usa ese; si esta vencido solo se permite con
// confirmar_vencido y motivo_vencido (design.md §10.2), y queda registrado en el detalle.
const decidirOrigen = async (items, transaccion) => {
  const estado = new Map();
  const asignaciones = [];
  const hoy = fechaLocal(new Date());
  const desde = inicioDelDia(hoy);

  const registrar = (lote) => {
    if (!estado.has(lote.id)) {
      estado.set(lote.id, {
        lote,
        disponible: Number(lote.cantidad_actual),
        descontado: 0
      });
    }

    return estado.get(lote.id);
  };

  const descontar = (entrada, cantidad) => {
    entrada.disponible = redondear(entrada.disponible - cantidad);
    entrada.descontado = redondear(entrada.descontado + cantidad);
  };

  for (const [indice, item] of items.entries()) {
    const posicion = `Item ${indice + 1}`;

    const producto = await InventarioAlmacenProducto.findByPk(item.producto_id, {
      transaction: transaccion
    });

    if (!producto) {
      throw new ErrorNegocio(404, `${posicion}: el producto no existe`);
    }

    const cantidad = redondear(item.cantidad_base);

    if (item.inventario_almacen_lote_id) {
      let entrada = estado.get(item.inventario_almacen_lote_id);

      if (!entrada) {
        const lote = await InventarioAlmacenLote.findByPk(item.inventario_almacen_lote_id, {
          transaction: transaccion,
          lock: transaccion.LOCK.UPDATE
        });

        if (!lote) {
          throw new ErrorNegocio(404, `${posicion}: el lote indicado no existe`);
        }

        entrada = registrar(lote);
      }

      if (entrada.lote.producto_id !== producto.id) {
        throw new ErrorNegocio(400, `${posicion}: el lote pertenece a otro producto`);
      }

      const vencido = entrada.lote.fecha_expiracion !== null
        && entrada.lote.fecha_expiracion < desde;
      let datosVencido = null;

      if (vencido) {
        const diasVencido = diasEntre(fechaLocal(entrada.lote.fecha_expiracion), hoy);

        if (!item.confirmar_vencido) {
          throw new ErrorNegocio(
            409,
            `${posicion}: el lote vencio hace ${diasVencido} dia(s) y tiene ${entrada.disponible} ${producto.unidad_medida}; confirme con confirmar_vencido y motivo_vencido para sacarlo`
          );
        }

        datosVencido = {
          dias_vencido: diasVencido,
          motivo_vencido: item.motivo_vencido
        };
      }

      if (entrada.disponible < cantidad) {
        throw new ErrorNegocio(
          409,
          `${posicion}: stock insuficiente en el lote (disponible ${entrada.disponible} ${producto.unidad_medida}, solicitado ${cantidad})`
        );
      }

      descontar(entrada, cantidad);
      asignaciones.push({ lote: entrada.lote, cantidad, ...datosVencido });
      continue;
    }

    const lotes = await InventarioAlmacenLote.findAll({
      where: {
        producto_id: producto.id,
        cantidad_actual: { [Op.gt]: 0 },
        [Op.or]: [
          { fecha_expiracion: { [Op.gte]: desde } },
          { fecha_expiracion: null }
        ]
      },
      order: [
        [sequelize.literal('"fecha_expiracion" ASC NULLS LAST')],
        ['fecha_inventario_inicial', 'ASC']
      ],
      transaction: transaccion,
      lock: transaccion.LOCK.UPDATE
    });

    let pendiente = cantidad;
    const tomadas = [];

    for (const fila of lotes) {
      if (pendiente <= 0) {
        break;
      }

      const entrada = registrar(fila);

      if (entrada.disponible <= 0) {
        continue;
      }

      const tomar = Math.min(pendiente, entrada.disponible);
      tomadas.push({ entrada, tomar });
      pendiente = redondear(pendiente - tomar);
    }

    if (pendiente > 0) {
      throw new ErrorNegocio(
        409,
        `${posicion}: stock insuficiente de ${producto.nombre} (disponible ${redondear(cantidad - pendiente)} ${producto.unidad_medida} sin contar vencidos, solicitado ${cantidad})`
      );
    }

    for (const { entrada, tomar } of tomadas) {
      descontar(entrada, tomar);
      asignaciones.push({ lote: entrada.lote, cantidad: tomar });
    }
  }

  return { asignaciones, estado };
};

export const getSalidas = async (req, res) => {
  try {
    const {
      tipo_salida: tipoSalida,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      buscar
    } = req.query;
    const pagina = Number(req.query.pagina ?? 1);
    const limite = Number(req.query.limite ?? 20);

    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      return res.status(400).json({
        ok: false,
        msg: 'fecha_desde no puede ser posterior a fecha_hasta'
      });
    }

    const where = {};

    if (tipoSalida) {
      where.tipo_salida = tipoSalida;
    }

    if (fechaDesde || fechaHasta) {
      where.fecha = {};

      if (fechaDesde) {
        where.fecha[Op.gte] = inicioDelDia(fechaDesde);
      }

      if (fechaHasta) {
        where.fecha[Op.lte] = finDelDia(fechaHasta);
      }
    }

    if (buscar) {
      const termino = `%${buscar}%`;

      where[Op.or] = [
        { responsable: { [Op.iLike]: termino } },
        { nro_csa: { [Op.iLike]: termino } }
      ];
    }

    const { rows, count } = await SalidaAlmacen.findAndCountAll({
      attributes: { include: [[ITEMS_DE_LA_SALIDA, 'items']] },
      include: [INCLUIR_DESPACHADO_POR],
      where,
      order: [['fecha', 'DESC']],
      offset: (pagina - 1) * limite,
      limit: limite
    });

    return res.json({
      ok: true,
      msg: 'Salidas obtenidas',
      total: count,
      pagina,
      limite,
      salidas: rows.map(salidaPublico)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const getSalida = async (req, res) => {
  try {
    const salida = await buscarSalida(req.params.id);

    if (!salida) {
      return res.status(404).json({ ok: false, msg: 'Salida no encontrada' });
    }

    return res.json({
      ok: true,
      msg: 'Salida obtenida',
      salida: salidaPublico(salida)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const crearSalida = async (req, res) => {
  try {
    const cuerpo = req.body;

    const idSalida = await sequelize.transaction(async (transaccion) => {
      const { asignaciones, estado } = await decidirOrigen(cuerpo.detalles, transaccion);

      const salida = await SalidaAlmacen.create(
        {
          nro_csa: cuerpo.nro_csa ?? null,
          area_solicitante: cuerpo.area_solicitante ?? null,
          responsable: cuerpo.responsable,
          programa_poa: cuerpo.programa_poa ?? null,
          usuario_id_despacha: req.usuario.id,
          fecha: cuerpo.fecha ?? new Date(),
          tipo_salida: 'consumo',
          observaciones: cuerpo.observaciones ?? null
        },
        { transaction: transaccion }
      );

      for (const { lote, cantidad, dias_vencido, motivo_vencido } of asignaciones) {
        await DetalleSalidaAlmacen.create(
          {
            cantidad_salida: cantidad,
            inventario_almacen_lote_id: lote.id,
            salida_almacen_id: salida.id,
            dias_vencido: dias_vencido ?? null,
            motivo_vencido: motivo_vencido ?? null
          },
          { transaction: transaccion }
        );
      }

      for (const entrada of estado.values()) {
        if (entrada.descontado > 0) {
          entrada.lote.cantidad_actual = redondear(
            Number(entrada.lote.cantidad_actual) - entrada.descontado
          );
          await entrada.lote.save({ transaction: transaccion });
        }
      }

      return salida.id;
    });

    const salida = await buscarSalida(idSalida);

    return res.status(201).json({
      ok: true,
      msg: 'Salida registrada',
      salida: salidaPublico(salida)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export default {
  getSalidas,
  getSalida,
  crearSalida
};
