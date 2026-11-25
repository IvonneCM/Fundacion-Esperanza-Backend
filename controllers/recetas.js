import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { InventarioAlmacenProducto, Receta, RecetaInsumo } from '../models/index.js';
import { ErrorNegocio } from '../utils/error-negocio.js';
import { resumirInsumos } from '../utils/insumos.js';
import { redondear } from '../utils/inventario-publico.js';
import { tipoCambioPorDefecto } from '../utils/moneda.js';
import { responderError } from '../utils/responder-error.js';

const MENSAJE_NO_ENCONTRADA = 'Receta no encontrada';

const INCLUIR_INSUMOS = {
  model: RecetaInsumo,
  as: 'insumos',
  include: [
    {
      model: InventarioAlmacenProducto,
      as: 'producto'
    }
  ]
};

// Subconsulta con los ids de las recetas que usan un insumo, para filtrar por `producto_id`.
const recetasDelInsumo = (productoId) => {
  return sequelize.literal(
    `(SELECT ri.receta_id FROM receta_insumos AS ri WHERE ri.insumo_id = ${sequelize.escape(productoId)})`
  );
};

const TOTAL_INSUMOS = sequelize.literal(`(
  SELECT COUNT(*)
  FROM receta_insumos AS ri
  WHERE ri.receta_id = "Receta"."id"
)`);

const textoOpcional = (valor) => {
  if (valor === undefined || valor === null) {
    return null;
  }

  const texto = String(valor).trim();

  return texto === '' ? null : texto;
};

// Tipo de cambio para mostrar Bs: el pedido por query, o el configurado (design.md 12.3).
const tipoCambioDe = (req) => {
  const pedido = Number(req.query.tipo_cambio_bs_usd);

  return Number.isFinite(pedido) && pedido > 0 ? pedido : tipoCambioPorDefecto();
};

