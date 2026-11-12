import { obtenerDocumentoDeTipo } from './documento-tipo.js';
import { responderError } from './responder-error.js';

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

  const crearFila = async (req, res) => {
    try {
      const documento = await verificarDocumento(req, res);

      if (!documento) {
        return;
      }

      const datos = filtrarDatos(req.body);
      let fila_numero = req.body.fila_numero;

      if (fila_numero === undefined) {
        const maximo = await modelo.max('fila_numero', {
          where: { documento_id: documento.id }
        });

        fila_numero = Number.isInteger(maximo) ? maximo + 1 : 1;
      }

      const fila = await modelo.create({
        ...datos,
        fila_numero,
        documento_id: documento.id
      });

      return res.status(201).json({
        ok: true,
        msg: `${nombreRecurso} creado`,
        fila
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

      const fila = await modelo.findOne({
        where: {
          id: req.params.filaId,
          documento_id: documento.id
        }
      });

      if (!fila) {
        return res.status(404).json({ ok: false, msg: `${nombreRecurso} no encontrado` });
      }

      await fila.update(filtrarDatos(req.body));

      return res.json({
        ok: true,
        msg: `${nombreRecurso} actualizado`,
        fila
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

      const fila = await modelo.findOne({
        where: {
          id: req.params.filaId,
          documento_id: documento.id
        }
      });

      if (!fila) {
        return res.status(404).json({ ok: false, msg: `${nombreRecurso} no encontrado` });
      }

      await fila.destroy();

      return res.json({
        ok: true,
        msg: `${nombreRecurso} eliminado`
      });
    } catch (error) {
      responderError(res, error);
    }
  };

  return {
    getFilas,
    crearFila,
    actualizarFila,
    eliminarFila
  };
};

export default crearControladorFilas;
