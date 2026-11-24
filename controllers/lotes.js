import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
  IngresoAlmacen,
  DetalleIngresoAlmacen,
  SalidaAlmacen,
  DetalleSalidaAlmacen,
  InventarioAlmacenLote,
  InventarioAlmacenProducto
} from '../models/index.js';
import { ErrorNegocio } from '../utils/error-negocio.js';
import { fechaLocal, finDelDia, sumarDias } from '../utils/fechas-bolivia.js';
import {
  loteAlertaPublico,
  lotePublico,
  loteConProductoPublico,
  redondear
} from '../utils/inventario-publico.js';
import { CANTIDAD_MAXIMA } from '../utils/inventario-reglas.js';
import { responderError } from '../utils/responder-error.js';

const MAXIMO_RESPONSABLE = 100;
const DIAS_POR_DEFECTO = 30;

const INCLUIR_PRODUCTO = {
  model: InventarioAlmacenProducto,
  as: 'producto'
};

export const getLotes = async (req, res) => {
  try {
    const {
      producto_id: productoId,
      con_stock: conStock,
      vence_antes_de: venceAntesDe,
      buscar
    } = req.query;
    const pagina = Number(req.query.pagina ?? 1);
    const limite = Number(req.query.limite ?? 20);

    const where = {};

    if (productoId) {
      where.producto_id = productoId;
    }

    if (conStock !== undefined) {
      where.cantidad_actual = conStock ? { [Op.gt]: 0 } : { [Op.lte]: 0 };
    }

    if (venceAntesDe) {
      where.fecha_expiracion = { [Op.lte]: finDelDia(venceAntesDe) };
    }

    if (buscar) {
      where.nombre = { [Op.iLike]: `%${buscar}%` };
    }

    const { rows, count } = await InventarioAlmacenLote.findAndCountAll({
      include: [INCLUIR_PRODUCTO],
      where,
      order: [
        ['fecha_expiracion', 'ASC'],
        ['nombre', 'ASC']
      ],
      offset: (pagina - 1) * limite,
      limit: limite
    });

    return res.json({
      ok: true,
      msg: 'Lotes obtenidos',
      total: count,
      pagina,
      limite,
      lotes: rows.map(loteConProductoPublico)
    });
  } catch (error) {
    responderError(res, error);
  }
};

