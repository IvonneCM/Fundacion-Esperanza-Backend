const METODOS_DE_LECTURA = ['GET', 'HEAD'];

// Como validarRol, pero solo exige el rol en las peticiones que escriben: las lecturas
// (GET, HEAD) las puede hacer cualquier usuario autenticado.
export const validarRolEscritura = (...rolesPermitidos) => {
  const validar = validarRol(...rolesPermitidos);

  return (req, res, next) => {
    if (METODOS_DE_LECTURA.includes(req.method)) {
      return next();
    }

    return validar(req, res, next);
  };
};

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
