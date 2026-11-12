import FichaSocialDatos from '../models/FichaSocialDatos.js';
import FichaSocialGrupoFamiliar from '../models/FichaSocialGrupoFamiliar.js';
import { obtenerDocumentoDeTipo } from '../utils/documento-tipo.js';
import { responderError } from '../utils/responder-error.js';

const CAMPOS_FICHA = [
  'nombre_paciente',
  'fecha_nacimiento',
  'edad_entrada',
  'grado_escolaridad',
  'procedencia',
  'domicilio_zona',
  'calle',
  'numero_casa',
  'celular_padre',
  'celular_madre',
  'diagnostico',
  'fecha_diagnostico',
  'medico_tratante',
  'hospital',
  'observaciones'
];

const CAMPOS_GRUPO = [
  'nombre_apellido',
  'parentesco',
  'edad',
  'estado_civil',
  'grado_instruccion',
  'ocupacion'
];

const filtrarDatos = (body, campos) => {
  const datos = {};

  for (const campo of campos) {
    if (body[campo] !== undefined) {
      datos[campo] = body[campo];
    }
  }

  return datos;
};

const verificarDocumento = async (req, res) => {
  const resultado = await obtenerDocumentoDeTipo(req.params.id, 'FICHA');

  if (resultado.estado === 'no_encontrado') {
    res.status(404).json({ ok: false, msg: 'Documento no encontrado' });
    return null;
  }

  if (resultado.estado === 'tipo_incorrecto') {
    res.status(400).json({ ok: false, msg: 'El documento no es de tipo FICHA' });
    return null;
  }

  return resultado.documento;
};

const obtenerFicha = async (documento, res) => {
  const ficha = await FichaSocialDatos.findOne({
    where: { documento_id: documento.id }
  });

  if (!ficha) {
    res.status(404).json({ ok: false, msg: 'La ficha social no existe' });
    return null;
  }

  return ficha;
};

export const getFichaSocial = async (req, res) => {
  try {
    const documento = await verificarDocumento(req, res);

    if (!documento) {
      return;
    }

    const ficha = await obtenerFicha(documento, res);

    if (!ficha) {
      return;
    }

    const grupo_familiar = await FichaSocialGrupoFamiliar.findAll({
      where: { ficha_social_id: ficha.id },
      order: [['nombre_apellido', 'ASC']]
    });

    return res.json({
      ok: true,
      msg: 'Ficha social obtenida',
      ficha,
      grupo_familiar
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const putFichaSocial = async (req, res) => {
  try {
    const documento = await verificarDocumento(req, res);

    if (!documento) {
      return;
    }

    const datos = filtrarDatos(req.body, CAMPOS_FICHA);
    const ficha = await FichaSocialDatos.findOne({
      where: { documento_id: documento.id }
    });

    if (ficha) {
      await ficha.update(datos);

      return res.json({
        ok: true,
        msg: 'Ficha social actualizada',
        ficha
      });
    }

    const nueva = await FichaSocialDatos.create({
      ...datos,
      documento_id: documento.id
    });

    return res.status(201).json({
      ok: true,
      msg: 'Ficha social creada',
      ficha: nueva
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const getGrupoFamiliar = async (req, res) => {
  try {
    const documento = await verificarDocumento(req, res);

    if (!documento) {
      return;
    }

    const ficha = await obtenerFicha(documento, res);

    if (!ficha) {
      return;
    }

    const pagina = Number(req.query.pagina) || 1;
    const limite = Number(req.query.limite) || 20;
    const { count, rows } = await FichaSocialGrupoFamiliar.findAndCountAll({
      where: { ficha_social_id: ficha.id },
      order: [['nombre_apellido', 'ASC']],
      limit: limite,
      offset: (pagina - 1) * limite
    });

    return res.json({
      ok: true,
      msg: 'Grupo familiar obtenido',
      total: count,
      pagina,
      limite,
      grupo_familiar: rows
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const crearGrupoFamiliar = async (req, res) => {
  try {
    const documento = await verificarDocumento(req, res);

    if (!documento) {
      return;
    }

    const ficha = await obtenerFicha(documento, res);

    if (!ficha) {
      return;
    }

    const integrante = await FichaSocialGrupoFamiliar.create({
      ...filtrarDatos(req.body, CAMPOS_GRUPO),
      ficha_social_id: ficha.id
    });

    return res.status(201).json({
      ok: true,
      msg: 'Integrante del grupo familiar creado',
      integrante
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const actualizarGrupoFamiliar = async (req, res) => {
  try {
    const documento = await verificarDocumento(req, res);

    if (!documento) {
      return;
    }

    const ficha = await obtenerFicha(documento, res);

    if (!ficha) {
      return;
    }

    const integrante = await FichaSocialGrupoFamiliar.findOne({
      where: {
        id: req.params.filaId,
        ficha_social_id: ficha.id
      }
    });

    if (!integrante) {
      return res.status(404).json({ ok: false, msg: 'Integrante del grupo familiar no encontrado' });
    }

    await integrante.update(filtrarDatos(req.body, CAMPOS_GRUPO));

    return res.json({
      ok: true,
      msg: 'Integrante del grupo familiar actualizado',
      integrante
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const eliminarGrupoFamiliar = async (req, res) => {
  try {
    const documento = await verificarDocumento(req, res);

    if (!documento) {
      return;
    }

    const ficha = await obtenerFicha(documento, res);

    if (!ficha) {
      return;
    }

    const integrante = await FichaSocialGrupoFamiliar.findOne({
      where: {
        id: req.params.filaId,
        ficha_social_id: ficha.id
      }
    });

    if (!integrante) {
      return res.status(404).json({ ok: false, msg: 'Integrante del grupo familiar no encontrado' });
    }

    await integrante.destroy();

    return res.json({
      ok: true,
      msg: 'Integrante del grupo familiar eliminado'
    });
  } catch (error) {
    responderError(res, error);
  }
};

export default {
  getFichaSocial,
  putFichaSocial,
  getGrupoFamiliar,
  crearGrupoFamiliar,
  actualizarGrupoFamiliar,
  eliminarGrupoFamiliar
};
