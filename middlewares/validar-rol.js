export const validarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    try {
      if (!req.usuario) {
        return res.status(401).json({ ok: false, msg: 'No se identificó al usuario' });
      }

      if (!rolesPermitidos.includes(req.usuario.rol)) {
        return res.status(403).json({ ok: false, msg: 'No tiene permisos para acceder a este recurso' });
      }

      next();
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: 'Error en el servidor', error: error.message });
    }
  };
};
