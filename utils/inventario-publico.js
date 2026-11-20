// Postgres devuelve los numeric como texto; la API los entrega como numero.
export const redondear = (valor, decimales = 2) => {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
};

const aNumero = (valor) => {
  if (valor === null || valor === undefined) {
    return null;
  }

  return Number(valor);
};

// Requiere que la consulta incluya el atributo calculado `stock_base`
// (SUM de cantidad_actual de los lotes del producto).
export const productoPublico = (producto) => {
  const contenido = Number(producto.contenido_neto_referencia);
  const stockBase = Number(producto.get('stock_base') ?? 0);

  return {
    id: producto.id,
    codigo: producto.codigo,
    nombre: producto.nombre,
    tipo_envase: producto.tipo_envase,
    unidad_medida: producto.unidad_medida,
    contenido_neto_referencia: contenido,
    precio_referencia_usd: Number(producto.precio_referencia_usd),
    stock_base: stockBase,
    stock_presentaciones: contenido > 0 ? redondear(stockBase / contenido) : null
  };
};

export const lotePublico = (lote) => {
  return {
    id: lote.id,
    producto_id: lote.producto_id,
    nombre: lote.nombre,
    cantidad_actual: Number(lote.cantidad_actual),
    cantidad_inicial: Number(lote.cantidad_inicial),
    unidad_medida: lote.unidad_medida,
    precio_unitario_usd: aNumero(lote.precio_unitario_usd),
    notas: lote.notas,
    fecha_expiracion: lote.fecha_expiracion,
    fecha_inventario_inicial: lote.fecha_inventario_inicial
  };
};

export const detalleIngresoPublico = (detalle) => {
  const lote = detalle.lote;
  const producto = lote?.producto;
  const cantidadBase = Number(detalle.cantidad_ingresada);
  const contenido = producto ? Number(producto.contenido_neto_referencia) : 0;

  return {
    id: detalle.id,
    producto: producto
      ? {
          id: producto.id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          unidad_medida: producto.unidad_medida,
          contenido_neto_referencia: contenido
        }
      : null,
    lote_id: detalle.inventario_almacen_lote_id,
    cantidad_base: cantidadBase,
    cantidad_presentaciones: contenido > 0 ? redondear(cantidadBase / contenido) : null,
    precio_unitario_usd: Number(detalle.precio_unitario_usd),
    precio_unitario_bs: aNumero(detalle.precio_unitario_bs),
    fecha_expiracion: detalle.fecha_expiracion
  };
};

// `items` solo viene en los listados (conteo calculado); en el detalle se usa `detalles`.
export const ingresoPublico = (ingreso) => {
  const publico = {
    id: ingreso.id,
    tipo_ingreso: ingreso.tipo_ingreso,
    fecha: ingreso.fecha,
    nro_cia: ingreso.nro_cia,
    nro_documento_respaldo: ingreso.nro_documento_respaldo,
    tipo_cambio_bs_usd: Number(ingreso.tipo_cambio_bs_usd),
    moneda_compra: ingreso.moneda_compra,
    monto_total_bs: aNumero(ingreso.monto_total_bs),
    motivo: ingreso.motivo,
    observaciones: ingreso.observaciones,
    proveedor: ingreso.proveedor
      ? {
          id: ingreso.proveedor.id,
          razon_proveedor: ingreso.proveedor.razon_proveedor,
          ci_nit_proveedor: ingreso.proveedor.ci_nit_proveedor
        }
      : null,
    recibido_por: ingreso.recibidoPor
      ? {
          id: ingreso.recibidoPor.id,
          nombre: ingreso.recibidoPor.nombre,
          apellido: ingreso.recibidoPor.apellido
        }
      : null
  };

  const items = ingreso.get('items');

  if (items !== undefined) {
    publico.items = Number(items);
  }

  if (ingreso.detalles) {
    publico.detalles = ingreso.detalles.map(detalleIngresoPublico);
  }

  return publico;
};

export default {
  productoPublico,
  lotePublico,
  detalleIngresoPublico,
  ingresoPublico
};
