// Reglas de validacion de documentos (design.md §10.1). Todas las funciones reciben la
// transaccion de quien llama: el cambio de metadatos y el del estado van juntos (NFR-01).

// Deja el documento en `estado`. Solo el estado `validado` registra quien y cuando.
export const aplicarEstadoDocumento = async (documento, estado, usuario, transaccion) => {
  const validado = estado === 'validado';

  await documento.update(
    {
      estado_validacion: estado,
      usuario_validacion_id: validado ? usuario.id : null,
      fecha_validacion: validado ? new Date() : null
    },
    { transaction: transaccion }
  );
};

// Estado de un documento tabular segun sus filas: con al menos una fila validada esta
// validado; si todas estan rechazadas, rechazado; en cualquier otro caso, pendiente.
export const calcularEstadoPorFilas = ({ total, validadas, rechazadas }) => {
  if (validadas > 0) {
    return 'validado';
  }

  if (total > 0 && rechazadas === total) {
    return 'rechazado';
  }

  return 'pendiente';
};

export const contarFilasPorEstado = async (modeloFilas, documentoId, transaccion) => {
  const where = { documento_id: documentoId };

  const total = await modeloFilas.count({ where, transaction: transaccion });
  const validadas = await modeloFilas.count({
    where: { ...where, estado_fila_validacion: 'validado' },
    transaction: transaccion
  });
  const rechazadas = await modeloFilas.count({
    where: { ...where, estado_fila_validacion: 'rechazado' },
    transaction: transaccion
  });

  return { total, validadas, rechazadas };
};

// Recalcula el estado del documento a partir de sus filas y lo guarda.
export const recalcularDocumento = async (documento, modeloFilas, usuario, transaccion) => {
  const conteo = await contarFilasPorEstado(modeloFilas, documento.id, transaccion);
  const estado = calcularEstadoPorFilas(conteo);

  await aplicarEstadoDocumento(documento, estado, usuario, transaccion);

  return estado;
};

export const documentoConEstado = (documento) => ({
  id: documento.id,
  estado_validacion: documento.estado_validacion,
  usuario_validacion_id: documento.usuario_validacion_id,
  fecha_validacion: documento.fecha_validacion
});

export default {
  aplicarEstadoDocumento,
  calcularEstadoPorFilas,
  contarFilasPorEstado,
  recalcularDocumento,
  documentoConEstado
};
