import ReferenciaSocialDatos from '../models/ReferenciaSocialDatos.js';
import { obtenerDocumentoDeTipo } from '../utils/documento-tipo.js';
import { responderError } from '../utils/responder-error.js';

const CAMPOS_REFERENCIA = [
  'cite',
  'fecha',
  'remitente_nombre',
  'remitente_cargo',
  'institucion_remitente',
  'nombre_paciente',
  'edad_paciente',
  'expediente_clinico',
  'diagnostico',
  'procedencia',
  'contenido'
];

const filtrarDatos = (body) => {
  const datos = {};

  for (const campo of CAMPOS_REFERENCIA) {
    if (body[campo] !== undefined) {
      datos[campo] = body[campo];
    }
  }

  return datos;
};

const verificarDocumento = async (req, res) => {
  const resultado = await obtenerDocumentoDeTipo(req.params.id, 'REFERENCIA');

  if (resultado.estado === 'no_encontrado') {
    res.status(404).json({ ok: false, msg: 'Documento no encontrado' });
    return null;
  }

  if (resultado.estado === 'tipo_incorrecto') {
    res.status(400).json({ ok: false, msg: 'El documento no es de tipo REFERENCIA' });
    return null;
  }

  return resultado.documento;
};

export const getReferenciaSocial = async (req, res) => {
  try {
    const documento = await verificarDocumento(req, res);

    if (!documento) {
      return;
    }

    const referencia = await ReferenciaSocialDatos.findOne({
      where: { documento_id: documento.id }
    });

    if (!referencia) {
      return res.status(404).json({ ok: false, msg: 'La referencia social no existe' });
    }

    return res.json({
      ok: true,
      msg: 'Referencia social obtenida',
      referencia
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const putReferenciaSocial = async (req, res) => {
  try {
    const documento = await verificarDocumento(req, res);

    if (!documento) {
      return;
    }

    const datos = filtrarDatos(req.body);
    const referencia = await ReferenciaSocialDatos.findOne({
      where: { documento_id: documento.id }
    });

    if (referencia) {
      await referencia.update(datos);

      return res.json({
        ok: true,
        msg: 'Referencia social actualizada',
        referencia
      });
    }

    const nueva = await ReferenciaSocialDatos.create({
      ...datos,
      documento_id: documento.id
    });

    return res.status(201).json({
      ok: true,
      msg: 'Referencia social creada',
      referencia: nueva
    });
  } catch (error) {
    responderError(res, error);
  }
};

export default {
  getReferenciaSocial,
  putReferenciaSocial
};
