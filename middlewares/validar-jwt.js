import Usuario from '../models/Usuario.js';
import { verificarToken } from '../utils/token.js';

const MSG_NO_AUTENTICADO = 'No se identificó al usuario';

export const validarJWT = async (req, res, next) => {
  try {
    const encabezado = req.headers.authorization || '';
    const [esquema, token] = encabezado.split(' ');

    if (esquema !== 'Bearer' || !token) {
      return res.status(401).json({ ok: false, msg: MSG_NO_AUTENTICADO });
    }

    let payload;

    try {
      payload = verificarToken(token);
    } catch (error) {
      console.log(`Token rechazado: ${error.message}`);
      return res.status(401).json({ ok: false, msg: MSG_NO_AUTENTICADO });
    }

    const usuario = await Usuario.findByPk(payload.uid);

    if (!usuario) {
      return res.status(401).json({ ok: false, msg: MSG_NO_AUTENTICADO });
    }

    if (!usuario.activo) {
      return res.status(403).json({ ok: false, msg: 'El usuario esta desactivado' });
    }

    req.usuario = usuario;

    next();
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: 'Error en el servidor', error: error.message });
  }
};

export default validarJWT;