import { sequelize } from '../config/database.js';
import { obtenerDocumentoDeTipo } from './documento-tipo.js';
import { responderError } from './responder-error.js';
import { documentoConEstado, recalcularDocumento } from './validacion-documentos.js';

export const crearControladorFilas = ({
  modelo,
  codigoTipo,
  camposPermitidos,
  nombreRecurso
}) => {
  const filtrarDatos = (body) => {
    const datos = {};

    for (const campo of camposPermitidos) {
      if (body[campo] !== undefined) {
        datos[campo] = body[campo];
      }
    }

    return datos;
  };

  const verificarDocumento = async (req, res) => {
    const resultado = await obtenerDocumentoDeTipo(req.params.id, codigoTipo);

    if (resultado.estado === 'no_encontrado') {
      res.status(404).json({ ok: false, msg: 'Documento no encontrado' });
      return null;
    }

    if (resultado.estado === 'tipo_incorrecto') {
      res.status(400).json({ ok: false, msg: `El documento no es de tipo ${codigoTipo}` });
      return null;
    }

    return resultado.documento;
  };

  const buscarFila = (documento, filaId, transaccion) => {
    return modelo.findOne({
      where: {
        id: filaId,
        documento_id: documento.id
      },
      transaction: transaccion
    });
  };

  const getFilas = async (req, res) => {
    try {
      const documento = await verificarDocumento(req, res);

      if (!documento) {
        return;
      }

      const pagina = Number(req.query.pagina) || 1;
      const limite = Number(req.query.limite) || 20;
      const { count, rows } = await modelo.findAndCountAll({
        where: { documento_id: documento.id },
        order: [['fila_numero', 'ASC']],
        limit: limite,
        offset: (pagina - 1) * limite
      });

      return res.json({
        ok: true,
        msg: `${nombreRecurso} obtenidos`,
        total: count,
        pagina,
        limite,
        filas: rows
      });
    } catch (error) {
      responderError(res, error);
    }
  };

  // Una fila escrita a mano queda validada y el documento se recalcula (design.md §10.1).
  const crearFila = async (req, res) => {
    try {
      const documento = await verificarDocumento(req, res);

      if (!documento) {
        return;
      }

      const datos = filtrarDatos(req.body);

      const fila = await sequelize.transaction(async (transaccion) => {
        let fila_numero = req.body.fila_numero;

        if (fila_numero === undefined) {
          const maximo = await modelo.max('fila_numero', {
            where: { documento_id: documento.id },
            transaction: transaccion
          });

          fila_numero = Number.isInteger(maximo) ? maximo + 1 : 1;
        }

        const nueva = await modelo.create(
          {
            ...datos,
            fila_numero,
            documento_id: documento.id,
            estado_fila_validacion: 'validado'
          },
          { transaction: transaccion }
        );

        await recalcularDocumento(documento, modelo, req.usuario, transaccion);

        return nueva;
      });

      return res.status(201).json({
        ok: true,
        msg: `${nombreRecurso} creado`,
        fila,
        documento: documentoConEstado(documento)
      });
    } catch (error) {
      responderError(res, error);
    }
  };

  const actualizarFila = async (req, res) => {
    try {
      const documento = await verificarDocumento(req, res);

      if (!documento) {
        return;
      }

      const fila = await sequelize.transaction(async (transaccion) => {
        const existente = await buscarFila(documento, req.params.filaId, transaccion);

        if (!existente) {
          return null;
        }

        await existente.update(
          {
            ...filtrarDatos(req.body),
            estado_fila_validacion: 'validado'
          },
          { transaction: transaccion }
        );

        await recalcularDocumento(documento, modelo, req.usuario, transaccion);

        return existente;
      });

      if (!fila) {
        return res.status(404).json({ ok: false, msg: `${nombreRecurso} no encontrado` });
      }

      return res.json({
        ok: true,
        msg: `${nombreRecurso} actualizado`,
        fila,
        documento: documentoConEstado(documento)
      });
    } catch (error) {
      responderError(res, error);
    }
  };

  const eliminarFila = async (req, res) => {
    try {
      const documento = await verificarDocumento(req, res);

      if (!documento) {
        return;
      }

      const eliminada = await sequelize.transaction(async (transaccion) => {
        const existente = await buscarFila(documento, req.params.filaId, transaccion);

        if (!existente) {
          return false;
        }

        await existente.destroy({ transaction: transaccion });
        await recalcularDocumento(documento, modelo, req.usuario, transaccion);

        return true;
      });

      if (!eliminada) {
        return res.status(404).json({ ok: false, msg: `${nombreRecurso} no encontrado` });
      }

      return res.json({
        ok: true,
        msg: `${nombreRecurso} eliminado`,
        documento: documentoConEstado(documento)
      });
    } catch (error) {
      responderError(res, error);
    }
  };

  // RF-08: aprobar, rechazar o volver a pendiente una fila. El documento se recalcula.
  const cambiarEstadoFila = async (req, res) => {
    try {
      const documento = await verificarDocumento(req, res);

      if (!documento) {
        return;
      }

      const fila = await sequelize.transaction(async (transaccion) => {
        const existente = await buscarFila(documento, req.params.filaId, transaccion);

        if (!existente) {
          return null;
        }

        await existente.update(
          { estado_fila_validacion: req.body.estado },
          { transaction: transaccion }
        );

        await recalcularDocumento(documento, modelo, req.usuario, transaccion);

        return existente;
      });

      if (!fila) {
        return res.status(404).json({ ok: false, msg: `${nombreRecurso} no encontrado` });
      }

      return res.json({
        ok: true,
        msg: `Estado de validacion de ${nombreRecurso.toLowerCase()} actualizado`,
        fila,
        documento: documentoConEstado(documento)
      });
    } catch (error) {
      responderError(res, error);
    }
  };

  return {
    getFilas,
    crearFila,
    actualizarFila,
    eliminarFila,
    cambiarEstadoFila
  };
};

export default crearControladorFilas;
