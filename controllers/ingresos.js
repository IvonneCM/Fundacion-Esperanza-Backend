import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
  IngresoAlmacen,
  DetalleIngresoAlmacen,
  InventarioAlmacenLote,
  InventarioAlmacenProducto,
  Proveedor,
  Usuario
} from '../models/index.js';
import { ErrorNegocio } from '../utils/error-negocio.js';
import { inicioDelDia, finDelDia, fechaLocal } from '../utils/fechas-bolivia.js';
import { ingresoPublico, redondear } from '../utils/inventario-publico.js';
import { CANTIDAD_MAXIMA } from '../utils/inventario-reglas.js';
import { responderError } from '../utils/responder-error.js';

const ITEMS_DEL_INGRESO = sequelize.literal(`(
  SELECT COUNT(*)
  FROM detalle_ingreso_almacen AS d
  WHERE d.ingreso_almacen_id = "IngresoAlmacen"."id"
)`);

const INCLUIR_PROVEEDOR = {
  model: Proveedor,
  as: 'proveedor',
  attributes: ['id', 'razon_proveedor', 'ci_nit_proveedor']
};

const INCLUIR_RECIBIDO_POR = {
  model: Usuario,
  as: 'recibidoPor',
  attributes: ['id', 'nombre', 'apellido']
};

