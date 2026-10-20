import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import Usuario from '../models/Usuario.js';
import { usuarioPublico } from '../utils/usuario-publico.js';

const COSTO_BCRYPT = 10;

const normalizarEmail = (email) => String(email).trim().toLowerCase();

const responderError = (res, error) => {
  console.log(error);
  res.status(500).json({
    ok: false,
    msg: 'Error en el servidor',
    error: process.env.NODE_ENV === 'production' ? undefined : error.message
  });
};

export const getUsuarios = async (req, res) => {
  try {
    const { rol, activo, buscar } = req.query;
    const pagina = Number(req.query.pagina ?? 1);
    const limite = Number(req.query.limite ?? 20);

    const where = {};

    if (rol) {
      where.rol = rol;
    }

    if (activo !== undefined) {
      where.activo = activo;
    }

    if (buscar) {
      const termino = `%${buscar}%`;

      where[Op.or] = [
        { nombre: { [Op.iLike]: termino } },
        { apellido: { [Op.iLike]: termino } },
        { email: { [Op.iLike]: termino } }
      ];
    }

    const { rows, count } = await Usuario.findAndCountAll({
      where,
      order: [['creado_en', 'DESC']],
      offset: (pagina - 1) * limite,
      limit: limite
    });

    return res.json({
      ok: true,
      msg: 'Usuarios obtenidos',
      total: count,
      pagina,
      limite,
      usuarios: rows.map(usuarioPublico)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const getUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
    }

    return res.json({
      ok: true,
      msg: 'Usuario obtenido',
      usuario: usuarioPublico(usuario)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const crearUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol } = req.body;
    const emailNormalizado = normalizarEmail(email);

    const existente = await Usuario.findOne({ where: { email: emailNormalizado } });

    if (existente) {
      return res.status(409).json({ ok: false, msg: 'El email ya esta registrado' });
    }

    const password_hash = await bcrypt.hash(password, COSTO_BCRYPT);

    const usuario = await Usuario.create({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: emailNormalizado,
      password_hash,
      rol: rol || 'visitante'
    });

    return res.status(201).json({
      ok: true,
      msg: 'Usuario creado',
      usuario: usuarioPublico(usuario)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, rol } = req.body;

    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
    }

    if (req.usuario.id === usuario.id && rol && rol !== 'admin') {
      return res.status(400).json({ ok: false, msg: 'Un administrador no puede quitarse su propio rol' });
    }

    if (email) {
      const emailNormalizado = normalizarEmail(email);

      if (emailNormalizado !== usuario.email) {
        const existente = await Usuario.findOne({ where: { email: emailNormalizado } });

        if (existente) {
          return res.status(409).json({ ok: false, msg: 'El email ya esta registrado' });
        }

        usuario.email = emailNormalizado;
      }
    }

    if (nombre) {
      usuario.nombre = nombre.trim();
    }

    if (apellido) {
      usuario.apellido = apellido.trim();
    }

    if (rol) {
      usuario.rol = rol;
    }

    await usuario.save();

    return res.json({
      ok: true,
      msg: 'Usuario actualizado',
      usuario: usuarioPublico(usuario)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
    }

    if (req.usuario.id === usuario.id && activo === false) {
      return res.status(400).json({ ok: false, msg: 'Un administrador no puede desactivarse a si mismo' });
    }

    if (activo === false && usuario.rol === 'admin') {
      const adminsActivos = await Usuario.count({ where: { rol: 'admin', activo: true } });

      if (adminsActivos <= 1) {
        return res.status(400).json({ ok: false, msg: 'No se puede desactivar al ultimo admin activo' });
      }
    }

    usuario.activo = activo;
    await usuario.save();

    return res.json({
      ok: true,
      msg: activo ? 'Usuario activado' : 'Usuario desactivado',
      usuario: usuarioPublico(usuario)
    });
  } catch (error) {
    responderError(res, error);
  }
};

export default {
  getUsuarios,
  getUsuario,
  crearUsuario,
  actualizarUsuario,
  cambiarEstado
};
