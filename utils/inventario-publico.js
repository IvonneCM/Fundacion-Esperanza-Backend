import { fechaLocal, diasEntre } from './fechas-bolivia.js';

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
    producto_base_id: producto.producto_base_id ?? null,
    marca: producto.marca ?? null,
    medida_casera_nombre: producto.medida_casera_nombre ?? null,
    medida_casera_cantidad: aNumero(producto.medida_casera_cantidad),
    stock_base: stockBase,
    stock_presentaciones: contenido > 0 ? redondear(stockBase / contenido) : null,
    ...stockDisponible(producto)
  };
};

// Solo aparece cuando la consulta calcula `stock_disponible_base` (alerta por-agotarse):
// el stock sin contar los lotes vencidos.
const stockDisponible = (producto) => {
  const disponible = producto.get('stock_disponible_base');

  if (disponible === undefined || disponible === null) {
    return {};
  }

  return { stock_disponible_base: Number(disponible) };
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
    vence_el: fechaLocal(lote.fecha_expiracion),
    fecha_inventario_inicial: lote.fecha_inventario_inicial
  };
};

// Lote con el producto al que pertenece y la cantidad tambien en presentaciones.
export const loteConProductoPublico = (lote) => {
  const producto = lote.producto;
  const contenido = producto ? Number(producto.contenido_neto_referencia) : 0;
  const cantidadActual = Number(lote.cantidad_actual);

  return {
    ...lotePublico(lote),
    cantidad_presentaciones: contenido > 0 ? redondear(cantidadActual / contenido) : null,
    producto: producto
      ? {
          id: producto.id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          unidad_medida: producto.unidad_medida,
          contenido_neto_referencia: contenido
        }
      : null
  };
};

// Para la alerta de vencimientos: dias_para_vencer es negativo si ya vencio.
export const loteAlertaPublico = (lote, hoy) => {
  const vence = fechaLocal(lote.fecha_expiracion);
  const diasParaVencer = vence ? diasEntre(hoy, vence) : null;

  return {
    ...loteConProductoPublico(lote),
    dias_para_vencer: diasParaVencer,
    vencido: diasParaVencer !== null && diasParaVencer < 0
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

export const detalleSalidaPublico = (detalle) => {
  const lote = detalle.lote;
  const producto = lote?.producto;
  const cantidadBase = Number(detalle.cantidad_salida);
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
    fecha_expiracion: lote ? fechaLocal(lote.fecha_expiracion) : null,
    cantidad_base: cantidadBase,
    cantidad_presentaciones: contenido > 0 ? redondear(cantidadBase / contenido) : null,
    dias_vencido: aNumero(detalle.dias_vencido),
    motivo_vencido: detalle.motivo_vencido ?? null
  };
};

// `items` solo viene en los listados (conteo calculado); en el detalle se usa `detalles`.
export const salidaPublico = (salida) => {
  const publico = {
    id: salida.id,
    tipo_salida: salida.tipo_salida,
    fecha: salida.fecha,
    nro_csa: salida.nro_csa,
    area_solicitante: salida.area_solicitante,
    responsable: salida.responsable,
    programa_poa: salida.programa_poa,
    observaciones: salida.observaciones,
    despachado_por: salida.despachadoPor
      ? {
          id: salida.despachadoPor.id,
          nombre: salida.despachadoPor.nombre,
          apellido: salida.despachadoPor.apellido
        }
      : null
  };

  const items = salida.get('items');

  if (items !== undefined) {
    publico.items = Number(items);
  }

  if (salida.detalles) {
    publico.detalles = salida.detalles.map(detalleSalidaPublico);
  }

  return publico;
};

export default {
  productoPublico,
  lotePublico,
  detalleIngresoPublico,
  ingresoPublico,
  detalleSalidaPublico,
  salidaPublico
};
