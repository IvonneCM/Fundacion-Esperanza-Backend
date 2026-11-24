import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import InventarioAlmacenProducto from '../models/InventarioAlmacenProducto.js';
import InventarioAlmacenLote from '../models/InventarioAlmacenLote.js';
import { responderError } from '../utils/responder-error.js';
import { productoPublico, lotePublico } from '../utils/inventario-publico.js';
import { inicioDelDia, fechaLocal } from '../utils/fechas-bolivia.js';

const MENSAJE_NO_ENCONTRADO = 'Producto no encontrado';
const MENSAJE_DUPLICADO = 'Ya existe un producto con ese codigo';

// Stock de un producto = suma de cantidad_actual de sus lotes (unidad base).
// El alias de tabla "InventarioAlmacenProducto" lo genera Sequelize a partir del nombre del modelo.
const STOCK_BASE = sequelize.literal(`(
  SELECT COALESCE(SUM(l.cantidad_actual), 0)
  FROM inventario_almacen_lote AS l
  WHERE l.producto_id = "InventarioAlmacenProducto"."id"
)`);

const ATRIBUTOS_CON_STOCK = {
  include: [[STOCK_BASE, 'stock_base']]
};

const normalizarCodigo = (codigo) => String(codigo).trim().toUpperCase();

const buscarProductoConStock = (id) => {
  return InventarioAlmacenProducto.findByPk(id, {
    attributes: ATRIBUTOS_CON_STOCK
  });
};

export const getProductos = async (req, res) => {
  try {
    const { buscar, tipo_envase: tipoEnvase } = req.query;
    const pagina = Number(req.query.pagina ?? 1);
    const limite = Number(req.query.limite ?? 20);

    const where = {};

    if (tipoEnvase) {
      where.tipo_envase = { [Op.iLike]: tipoEnvase };
    }

    if (buscar) {
      const termino = `%${buscar}%`;

      where[Op.or] = [
        { nombre: { [Op.iLike]: termino } },
        { codigo: { [Op.iLike]: termino } }
      ];
    }

    const { rows, count } = await InventarioAlmacenProducto.findAndCountAll({
      attributes: ATRIBUTOS_CON_STOCK,
      where,
      order: [['nombre', 'ASC']],
      offset: (pagina - 1) * limite,
      limit: limite
    });

    return res.json({
      ok: true,
      msg: 'Productos obtenidos',
      total: count,
      pagina,
      limite,
      productos: rows.map(productoPublico)
    });
  } catch (error) {
    responderError(res, error);
  }
};

// Stock que se puede usar hoy: suma de los lotes que no estan vencidos. Se arma en cada
// consulta porque depende de la fecha de hoy en La Paz.
const stockDisponibleHoy = () => {
  const desde = inicioDelDia(fechaLocal(new Date())).toISOString();

  return sequelize.literal(`(
    SELECT COALESCE(SUM(l.cantidad_actual), 0)
    FROM inventario_almacen_lote AS l
    WHERE l.producto_id = "InventarioAlmacenProducto"."id"
      AND l.fecha_expiracion >= ${sequelize.escape(desde)}
  )`);
};

