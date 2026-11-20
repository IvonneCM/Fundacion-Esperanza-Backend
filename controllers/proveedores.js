import { Op } from 'sequelize';
import Proveedor from '../models/Proveedor.js';
import { responderError } from '../utils/responder-error.js';

const MENSAJE_NO_ENCONTRADO = 'Proveedor no encontrado';
const MENSAJE_DUPLICADO = 'Ya existe un proveedor con ese CI/NIT';

const normalizarCiNit = (valor) => String(valor).trim();

export const getProveedores = async (req, res) => {
  try {
    const { buscar, activo } = req.query;
    const pagina = Number(req.query.pagina ?? 1);
    const limite = Number(req.query.limite ?? 20);

    const where = {};

    if (activo !== undefined) {
      where.activo = activo === true || activo === 'true';
    }

    if (buscar) {
      const termino = `%${buscar}%`;

      where[Op.or] = [
        { razon_proveedor: { [Op.iLike]: termino } },
        { ci_nit_proveedor: { [Op.iLike]: termino } }
      ];
    }

    const { rows, count } = await Proveedor.findAndCountAll({
      where,
      order: [['razon_proveedor', 'ASC']],
      offset: (pagina - 1) * limite,
      limit: limite
    });

    return res.json({
      ok: true,
      msg: 'Proveedores obtenidos',
      total: count,
      pagina,
      limite,
      proveedores: rows
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const getProveedor = async (req, res) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);

    if (!proveedor) {
      return res.status(404).json({ ok: false, msg: MENSAJE_NO_ENCONTRADO });
    }

    return res.json({
      ok: true,
      msg: 'Proveedor obtenido',
      proveedor
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const crearProveedor = async (req, res) => {
  try {
    const ciNit = normalizarCiNit(req.body.ci_nit_proveedor);

    const existente = await Proveedor.findOne({
      where: { ci_nit_proveedor: ciNit }
    });

    if (existente) {
      return res.status(409).json({ ok: false, msg: MENSAJE_DUPLICADO });
    }

    const proveedor = await Proveedor.create({
      razon_proveedor: req.body.razon_proveedor,
      ci_nit_proveedor: ciNit,
      telefono: req.body.telefono
    });

    return res.status(201).json({
      ok: true,
      msg: 'Proveedor creado',
      proveedor
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const actualizarProveedor = async (req, res) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);

    if (!proveedor) {
      return res.status(404).json({ ok: false, msg: MENSAJE_NO_ENCONTRADO });
    }

    const ciNit = normalizarCiNit(req.body.ci_nit_proveedor);

    if (ciNit !== proveedor.ci_nit_proveedor) {
      const existente = await Proveedor.findOne({
        where: { ci_nit_proveedor: ciNit }
      });

      if (existente) {
        return res.status(409).json({ ok: false, msg: MENSAJE_DUPLICADO });
      }
    }

    proveedor.razon_proveedor = req.body.razon_proveedor;
    proveedor.ci_nit_proveedor = ciNit;
    proveedor.telefono = req.body.telefono;
    await proveedor.save();

    return res.json({
      ok: true,
      msg: 'Proveedor actualizado',
      proveedor
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const cambiarEstadoProveedor = async (req, res) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);

    if (!proveedor) {
      return res.status(404).json({ ok: false, msg: MENSAJE_NO_ENCONTRADO });
    }

    proveedor.activo = req.body.activo;
    await proveedor.save();

    return res.json({
      ok: true,
      msg: proveedor.activo ? 'Proveedor activado' : 'Proveedor desactivado',
      proveedor
    });
  } catch (error) {
    responderError(res, error);
  }
};

export default {
  getProveedores,
  getProveedor,
  crearProveedor,
  actualizarProveedor,
  cambiarEstadoProveedor
};
