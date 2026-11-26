import sharp from 'sharp';

// Detecta marcas a mano (X, tachones) que Textract no devuelve como texto, midiendo cuanta
// tinta hay dentro de una celda. Se descarta un margen para no contar las lineas de la tabla.
const MARGEN_CELDA = 0.18;
const FACTOR_UMBRAL = 0.55;

export const MINIMO_TINTA = 0.02;

const nivelDeBlanco = (pixeles) => {
  const histograma = new Array(256).fill(0);

  for (const valor of pixeles) {
    histograma[valor] += 1;
  }

  const objetivo = pixeles.length * 0.9;
  let acumulado = 0;

  for (let nivel = 0; nivel < 256; nivel += 1) {
    acumulado += histograma[nivel];

    if (acumulado >= objetivo) {
      return nivel;
    }
  }

  return 255;
};

// `cajas` es un arreglo de { Left, Top, Width, Height } (fracciones de la imagen, como Textract).
// Devuelve para cada caja la fraccion de pixeles oscuros (0 a 1).
export const medirTinta = async (imagen, cajas) => {
  const { data, info } = await sharp(imagen)
    .rotate()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const umbral = nivelDeBlanco(data) * FACTOR_UMBRAL;

  return cajas.map((caja) => {
    if (!caja) {
      return 0;
    }

    const izquierda = Math.round((caja.Left + caja.Width * MARGEN_CELDA) * info.width);
    const derecha = Math.round((caja.Left + caja.Width * (1 - MARGEN_CELDA)) * info.width);
    const arriba = Math.round((caja.Top + caja.Height * MARGEN_CELDA) * info.height);
    const abajo = Math.round((caja.Top + caja.Height * (1 - MARGEN_CELDA)) * info.height);

    let oscuros = 0;
    let total = 0;

    for (let y = Math.max(arriba, 0); y < Math.min(abajo, info.height); y += 1) {
      for (let x = Math.max(izquierda, 0); x < Math.min(derecha, info.width); x += 1) {
        total += 1;

        if (data[y * info.width + x] < umbral) {
          oscuros += 1;
        }
      }
    }

    return total === 0 ? 0 : oscuros / total;
  });
};

// IDA y RETORNO: marcada la que supera el minimo. Si ambas lo hacen, `ida_vuelta` solo cuando
// la menor es al menos la mitad de la mayor; si no, gana la mayor. Sin marca clara, `ida`
// (valor por defecto de la columna) y `clara: false` para avisar.
export const decidirTipoViaje = (tintaIda, tintaRetorno) => {
  const idaMarcada = tintaIda >= MINIMO_TINTA;
  const retornoMarcada = tintaRetorno >= MINIMO_TINTA;

  if (!idaMarcada && !retornoMarcada) {
    return { tipo_viaje: 'ida', clara: false };
  }

  if (idaMarcada && retornoMarcada) {
    const mayor = Math.max(tintaIda, tintaRetorno);
    const menor = Math.min(tintaIda, tintaRetorno);

    if (menor >= mayor * 0.5) {
      return { tipo_viaje: 'ida_vuelta', clara: true };
    }

    return { tipo_viaje: tintaIda > tintaRetorno ? 'ida' : 'vuelta', clara: true };
  }

  return { tipo_viaje: idaMarcada ? 'ida' : 'vuelta', clara: true };
};

export default {
  MINIMO_TINTA,
  medirTinta,
  decidirTipoViaje
};
