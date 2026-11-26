// Comparacion tolerante de textos leidos por OCR (design.md §8.11, Fase 3).

export const normalizarTexto = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

export const distanciaEdicion = (a, b) => {
  if (a === b) {
    return 0;
  }

  let anterior = Array.from({ length: b.length + 1 }, (_, indice) => indice);

  for (let i = 1; i <= a.length; i += 1) {
    const actual = [i];

    for (let j = 1; j <= b.length; j += 1) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;

      actual[j] = Math.min(
        anterior[j] + 1,
        actual[j - 1] + 1,
        anterior[j - 1] + costo
      );
    }

    anterior = actual;
  }

  return anterior[b.length];
};

export const similitud = (a, b) => {
  const largo = Math.max(a.length, b.length);

  if (largo === 0) {
    return 1;
  }

  return 1 - distanciaEdicion(a, b) / largo;
};

// `conocidos` es un Map de texto normalizado -> { valor, frecuencia }.
// Devuelve el conocido mas parecido (desempata por frecuencia) o null si ninguno llega al minimo
// o si hay empate entre dos distintos con la misma similitud y frecuencia.
export const mejorCoincidencia = (texto, conocidos, minimo) => {
  let mejor = null;
  let empate = false;

  for (const [clave, entrada] of conocidos) {
    const valor = similitud(texto, clave);

    if (valor < minimo) {
      continue;
    }

    if (!mejor || valor > mejor.similitud) {
      mejor = { clave, entrada, similitud: valor };
      empate = false;
    } else if (valor === mejor.similitud) {
      if (entrada.frecuencia > mejor.entrada.frecuencia) {
        mejor = { clave, entrada, similitud: valor };
        empate = false;
      } else if (entrada.frecuencia === mejor.entrada.frecuencia) {
        empate = true;
      }
    }
  }

  return empate ? null : mejor;
};

export default {
  normalizarTexto,
  distanciaEdicion,
  similitud,
  mejorCoincidencia
};
