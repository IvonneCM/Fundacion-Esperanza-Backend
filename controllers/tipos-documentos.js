import TipoDocumento from '../models/TipoDocumento.js';
import Documento from '../models/Documento.js';
import { responderError } from '../utils/responder-error.js';

const MAXIMO_CODIGO = 10;

const sanearCodigo = (codigo) => {
  return String(codigo)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]/g, '');
};

export const getTipos = async (req, res) => {
  try {
    const tipos = await TipoDocumento.findAll({
      order: [['nombre_tipo', 'ASC']]
    });

    return res.json({
      ok: true,
      msg: 'Tipos de documento obtenidos',
      tipos
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const getTipo = async (req, res) => {
  try {
    const tipo = await TipoDocumento.findByPk(req.params.id);

    if (!tipo) {
      return res.status(404).json({ ok: false, msg: 'Tipo de documento no encontrado' });
    }

    return res.json({
      ok: true,
      msg: 'Tipo de documento obtenido',
      tipo
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const crearTipo = async (req, res) => {
  try {
    const codigoFinal = sanearCodigo(req.body.codigo);

    if (!codigoFinal) {
      return res.status(400).json({ ok: false, msg: 'El codigo no es valido' });
    }

    if (codigoFinal.length > MAXIMO_CODIGO) {
      return res.status(400).json({ ok: false, msg: `El codigo no puede superar ${MAXIMO_CODIGO} caracteres` });
    }

    const existente = await TipoDocumento.findOne({
      where: { codigo: codigoFinal }
    });

    if (existente) {
      return res.status(409).json({ ok: false, msg: 'Ya existe un tipo de documento con ese codigo' });
    }

    const tipo = await TipoDocumento.create({
      nombre_tipo: req.body.nombre_tipo,
      codigo: codigoFinal
    });

    return res.status(201).json({
      ok: true,
      msg: 'Tipo de documento creado',
      tipo
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const actualizarTipo = async (req, res) => {
  try {
    const tipo = await TipoDocumento.findByPk(req.params.id);

    if (!tipo) {
      return res.status(404).json({ ok: false, msg: 'Tipo de documento no encontrado' });
    }

    if (req.body.codigo !== undefined && sanearCodigo(req.body.codigo) !== tipo.codigo) {
      return res.status(400).json({ ok: false, msg: 'El codigo del tipo de documento no se puede editar' });
    }

    tipo.nombre_tipo = req.body.nombre_tipo;
    await tipo.save();

    return res.json({
      ok: true,
      msg: 'Tipo de documento actualizado',
      tipo
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const eliminarTipo = async (req, res) => {
  try {
    const tipo = await TipoDocumento.findByPk(req.params.id);

    if (!tipo) {
      return res.status(404).json({ ok: false, msg: 'Tipo de documento no encontrado' });
    }

    const documentos = await Documento.count({
      where: { tipos_documentos_id: tipo.id }
    });

    if (documentos > 0) {
      return res.status(409).json({
        ok: false,
        msg: 'No se puede eliminar un tipo de documento que tiene documentos'
      });
    }

    await tipo.destroy();

    return res.json({
      ok: true,
      msg: 'Tipo de documento eliminado'
    });
  } catch (error) {
    responderError(res, error);
  }
};

export default {
  getTipos,
  getTipo,
  crearTipo,
  actualizarTipo,
  eliminarTipo
};
