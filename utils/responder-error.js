const ERRORES_DE_VALIDACION = [
  'SequelizeValidationError',
  'SequelizeUniqueConstraintError'
];

export const responderError = (res, error) => {
  if (ERRORES_DE_VALIDACION.includes(error.name)) {
    return res.status(400).json({
      ok: false,
      msg: 'Los datos enviados no son validos',
      errores: error.errors.map((detalle) => ({
        campo: detalle.path,
        mensaje: detalle.message
      }))
    });
  }

  console.log(error);

  res.status(500).json({
    ok: false,
    msg: 'Error en el servidor',
    error: process.env.NODE_ENV === 'production' ? undefined : error.message
  });
};

export default responderError;
