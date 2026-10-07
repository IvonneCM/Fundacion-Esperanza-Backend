import { validationResult } from 'express-validator';

export const validarCampos = (req, res, next) => {
  try {
    const errores = validationResult(req);

    if (errores.isEmpty()) {
      return next();
    }

    const detalles = errores.array().map((error) => ({
      campo: error.path ?? error.param,
      mensaje: error.msg
    }));

    return res.status(400).json({
      ok: false,
      msg: 'Los datos enviados no son validos',
      errores: detalles
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: 'Error en el servidor', error: error.message });
  }
};

export default validarCampos;