// Alerta de stock bajo: productos cuyo stock disponible (sin lotes vencidos) es menor o
// igual al umbral, en unidad base. Incluye los que no tienen lotes.
export const getProductosPorAgotarse = async (req, res) => {
  try {
    const umbral = Number(req.query.umbral ?? 0);
    const pagina = Number(req.query.pagina ?? 1);
    const limite = Number(req.query.limite ?? 20);

    const disponible = stockDisponibleHoy();

    const { rows, count } = await InventarioAlmacenProducto.findAndCountAll({
      attributes: {
        include: [
          [STOCK_BASE, 'stock_base'],
          [disponible, 'stock_disponible_base']
        ]
      },
      where: sequelize.where(disponible, { [Op.lte]: umbral }),
      order: [
        [disponible, 'ASC'],
        ['nombre', 'ASC']
      ],
      offset: (pagina - 1) * limite,
      limit: limite
    });

    return res.json({
      ok: true,
      msg: 'Productos por agotarse obtenidos',
      umbral,
      total: count,
      pagina,
      limite,
      productos: rows.map(productoPublico)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const getProducto = async (req, res) => {
  try {
    const producto = await buscarProductoConStock(req.params.id);

    if (!producto) {
      return res.status(404).json({ ok: false, msg: MENSAJE_NO_ENCONTRADO });
    }

    // Lotes con existencias, en orden FEFO (primero el que vence antes).
    const lotes = await InventarioAlmacenLote.findAll({
      where: {
        producto_id: producto.id,
        cantidad_actual: { [Op.gt]: 0 }
      },
      order: [['fecha_expiracion', 'ASC']]
    });

    return res.json({
      ok: true,
      msg: 'Producto obtenido',
      producto: productoPublico(producto),
      lotes: lotes.map(lotePublico)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const crearProducto = async (req, res) => {
  try {
    const codigo = normalizarCodigo(req.body.codigo);

    const existente = await InventarioAlmacenProducto.findOne({
      where: { codigo }
    });

    if (existente) {
      return res.status(409).json({ ok: false, msg: MENSAJE_DUPLICADO });
    }

    const creado = await InventarioAlmacenProducto.create({
      codigo,
      nombre: req.body.nombre,
      tipo_envase: req.body.tipo_envase,
      unidad_medida: req.body.unidad_medida,
      contenido_neto_referencia: req.body.contenido_neto_referencia,
      precio_referencia_usd: req.body.precio_referencia_usd
    });

    const producto = await buscarProductoConStock(creado.id);

    return res.status(201).json({
      ok: true,
      msg: 'Producto creado',
      producto: productoPublico(producto)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const actualizarProducto = async (req, res) => {
  try {
    const producto = await InventarioAlmacenProducto.findByPk(req.params.id);

    if (!producto) {
      return res.status(404).json({ ok: false, msg: MENSAJE_NO_ENCONTRADO });
    }

    const codigo = normalizarCodigo(req.body.codigo);

    if (codigo !== producto.codigo) {
      const existente = await InventarioAlmacenProducto.findOne({
        where: { codigo }
      });

      if (existente) {
        return res.status(409).json({ ok: false, msg: MENSAJE_DUPLICADO });
      }
    }

    // Las cantidades de los lotes estan en la unidad base del producto y los precios
    // son por presentacion: cambiar cualquiera de los dos con lotes existentes
    // alteraria retroactivamente lo ya registrado.
    const cambiaUnidad = req.body.unidad_medida !== producto.unidad_medida;
    const cambiaContenido = Number(req.body.contenido_neto_referencia) !== Number(producto.contenido_neto_referencia);

    if (cambiaUnidad || cambiaContenido) {
      const lotes = await InventarioAlmacenLote.count({
        where: { producto_id: producto.id }
      });

      if (lotes > 0) {
        return res.status(409).json({
          ok: false,
          msg: 'No se puede cambiar la unidad de medida ni el contenido neto de un producto que ya tiene lotes'
        });
      }
    }

    producto.codigo = codigo;
    producto.nombre = req.body.nombre;
    producto.tipo_envase = req.body.tipo_envase;
    producto.unidad_medida = req.body.unidad_medida;
    producto.contenido_neto_referencia = req.body.contenido_neto_referencia;
    producto.precio_referencia_usd = req.body.precio_referencia_usd;
    await producto.save();

    const actualizado = await buscarProductoConStock(producto.id);

    return res.json({
      ok: true,
      msg: 'Producto actualizado',
      producto: productoPublico(actualizado)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export default {
  getProductos,
  getProductosPorAgotarse,
  getProducto,
  crearProducto,
  actualizarProducto
};
