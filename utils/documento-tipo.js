import Documento from '../models/Documento.js';
import TipoDocumento from '../models/TipoDocumento.js';

export const obtenerDocumentoDeTipo = async (documentoId, codigoTipo) => {
  const documento = await Documento.findByPk(documentoId);

  if (!documento) {
    return { estado: 'no_encontrado', documento: null, tipo: null };
  }

  const tipo = await TipoDocumento.findByPk(documento.tipos_documentos_id);

  if (!tipo || tipo.codigo !== codigoTipo) {
    return { estado: 'tipo_incorrecto', documento, tipo };
  }

  return { estado: 'ok', documento, tipo };
};

export default obtenerDocumentoDeTipo;
