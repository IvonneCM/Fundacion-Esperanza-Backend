// Decision del 2026-11-25 (design.md §2): el visitante ve todo el modulo documental en
// solo lectura, tambien lo no validado. Para volver a ocultarle lo pendiente basta
// quitar 'visitante' de esta lista.
const ROLES_QUE_VEN_PENDIENTES = ['admin', 'archivista', 'visitante'];

export const puedeVerPendientes = (usuario) =>
  Boolean(usuario) && ROLES_QUE_VEN_PENDIENTES.includes(usuario.rol);

export const filtroDocumentosVisibles = (usuario) =>
  puedeVerPendientes(usuario) ? {} : { estado_validacion: 'validado' };

export const puedeVerDocumento = (usuario, documento) =>
  puedeVerPendientes(usuario) || documento.estado_validacion === 'validado';

export default {
  puedeVerPendientes,
  filtroDocumentosVisibles,
  puedeVerDocumento
};