const buscarIngreso = (id) => {
  return IngresoAlmacen.findByPk(id, {
    include: [
      INCLUIR_PROVEEDOR,
      INCLUIR_RECIBIDO_POR,
      {
        model: DetalleIngresoAlmacen,
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

// Lee y valida todos los items antes de escribir nada: si algo no cuadra, la transaccion
// termina sin haber insertado filas. Los lotes existentes se bloquean (FOR UPDATE).
const prepararItems = async (items, transaccion) => {
  const lotesCargados = new Map();
  const preparados = [];

  for (const [indice, item] of items.entries()) {
    const posicion = `Item ${indice + 1}`;

    const producto = await InventarioAlmacenProducto.findByPk(item.producto_id, {
      transaction: transaccion
    });

    if (!producto) {
      throw new ErrorNegocio(404, `${posicion}: el producto no existe`);
    }

    const cantidadBase = redondear(
      item.cantidad_presentaciones * Number(producto.contenido_neto_referencia)
    );

    if (cantidadBase <= 0 || cantidadBase > CANTIDAD_MAXIMA) {
      throw new ErrorNegocio(400, `${posicion}: la cantidad resultante esta fuera de rango`);
    }

    let lote = null;

    if (item.inventario_almacen_lote_id) {
      lote = lotesCargados.get(item.inventario_almacen_lote_id);

      if (!lote) {
        lote = await InventarioAlmacenLote.findByPk(item.inventario_almacen_lote_id, {
          transaction: transaccion,
          lock: transaccion.LOCK.UPDATE
        });

        if (lote) {
          lotesCargados.set(lote.id, lote);
        }
      }

      if (!lote) {
        throw new ErrorNegocio(404, `${posicion}: el lote indicado no existe`);
      }

      if (lote.producto_id !== producto.id) {
        throw new ErrorNegocio(400, `${posicion}: el lote pertenece a otro producto`);
      }

      // Sin fecha (SFV) cuenta como una fecha mas: dos lotes SFV son el mismo lote.
      const fechaDelLote = fechaLocal(lote.fecha_expiracion);
      const fechaDelItem = item.fecha_expiracion ?? null;

      if (fechaDelLote !== fechaDelItem) {
        throw new ErrorNegocio(
          400,
          `${posicion}: la fecha de vencimiento no coincide con la del lote (${fechaDelLote ?? 'sin fecha'}); si es otra fecha, es otro lote`
        );
      }
    }

    // Precio por presentacion: el indicado, o el del lote, o el de referencia del producto.
    const precio = item.precio_unitario_usd
      ?? (lote?.precio_unitario_usd ? Number(lote.precio_unitario_usd) : null)
      ?? Number(producto.precio_referencia_usd);

    preparados.push({
      item,
      producto,
      lote,
      cantidadBase,
      precio
    });
  }

  return preparados;
};

export const getIngresos = async (req, res) => {
  try {
    const {
      tipo_ingreso: tipoIngreso,
      proveedor_id: proveedorId,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta
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

    if (tipoIngreso) {
      where.tipo_ingreso = tipoIngreso;
    }

    if (proveedorId) {
      where.proveedor_id = proveedorId;
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

    const { rows, count } = await IngresoAlmacen.findAndCountAll({
      attributes: { include: [[ITEMS_DEL_INGRESO, 'items']] },
      include: [INCLUIR_PROVEEDOR],
      where,
      order: [['fecha', 'DESC']],
      offset: (pagina - 1) * limite,
      limit: limite
    });

    return res.json({
      ok: true,
      msg: 'Ingresos obtenidos',
      total: count,
      pagina,
      limite,
      ingresos: rows.map(ingresoPublico)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const getIngreso = async (req, res) => {
  try {
    const ingreso = await buscarIngreso(req.params.id);

    if (!ingreso) {
      return res.status(404).json({ ok: false, msg: 'Ingreso no encontrado' });
    }

    return res.json({
      ok: true,
      msg: 'Ingreso obtenido',
      ingreso: ingresoPublico(ingreso)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const crearIngreso = async (req, res) => {
  try {
    const cuerpo = req.body;

    if (cuerpo.tipo_ingreso === 'compra' && !cuerpo.proveedor_id) {
      return res.status(400).json({
        ok: false,
        msg: 'Un ingreso de tipo compra requiere proveedor'
      });
    }

    const idIngreso = await sequelize.transaction(async (transaccion) => {
      if (cuerpo.proveedor_id) {
        const proveedor = await Proveedor.findByPk(cuerpo.proveedor_id, {
          transaction: transaccion
        });

        if (!proveedor) {
          throw new ErrorNegocio(404, 'Proveedor no encontrado');
        }

        if (!proveedor.activo) {
          throw new ErrorNegocio(409, 'El proveedor esta desactivado');
        }
      }

      const preparados = await prepararItems(cuerpo.detalles, transaccion);

      const fechaIngreso = cuerpo.fecha ?? new Date();

      const ingreso = await IngresoAlmacen.create(
        {
          nro_cia: cuerpo.nro_cia ?? null,
          tipo_ingreso: cuerpo.tipo_ingreso,
          motivo: cuerpo.motivo ?? null,
          usuario_recibe: req.usuario.id,
          proveedor_id: cuerpo.proveedor_id ?? null,
          fecha: fechaIngreso,
          tipo_cambio_bs_usd: cuerpo.tipo_cambio_bs_usd,
          moneda_compra: cuerpo.moneda_compra ?? 'BOB',
          monto_total_bs: cuerpo.monto_total_bs ?? null,
          nro_documento_respaldo: cuerpo.nro_documento_respaldo ?? null,
          observaciones: cuerpo.observaciones ?? null
        },
        { transaction: transaccion }
      );

      for (const { item, producto, lote, cantidadBase, precio } of preparados) {
        let loteDestino = lote;

        if (loteDestino) {
          // Lote existente: solo sube cantidad_actual; cantidad_inicial no se toca.
          const nuevaCantidad = redondear(Number(loteDestino.cantidad_actual) + cantidadBase);

          if (nuevaCantidad > CANTIDAD_MAXIMA) {
            throw new ErrorNegocio(400, 'La cantidad del lote supera el maximo permitido');
          }

          loteDestino.cantidad_actual = nuevaCantidad;
          await loteDestino.save({ transaction: transaccion });
        } else {
          loteDestino = await InventarioAlmacenLote.create(
            {
              producto_id: producto.id,
              nombre: producto.nombre,
              cantidad_actual: cantidadBase,
              cantidad_inicial: cantidadBase,
              unidad_medida: producto.unidad_medida,
              precio_unitario_usd: precio,
              notas: item.notas ?? null,
              fecha_expiracion: item.fecha_expiracion ? inicioDelDia(item.fecha_expiracion) : null,
              fecha_inventario_inicial: fechaIngreso
            },
            { transaction: transaccion }
          );
        }

        await DetalleIngresoAlmacen.create(
          {
            cantidad_ingresada: cantidadBase,
            precio_unitario_usd: precio,
            precio_unitario_bs: item.precio_unitario_bs ?? null,
            fecha_expiracion: item.fecha_expiracion ?? null,
            ingreso_almacen_id: ingreso.id,
            inventario_almacen_lote_id: loteDestino.id
          },
          { transaction: transaccion }
        );
      }

      return ingreso.id;
    });

    const ingreso = await buscarIngreso(idIngreso);

    return res.status(201).json({
      ok: true,
      msg: 'Ingreso registrado',
      ingreso: ingresoPublico(ingreso)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export default {
  getIngresos,
  getIngreso,
  crearIngreso
};
