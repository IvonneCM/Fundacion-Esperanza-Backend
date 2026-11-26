import {
  sequelize,
  Documento,
  TipoDocumento,
  TicketTransporteRegistro
} from '../models/index.js';
import { descargarArchivo } from '../services/s3.js';
import { analizarDocumento } from '../services/textract.js';
import { medirTinta, decidirTipoViaje } from '../utils/detectar-marcas.js';
import { normalizarTexto } from '../utils/similitud-texto.js';
import {
  encontrarTablaTickets,
  extraerFilasTickets,
  parsearFecha,
  construirVocabulario,
  corregirNombre,
  corregirRuta,
  indicesFechasFueraDeOrden
} from '../utils/ocr-tickets.js';
import { ErrorNegocio } from '../utils/error-negocio.js';
import { recalcularDocumento } from '../utils/validacion-documentos.js';
import { responderError } from '../utils/responder-error.js';

const EXTENSIONES_SOPORTADAS = ['jpg', 'jpeg', 'png'];

// Dos filas son la misma si comparten nro_ticket; sin nro_ticket, si coinciden nombre y fecha.
const claveDeFila = (fila) => {
  if (fila.nro_ticket) {
    return `T:${normalizarTexto(fila.nro_ticket)}`;
  }

  return `N:${normalizarTexto(fila.nombre_solicitante)}|${fila.fecha_ticket ?? ''}`;
};

const construirFilas = async (bytes, tabla, vocabulario) => {
  const crudas = extraerFilasTickets(tabla);

  const cajas = [];

  for (const fila of crudas) {
    cajas.push(fila.caja_ida);
    cajas.push(fila.caja_retorno);
  }

  const tintas = await medirTinta(bytes, cajas);

  const fechas = crudas.map((fila) => parsearFecha(fila.fecha_leida));
  const fueraDeOrden = indicesFechasFueraDeOrden(fechas);

  const conteoTickets = new Map();

  for (const fila of crudas) {
    if (fila.nro_ticket) {
      conteoTickets.set(fila.nro_ticket, (conteoTickets.get(fila.nro_ticket) || 0) + 1);
    }
  }

  return crudas.map((fila, indice) => {
    const nombre = corregirNombre(fila.nombre_leido, vocabulario);
    const ruta = corregirRuta(fila.ruta_leida, vocabulario);
    const viaje = decidirTipoViaje(tintas[indice * 2], tintas[indice * 2 + 1]);
    const advertencias = [];

    if (!nombre.valor) {
      advertencias.push('Nombre no legible');
    }

    if (nombre.corregido) {
      advertencias.push(`Nombre corregido con los ya validados (leido: ${fila.nombre_leido})`);
    }

    if (ruta.corregido) {
      advertencias.push(`Ruta corregida con las ya validadas (leida: ${fila.ruta_leida})`);
    }

    if (!fechas[indice]) {
      advertencias.push(`Fecha no legible (leida: ${fila.fecha_leida || 'vacia'})`);
    } else if (fueraDeOrden.has(indice)) {
      advertencias.push(`Fecha fuera de orden (${fechas[indice]})`);
    }

    if (!fila.nro_ticket) {
      advertencias.push('Numero de ticket no legible');
    } else if (conteoTickets.get(fila.nro_ticket) > 1) {
      advertencias.push('Numero de ticket repetido en la hoja');
    }

    if (!viaje.clara) {
      advertencias.push('Sin marca en IDA ni RETORNO; se dejo ida');
    }

    return {
      fila_numero: indice + 1,
      fecha_ticket: fechas[indice],
      nombre_solicitante: nombre.valor,
      nro_ticket: fila.nro_ticket,
      ruta: ruta.valor,
      tipo_viaje: viaje.tipo_viaje,
      advertencias
    };
  });
};

