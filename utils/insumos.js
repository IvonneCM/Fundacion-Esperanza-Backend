import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { fechaLocal, inicioDelDia } from './fechas-bolivia.js';
import { redondear } from './inventario-publico.js';

// Un insumo es un producto base (o un producto sin base) mas todas sus presentaciones
// (design.md 11). Todo se expresa en la unidad base del insumo.

const IDENTIDAD_INSUMO = 'COALESCE(p.producto_base_id, p.id)';

const desdeHoy = () => inicioDelDia(fechaLocal(new Date())).toISOString();

// Stock total y disponible (sin lotes vencidos; los SFV cuentan) de varios insumos a la vez.
const consultarStock = async (insumoIds, transaccion) => {
  const filas = await sequelize.query(
    `SELECT ${IDENTIDAD_INSUMO} AS insumo_id,
            COALESCE(SUM(l.cantidad_actual), 0) AS stock_base,
            COALESCE(SUM(l.cantidad_actual) FILTER (
              WHERE l.fecha_expiracion IS NULL OR l.fecha_expiracion >= :desde
            ), 0) AS stock_disponible_base
     FROM inventario_almacen_producto AS p
     JOIN inventario_almacen_lote AS l ON l.producto_id = p.id
     WHERE ${IDENTIDAD_INSUMO} IN (:insumoIds)
     GROUP BY 1`,
    {
      replacements: { insumoIds, desde: desdeHoy() },
      type: QueryTypes.SELECT,
      transaction: transaccion
    }
  );

  return new Map(filas.map((fila) => [fila.insumo_id, fila]));
};

// Precio vigente por unidad base: el del lote que se usaria primero (FEFO: el no vencido con
// stock que vence antes; los SFV al final, y entre ellos el ingreso mas antiguo).
const consultarPrecios = async (insumoIds, transaccion) => {
  const filas = await sequelize.query(
    `SELECT DISTINCT ON (${IDENTIDAD_INSUMO})
            ${IDENTIDAD_INSUMO} AS insumo_id,
            COALESCE(l.precio_unitario_usd, p.precio_referencia_usd) / p.contenido_neto_referencia AS precio_base_usd
     FROM inventario_almacen_producto AS p
     JOIN inventario_almacen_lote AS l ON l.producto_id = p.id
     WHERE ${IDENTIDAD_INSUMO} IN (:insumoIds)
       AND l.cantidad_actual > 0
       AND (l.fecha_expiracion IS NULL OR l.fecha_expiracion >= :desde)
     ORDER BY ${IDENTIDAD_INSUMO}, l.fecha_expiracion ASC NULLS LAST, l.fecha_inventario_inicial ASC`,
    {
      replacements: { insumoIds, desde: desdeHoy() },
      type: QueryTypes.SELECT,
      transaction: transaccion
    }
  );

  return new Map(filas.map((fila) => [fila.insumo_id, Number(fila.precio_base_usd)]));
};

// Recibe productos que son base (o sin base) y devuelve, por id, su disponibilidad y precio.
export const resumirInsumos = async (productos, transaccion) => {
  const resumen = new Map();

  if (productos.length === 0) {
    return resumen;
  }

  const insumoIds = productos.map((producto) => producto.id);
  const stock = await consultarStock(insumoIds, transaccion);
  const precios = await consultarPrecios(insumoIds, transaccion);

  for (const producto of productos) {
    const fila = stock.get(producto.id);
    const precioLote = precios.get(producto.id);
    const precioReferencia =
      Number(producto.precio_referencia_usd) / Number(producto.contenido_neto_referencia);

    resumen.set(producto.id, {
      stock_total_base: fila ? Number(fila.stock_base) : 0,
      stock_disponible_base: fila ? Number(fila.stock_disponible_base) : 0,
      precio_base_usd: redondear(precioLote ?? precioReferencia, 4),
      precio_fuente: precioLote === undefined ? 'referencia' : 'lote'
    });
  }

  return resumen;
};

export default { resumirInsumos };