// Alerta de vencimientos: lotes con existencias que vencen dentro de `dias` dias (o que
// ya vencieron y siguen en el almacen, con dias_para_vencer negativo).
export const getLotesPorVencer = async (req, res) => {
  try {
    const dias = Number(req.query.dias ?? DIAS_POR_DEFECTO);
    const pagina = Number(req.query.pagina ?? 1);
    const limite = Number(req.query.limite ?? 20);

    const hoy = fechaLocal(new Date());
    const limiteFecha = finDelDia(sumarDias(hoy, dias));

    const { rows, count } = await InventarioAlmacenLote.findAndCountAll({
      include: [INCLUIR_PRODUCTO],
      where: {
        cantidad_actual: { [Op.gt]: 0 },
        fecha_expiracion: { [Op.lte]: limiteFecha }
      },
      order: [
        ['fecha_expiracion', 'ASC'],
        ['nombre', 'ASC']
      ],
      offset: (pagina - 1) * limite,
      limit: limite
    });

    return res.json({
      ok: true,
      msg: 'Lotes por vencer obtenidos',
      dias,
      total: count,
      pagina,
      limite,
      lotes: rows.map((lote) => loteAlertaPublico(lote, hoy))
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const getLote = async (req, res) => {
  try {
    const lote = await InventarioAlmacenLote.findByPk(req.params.id, {
      include: [
        INCLUIR_PRODUCTO,
        {
          model: DetalleIngresoAlmacen,
          as: 'detallesIngreso',
          include: [{ model: IngresoAlmacen, as: 'ingreso' }]
        },
        {
          model: DetalleSalidaAlmacen,
          as: 'detallesSalida',
          include: [{ model: SalidaAlmacen, as: 'salida' }]
        }
      ]
    });

    if (!lote) {
      return res.status(404).json({ ok: false, msg: 'Lote no encontrado' });
    }

    const ingresos = lote.detallesIngreso.map((detalle) => ({
      tipo: 'ingreso',
      subtipo: detalle.ingreso.tipo_ingreso,
      movimiento_id: detalle.ingreso.id,
      fecha: detalle.ingreso.fecha,
      cantidad_base: Number(detalle.cantidad_ingresada)
    }));

    const salidas = lote.detallesSalida.map((detalle) => ({
      tipo: 'salida',
      subtipo: detalle.salida.tipo_salida,
      movimiento_id: detalle.salida.id,
      fecha: detalle.salida.fecha,
      cantidad_base: Number(detalle.cantidad_salida)
    }));

    const movimientos = [...ingresos, ...salidas].sort(
      (a, b) => new Date(b.fecha) - new Date(a.fecha)
    );

    return res.json({
      ok: true,
      msg: 'Lote obtenido',
      lote: loteConProductoPublico(lote),
      movimientos
    });
  } catch (error) {
    responderError(res, error);
  }
};

// Ajuste por conteo manual. El stock nunca se edita directo: la diferencia entre lo
// contado y lo que dice el sistema queda registrada como un movimiento.
//   - Contaste mas  -> ingreso de tipo 'ajuste' (sin proveedor).
//   - Contaste menos -> salida de tipo 'ajuste'.
export const ajustarLote = async (req, res) => {
  try {
    const cuerpo = req.body;

    const resultado = await sequelize.transaction(async (transaccion) => {
      const lote = await InventarioAlmacenLote.findByPk(req.params.id, {
        transaction: transaccion,
        lock: transaccion.LOCK.UPDATE
      });

      if (!lote) {
        throw new ErrorNegocio(404, 'Lote no encontrado');
      }

      const producto = await InventarioAlmacenProducto.findByPk(lote.producto_id, {
        transaction: transaccion
      });

      const contada = cuerpo.cantidad_contada
        ?? redondear(cuerpo.cantidad_contada_presentaciones * Number(producto.contenido_neto_referencia));

      if (contada < 0 || contada > CANTIDAD_MAXIMA) {
        throw new ErrorNegocio(400, 'La cantidad contada esta fuera de rango');
      }

      const actual = Number(lote.cantidad_actual);
      const diferencia = redondear(contada - actual);

      if (diferencia === 0) {
        throw new ErrorNegocio(400, 'El conteo coincide con el stock del sistema: no hay nada que ajustar');
      }

      let movimiento;

      if (diferencia > 0) {
        let tipoCambio = cuerpo.tipo_cambio_bs_usd;

        if (!tipoCambio) {
          const ultimo = await IngresoAlmacen.findOne({
            attributes: ['tipo_cambio_bs_usd'],
            order: [['fecha', 'DESC']],
            transaction: transaccion
          });

          if (!ultimo) {
            throw new ErrorNegocio(
              409,
              'Indique tipo_cambio_bs_usd: todavia no hay ingresos de donde tomar el tipo de cambio'
            );
          }

          tipoCambio = Number(ultimo.tipo_cambio_bs_usd);
        }

        const precio = cuerpo.precio_unitario_usd
          ?? (lote.precio_unitario_usd ? Number(lote.precio_unitario_usd) : null)
          ?? Number(producto.precio_referencia_usd);

        const ingreso = await IngresoAlmacen.create(
          {
            tipo_ingreso: 'ajuste',
            motivo: cuerpo.motivo,
            usuario_recibe: req.usuario.id,
            proveedor_id: null,
            fecha: new Date(),
            tipo_cambio_bs_usd: tipoCambio,
            moneda_compra: 'BOB'
          },
          { transaction: transaccion }
        );

        await DetalleIngresoAlmacen.create(
          {
            cantidad_ingresada: diferencia,
            precio_unitario_usd: precio,
            fecha_expiracion: fechaLocal(lote.fecha_expiracion),
            ingreso_almacen_id: ingreso.id,
            inventario_almacen_lote_id: lote.id
          },
          { transaction: transaccion }
        );

        movimiento = { tipo: 'ingreso', id: ingreso.id };
      } else {
        const salida = await SalidaAlmacen.create(
          {
            responsable: `${req.usuario.nombre} ${req.usuario.apellido}`.slice(0, MAXIMO_RESPONSABLE),
            usuario_id_despacha: req.usuario.id,
            fecha: new Date(),
            tipo_salida: 'ajuste',
            observaciones: cuerpo.motivo
          },
          { transaction: transaccion }
        );

        await DetalleSalidaAlmacen.create(
          {
            cantidad_salida: redondear(-diferencia),
            inventario_almacen_lote_id: lote.id,
            salida_almacen_id: salida.id
          },
          { transaction: transaccion }
        );

        movimiento = { tipo: 'salida', id: salida.id };
      }

      lote.cantidad_actual = contada;
      await lote.save({ transaction: transaccion });

      return {
        movimiento,
        cantidad_anterior: actual,
        cantidad_contada: contada,
        diferencia,
        lote
      };
    });

    return res.json({
      ok: true,
      msg: 'Ajuste registrado',
      ajuste: {
        movimiento: resultado.movimiento,
        cantidad_anterior: resultado.cantidad_anterior,
        cantidad_contada: resultado.cantidad_contada,
        diferencia: resultado.diferencia,
        lote: lotePublico(resultado.lote)
      }
    });
  } catch (error) {
    responderError(res, error);
  }
};

export default {
  ajustarLote
};