// POST /api/documentos/:id/ocr (design.md §8.11, Fase 3). Solo TICKETS por ahora.
export const ejecutarOcr = async (req, res) => {
  try {
    const documento = await Documento.findByPk(req.params.id);

    if (!documento) {
      return res.status(404).json({ ok: false, msg: 'Documento no encontrado' });
    }

    const tipo = await TipoDocumento.findByPk(documento.tipos_documentos_id);

    if (!tipo || tipo.codigo !== 'TICKETS') {
      return res.status(400).json({
        ok: false,
        msg: 'El OCR solo esta disponible para documentos de tipo TICKETS'
      });
    }

    const extension = String(documento.ruta_archivo).split('.').pop().toLowerCase();

    if (!EXTENSIONES_SOPORTADAS.includes(extension)) {
      return res.status(400).json({
        ok: false,
        msg: 'El OCR solo acepta imagenes jpg o png por ahora'
      });
    }

    let analisis;
    let filas;

    try {
      const bytes = await descargarArchivo(documento.ruta_archivo);
      analisis = await analizarDocumento(bytes);

      const encontrada = encontrarTablaTickets(analisis.tablas);

      if (!encontrada) {
        throw new ErrorNegocio(422, 'No se reconocio la tabla de tickets en la imagen');
      }

      const validadas = await TicketTransporteRegistro.findAll({
        where: { estado_fila_validacion: 'validado' },
        attributes: ['nombre_solicitante', 'ruta'],
        raw: true
      });

      filas = await construirFilas(bytes, encontrada, construirVocabulario(validadas));
    } catch (error) {
      await documento.update({ estado_ocr: 'error' });

      if (error.name === 'ErrorNegocio') {
        throw error;
      }

      console.log(error);

      throw new ErrorNegocio(502, 'No se pudo procesar el documento con Textract');
    }

    const resultado = await sequelize.transaction(async (transaccion) => {
      const existentes = await TicketTransporteRegistro.findAll({
        where: { documento_id: documento.id },
        attributes: ['fila_numero', 'nro_ticket', 'nombre_solicitante', 'fecha_ticket'],
        raw: true,
        transaction: transaccion
      });

      const clavesExistentes = new Set(existentes.map(claveDeFila));
      const base = existentes.reduce((maximo, fila) => Math.max(maximo, fila.fila_numero || 0), 0);

      const nuevas = filas.filter((fila) => !clavesExistentes.has(claveDeFila(fila)));

      if (nuevas.length > 0) {
        await TicketTransporteRegistro.bulkCreate(
          nuevas.map((fila) => ({
            documento_id: documento.id,
            fila_numero: base + fila.fila_numero,
            fecha_ticket: fila.fecha_ticket,
            nombre_solicitante: fila.nombre_solicitante,
            nro_ticket: fila.nro_ticket,
            ruta: fila.ruta,
            tipo_viaje: fila.tipo_viaje,
            estado_fila_validacion: 'pendiente'
          })),
          { transaction: transaccion }
        );
      }

      await documento.update(
        {
          texto_ocr: analisis.texto,
          estado_ocr: 'procesado'
        },
        { transaction: transaccion }
      );

      // texto_ocr_tsv no esta en el modelo (§8.9): se llena con SQL crudo.
      await sequelize.query(
        "UPDATE documentos SET texto_ocr_tsv = to_tsvector('spanish', :texto) WHERE id = :id",
        {
          replacements: { texto: analisis.texto, id: documento.id },
          transaction: transaccion
        }
      );

      await recalcularDocumento(documento, TicketTransporteRegistro, req.usuario, transaccion);

      return { nuevas, omitidas: filas.length - nuevas.length };
    });

    res.json({
      ok: true,
      msg: 'OCR procesado. Las filas nuevas quedaron pendientes de validacion',
      documento: {
        id: documento.id,
        estado_ocr: documento.estado_ocr,
        estado_validacion: documento.estado_validacion
      },
      extraidas: filas.length,
      agregadas: resultado.nuevas.length,
      omitidas: resultado.omitidas,
      filas: filas.map((fila) => ({
        fila_numero: fila.fila_numero,
        nro_ticket: fila.nro_ticket,
        advertencias: fila.advertencias,
        agregada: resultado.nuevas.includes(fila)
      }))
    });
  } catch (error) {
    responderError(res, error);
  }
};

export default { ejecutarOcr };
