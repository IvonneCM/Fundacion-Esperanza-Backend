import path from 'node:path';
import { Op } from 'sequelize';
import { Documento, TipoDocumento } from '../models/index.js';
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

const PAGINA_POR_DEFECTO = 1;
const LIMITE_POR_DEFECTO = 20;

const esFechaSola = (fecha) => /^\d{4}-\d{2}-\d{2}$/.test(fecha);

const finDelDia = (fecha) => {
  const fin = new Date(`${fecha}T00:00:00.000Z`);
  fin.setUTCDate(fin.getUTCDate() + 1);
  return fin;
};

const documentoListado = (documento) => ({
  id: documento.id,
  codigo: documento.codigo,
  tipos_documentos_id: documento.tipos_documentos_id,
  tipo: documento.tipoDocumento
    ? {
        id: documento.tipoDocumento.id,
        nombre_tipo: documento.tipoDocumento.nombre_tipo,
        codigo: documento.tipoDocumento.codigo
      }
    : null,
  ruta_archivo: documento.ruta_archivo,
  estado_ocr: documento.estado_ocr,
  estado_validacion: documento.estado_validacion,
  fecha_registro: documento.fecha_registro,
  fecha_validacion: documento.fecha_validacion
});

export const getDocumentos = async (req, res) => {
  try {
    const where = {};
    const pagina = Number(req.query.pagina) || PAGINA_POR_DEFECTO;
    const limite = Number(req.query.limite) || LIMITE_POR_DEFECTO;

    if (req.usuario.rol === 'visitante') {
      where.estado_validacion = 'validado';
    } else if (req.query.estado_validacion) {
      where.estado_validacion = req.query.estado_validacion;
    }

    if (req.query.estado_ocr) {
      where.estado_ocr = req.query.estado_ocr;
    }

    if (req.query.tipos_documentos_id) {
      where.tipos_documentos_id = req.query.tipos_documentos_id;
    }

    if (req.query.codigo) {
      where.codigo = { [Op.iLike]: `%${req.query.codigo}%` };
    }

    if (req.query.q) {
      where[Op.or] = [
        { codigo: { [Op.iLike]: `%${req.query.q}%` } },
        { texto_ocr: { [Op.iLike]: `%${req.query.q}%` } }
      ];
    }

    if (req.query.fecha_desde) {
      where.fecha_registro = {
        ...(where.fecha_registro || {}),
        [Op.gte]: new Date(req.query.fecha_desde)
      };
    }

    if (req.query.fecha_hasta) {
      if (esFechaSola(req.query.fecha_hasta)) {
        where.fecha_registro = {
          ...(where.fecha_registro || {}),
          [Op.lt]: finDelDia(req.query.fecha_hasta)
        };
      } else {
        where.fecha_registro = {
          ...(where.fecha_registro || {}),
          [Op.lte]: new Date(req.query.fecha_hasta)
        };
      }
    }

    const incluirTipo = {
      model: TipoDocumento,
      as: 'tipoDocumento',
      attributes: ['id', 'nombre_tipo', 'codigo']
    };

    if (req.query.tipo) {
      incluirTipo.where = { codigo: String(req.query.tipo).toUpperCase() };
      incluirTipo.required = true;
    }

    const { count, rows } = await Documento.findAndCountAll({
      where,
      include: [incluirTipo],
      order: [['fecha_registro', 'DESC']],
      limit: limite,
      offset: (pagina - 1) * limite,
      distinct: true
    });

    return res.json({
      ok: true,
      msg: 'Documentos obtenidos',
      total: count,
      pagina,
      limite,
      documentos: rows.map(documentoListado)
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

export const actualizarCodigo = async (req, res) => {
  try {
    const documento = await Documento.findByPk(req.params.id);

    if (!documento) {
      return res.status(404).json({ ok: false, msg: 'Documento no encontrado' });
    }

    const codigoFinal = sanearCodigo(req.body.codigo);

    if (!codigoFinal) {
      return res.status(400).json({ ok: false, msg: 'El codigo no es valido' });
    }

    if (codigoFinal.length > MAXIMO_CODIGO) {
      return res.status(400).json({ ok: false, msg: `El codigo no puede superar ${MAXIMO_CODIGO} caracteres` });
    }

    documento.codigo = codigoFinal;
    await documento.save();

    return res.json({
      ok: true,
      msg: 'Codigo actualizado',
      documento: documentoPublico(documento)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export default {
  getDocumentos,
  crearDocumento,
  actualizarCodigo
};