// Receta con disponibilidad y precio vigente de cada insumo (design.md 11.3, 11.4 y 12.3).
const recetaPublica = async (receta, tipoCambio) => {
  const productos = receta.insumos.map((insumo) => insumo.producto);
  const resumen = await resumirInsumos(productos);

  let costoPorPersona = 0;

  const insumos = receta.insumos
    .map((insumo) => {
      const producto = insumo.producto;
      const datos = resumen.get(producto.id);
      const cantidad = Number(insumo.cantidad_requerida);
      const costo = cantidad * datos.precio_base_usd;

      costoPorPersona += costo;

      return {
        producto_id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        unidad_medida: producto.unidad_medida,
        cantidad_requerida: cantidad,
        medida_casera_nombre: producto.medida_casera_nombre ?? null,
        medida_casera_cantidad:
          producto.medida_casera_cantidad === null ? null : Number(producto.medida_casera_cantidad),
        stock_disponible_base: datos.stock_disponible_base,
        precio_base_usd: datos.precio_base_usd,
        precio_base_bs: redondear(datos.precio_base_usd * tipoCambio, 4),
        precio_fuente: datos.precio_fuente,
        costo_por_persona_usd: redondear(costo, 4),
        costo_por_persona_bs: redondear(costo * tipoCambio, 4)
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return {
    id: receta.id,
    nombre: receta.nombre,
    descripcion: receta.descripcion,
    costo_por_persona_usd: redondear(costoPorPersona, 4),
    costo_por_persona_bs: redondear(costoPorPersona * tipoCambio, 4),
    tipo_cambio_usado: tipoCambio,
    insumos
  };
};

const buscarRecetaCompleta = (id, transaccion) => {
  return Receta.findByPk(id, {
    include: [INCLUIR_INSUMOS],
    transaction: transaccion
  });
};

// Cada insumo debe existir, no repetirse y ser una base (o un producto sin base).
const validarInsumos = async (insumos, transaccion) => {
  const ids = insumos.map((insumo) => insumo.producto_id);

  if (new Set(ids).size !== ids.length) {
    throw new ErrorNegocio(400, 'Un insumo no puede repetirse en la misma receta');
  }

  const productos = await InventarioAlmacenProducto.findAll({
    where: { id: { [Op.in]: ids } },
    transaction: transaccion
  });
  const porId = new Map(productos.map((producto) => [producto.id, producto]));

  for (const id of ids) {
    const producto = porId.get(id);

    if (!producto) {
      throw new ErrorNegocio(400, `El insumo ${id} no existe`);
    }

    if (producto.producto_base_id) {
      throw new ErrorNegocio(
        400,
        `${producto.nombre} es una presentacion; la receta debe usar el producto base de ese insumo`
      );
    }
  }
};

const guardarInsumos = (recetaId, insumos, transaccion) => {
  return RecetaInsumo.bulkCreate(
    insumos.map((insumo) => ({
      receta_id: recetaId,
      insumo_id: insumo.producto_id,
      cantidad_requerida: insumo.cantidad_requerida
    })),
    { transaction: transaccion }
  );
};

export const getRecetas = async (req, res) => {
  try {
    const { buscar, producto_id: productoId } = req.query;
    const pagina = Number(req.query.pagina ?? 1);
    const limite = Number(req.query.limite ?? 20);

    const where = {};

    if (buscar) {
      where.nombre = { [Op.iLike]: `%${buscar}%` };
    }

    if (productoId) {
      where.id = { [Op.in]: recetasDelInsumo(productoId) };
    }

    const { rows, count } = await Receta.findAndCountAll({
      attributes: { include: [[TOTAL_INSUMOS, 'total_insumos']] },
      where,
      order: [['nombre', 'ASC']],
      offset: (pagina - 1) * limite,
      limit: limite
    });

    return res.json({
      ok: true,
      msg: 'Recetas obtenidas',
      total: count,
      pagina,
      limite,
      recetas: rows.map((receta) => ({
        id: receta.id,
        nombre: receta.nombre,
        descripcion: receta.descripcion,
        total_insumos: Number(receta.get('total_insumos'))
      }))
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const getReceta = async (req, res) => {
  try {
    const receta = await buscarRecetaCompleta(req.params.id);

    if (!receta) {
      return res.status(404).json({ ok: false, msg: MENSAJE_NO_ENCONTRADA });
    }

    return res.json({
      ok: true,
      msg: 'Receta obtenida',
      receta: await recetaPublica(receta, tipoCambioDe(req))
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const getDisponibilidadReceta = async (req, res) => {
  try {
    const personas = Number(req.query.personas);
    const receta = await buscarRecetaCompleta(req.params.id);

    if (!receta) {
      return res.status(404).json({ ok: false, msg: MENSAJE_NO_ENCONTRADA });
    }

    const tipoCambio = tipoCambioDe(req);
    const publica = await recetaPublica(receta, tipoCambio);

    const insumos = publica.insumos.map((insumo) => {
      const requerido = redondear(insumo.cantidad_requerida * personas, 4);
      const faltante = Math.max(0, redondear(requerido - insumo.stock_disponible_base, 4));

      return {
        producto_id: insumo.producto_id,
        codigo: insumo.codigo,
        nombre: insumo.nombre,
        unidad_medida: insumo.unidad_medida,
        requerido_base: requerido,
        disponible_base: insumo.stock_disponible_base,
        faltante_base: faltante,
        alcanza: faltante === 0
      };
    });

    return res.json({
      ok: true,
      msg: 'Disponibilidad de la receta calculada',
      receta: {
        id: publica.id,
        nombre: publica.nombre
      },
      personas,
      alcanza: insumos.every((insumo) => insumo.alcanza),
      costo_estimado_usd: redondear(publica.costo_por_persona_usd * personas, 2),
      costo_estimado_bs: redondear(publica.costo_por_persona_bs * personas, 2),
      tipo_cambio_usado: tipoCambio,
      insumos
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const crearReceta = async (req, res) => {
  try {
    const id = await sequelize.transaction(async (transaccion) => {
      await validarInsumos(req.body.insumos, transaccion);

      const receta = await Receta.create(
        {
          nombre: req.body.nombre,
          descripcion: textoOpcional(req.body.descripcion)
        },
        { transaction: transaccion }
      );

      await guardarInsumos(receta.id, req.body.insumos, transaccion);

      return receta.id;
    });

    const receta = await buscarRecetaCompleta(id);

    return res.status(201).json({
      ok: true,
      msg: 'Receta creada',
      receta: await recetaPublica(receta, tipoCambioPorDefecto())
    });
  } catch (error) {
    responderError(res, error);
  }
};

// PATCH: solo cambia lo que llega; `insumos`, si llega, reemplaza la lista completa.
export const actualizarReceta = async (req, res) => {
  try {
    const encontrada = await sequelize.transaction(async (transaccion) => {
      const receta = await Receta.findByPk(req.params.id, {
        transaction: transaccion,
        lock: transaccion.LOCK.UPDATE
      });

      if (!receta) {
        return false;
      }

      if (req.body.nombre !== undefined) {
        receta.nombre = req.body.nombre;
      }

      if (req.body.descripcion !== undefined) {
        receta.descripcion = textoOpcional(req.body.descripcion);
      }

      await receta.save({ transaction: transaccion });

      if (req.body.insumos !== undefined) {
        await validarInsumos(req.body.insumos, transaccion);

        await RecetaInsumo.destroy({
          where: { receta_id: receta.id },
          transaction: transaccion
        });

        await guardarInsumos(receta.id, req.body.insumos, transaccion);
      }

      return true;
    });

    if (!encontrada) {
      return res.status(404).json({ ok: false, msg: MENSAJE_NO_ENCONTRADA });
    }

    const receta = await buscarRecetaCompleta(req.params.id);

    return res.json({
      ok: true,
      msg: 'Receta actualizada',
      receta: await recetaPublica(receta, tipoCambioPorDefecto())
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const eliminarReceta = async (req, res) => {
  try {
    const eliminada = await sequelize.transaction(async (transaccion) => {
      const receta = await Receta.findByPk(req.params.id, { transaction: transaccion });

      if (!receta) {
        return false;
      }

      await RecetaInsumo.destroy({
        where: { receta_id: receta.id },
        transaction: transaccion
      });
      await receta.destroy({ transaction: transaccion });

      return true;
    });

    if (!eliminada) {
      return res.status(404).json({ ok: false, msg: MENSAJE_NO_ENCONTRADA });
    }

    return res.json({ ok: true, msg: 'Receta eliminada' });
  } catch (error) {
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        ok: false,
        msg: 'La receta forma parte de una planificacion de menu y no se puede eliminar'
      });
    }

    responderError(res, error);
  }
};

export default {
  getRecetas,
  getReceta,
  getDisponibilidadReceta,
  crearReceta,
  actualizarReceta,
  eliminarReceta
};
