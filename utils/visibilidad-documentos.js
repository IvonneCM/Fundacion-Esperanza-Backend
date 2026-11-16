const ROLES_QUE_VEN_PENDIENTES = ['admin', 'archivista'];

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
