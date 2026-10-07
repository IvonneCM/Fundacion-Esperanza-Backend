import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario.js';
import { firmarToken } from '../utils/token.js';

const MSG_CREDENCIALES = 'Credenciales invalidas';

const perfilPublico = (usuario) => ({
  id: usuario.id,
  nombre: usuario.nombre,
  apellido: usuario.apellido,
  email: usuario.email,
  rol: usuario.rol
});

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await Usuario.scope('conPassword').findOne({
      where: { email: String(email).trim().toLowerCase() }
    });

    if (!usuario) {
      return res.status(401).json({ ok: false, msg: MSG_CREDENCIALES });
    }

    const coincide = await bcrypt.compare(password, usuario.password_hash);

    if (!coincide) {
      return res.status(401).json({ ok: false, msg: MSG_CREDENCIALES });
    }

    if (!usuario.activo) {
      return res.status(403).json({ ok: false, msg: 'El usuario esta desactivado' });
    }

    const token = firmarToken(usuario);

    return res.json({
      ok: true,
      msg: 'Sesion iniciada',
      token,
      usuario: perfilPublico(usuario)
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: 'Error en el servidor',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

export const perfil = async (req, res) => {
  try {
    res.json({
      ok: true,
      msg: 'Perfil del usuario autenticado',
      usuario: perfilPublico(req.usuario)
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: 'Error en el servidor',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

export default { login, perfil };