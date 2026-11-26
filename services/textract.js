import { AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import { textract } from '../config/aws.js';

const construirIndice = (bloques) => {
  const indice = new Map();

  for (const bloque of bloques) {
    indice.set(bloque.Id, bloque);
  }

  return indice;
};

const hijos = (bloque) => {
  const relaciones = bloque.Relationships || [];
  const ids = [];

  for (const relacion of relaciones) {
    if (relacion.Type === 'CHILD') {
      ids.push(...relacion.Ids);
    }
  }

  return ids;
};

const textoDeCelda = (celda, indice) => {
  const palabras = [];

  for (const id of hijos(celda)) {
    const hijo = indice.get(id);

    if (hijo && hijo.BlockType === 'WORD') {
      palabras.push(hijo.Text);
    }
  }

  return palabras.join(' ');
};

// Devuelve cada tabla como una matriz de filas; cada celda es { texto, confianza }.
const extraerTablas = (bloques, indice) => {
  const tablas = [];

  for (const bloque of bloques) {
    if (bloque.BlockType !== 'TABLE') {
      continue;
    }

    const filas = [];

    for (const id of hijos(bloque)) {
      const celda = indice.get(id);

      if (!celda || celda.BlockType !== 'CELL') {
        continue;
      }

      const fila = celda.RowIndex - 1;
      const columna = celda.ColumnIndex - 1;

      if (!filas[fila]) {
        filas[fila] = [];
      }

      filas[fila][columna] = {
        texto: textoDeCelda(celda, indice),
        confianza: celda.Confidence,
        // Posicion de la celda como fraccion (0 a 1) del ancho y alto de la imagen.
        caja: celda.Geometry?.BoundingBox
      };
    }

    tablas.push(filas.filter(Boolean));
  }

  return tablas;
};

export const analizarDocumento = async (bytes) => {
  const respuesta = await textract.send(
    new AnalyzeDocumentCommand({
      Document: { Bytes: bytes },
      FeatureTypes: ['TABLES']
    })
  );

  const bloques = respuesta.Blocks || [];
  const indice = construirIndice(bloques);

  const lineas = bloques
    .filter((bloque) => bloque.BlockType === 'LINE')
    .map((bloque) => bloque.Text);

  return {
    texto: lineas.join('\n'),
    tablas: extraerTablas(bloques, indice)
  };
};
