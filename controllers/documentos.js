import path from 'node:path';
import Documento from '../models/Documento.js';
import TipoDocumento from '../models/TipoDocumento.js';
import { subirArchivo, eliminarArchivo } from '../services/s3.js';

const EXTENSIONES_PERMITIDAS = ['jpg', 'jpeg', 'png', 'pdf'];
const EXTENSION_POR_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf'
};
const MAXIMO_CODIGO = 30;

const responderError = (res, error) => {
  console.log(error);
  res.status(500).json({
    ok: false,
    msg: 'Error en el servidor',
    error: process.env.NODE_ENV === 'production' ? undefined : error.message
  });
};

const sanearCodigo = (codigo) => {
  return String(codigo)
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, '-');
};

const dosDigitos = (numero) => String(numero).padStart(2, '0');

const generarCodigo = (codigoTipo) => {
  const ahora = new Date();
  const fecha = `${ahora.getFullYear()}${dosDigitos(ahora.getMonth() + 1)}${dosDigitos(ahora.getDate())}`;
  const hora = `${dosDigitos(ahora.getHours())}${dosDigitos(ahora.getMinutes())}${dosDigitos(ahora.getSeconds())}`;

  return `${codigoTipo}-${fecha}-${hora}`;
};

const obtenerExtension = (archivo) => {
  const extension = path.extname(archivo.originalname).replace('.', '').toLowerCase();

  if (EXTENSIONES_PERMITIDAS.includes(extension)) {
    return extension;
  }

  return EXTENSION_POR_MIME[archivo.mimetype];
};

const documentoPublico = (documento) => ({
  id: documento.id,
  codigo: documento.codigo,
  tipos_documentos_id: documento.tipos_documentos_id,
  ruta_archivo: documento.ruta_archivo,
  estado_ocr: documento.estado_ocr,
  estado_validacion: documento.estado_validacion,
  fecha_registro: documento.fecha_registro
});

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

export const crearDocumento = async (req, res) => {
  try {
    const { tipos_documentos_id, codigo } = req.body;

    if (!req.file) {
      return res.status(400).json({ ok: false, msg: 'Falta el archivo' });
    }

    const tipo = await TipoDocumento.findByPk(tipos_documentos_id);

    if (!tipo) {
      return res.status(404).json({ ok: false, msg: 'Tipo de documento no encontrado' });
    }

    const codigoFinal = codigo ? sanearCodigo(codigo) : generarCodigo(tipo.codigo);

    if (!codigoFinal) {
      return res.status(400).json({ ok: false, msg: 'El codigo no es valido' });
    }

    if (codigoFinal.length > MAXIMO_CODIGO) {
      return res.status(400).json({ ok: false, msg: `El codigo no puede superar ${MAXIMO_CODIGO} caracteres` });
    }

    const extension = obtenerExtension(req.file);
    const clave = `documentos/${tipo.codigo}/${codigoFinal}.${extension}`;

    await subirArchivo({
      clave,
      contenido: req.file.buffer,
      tipoContenido: req.file.mimetype
    });

    let documento;

    try {
      documento = await Documento.create({
        codigo: codigoFinal,
        tipos_documentos_id: tipo.id,
        ruta_archivo: clave,
        usuario_registro_id: req.usuario.id
      });
    } catch (error) {
      await eliminarArchivo(clave).catch((errorBorrado) => console.log(errorBorrado));
      throw error;
    }

    return res.status(201).json({
      ok: true,
      msg: 'Documento cargado',
      documento: documentoPublico(documento)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export default {
  getTipos,
  crearDocumento
};
