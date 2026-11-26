import { mejorCoincidencia, normalizarTexto } from './similitud-texto.js';

// Interpretacion de la hoja "Control recepcion de tickets transporte solidario"
// (design.md §8.11, Fase 3). Son funciones puras: no tocan red, base ni disco.

const MINIMO_LARGO_PALABRA = 4;
const SIMILITUD_PALABRA = 0.75;
const SIMILITUD_RUTA = 0.8;

const COLUMNAS = [
  { campo: 'nombre', patron: /SOLICITANTE|NOMBRE/ },
  { campo: 'fecha', patron: /FECHA/ },
  { campo: 'ticket', patron: /TICKET/ },
  { campo: 'ruta', patron: /RUTA/ },
  { campo: 'ida', patron: /^IDA$/ },
  { campo: 'retorno', patron: /RETORNO|VUELTA/ }
];

const OBLIGATORIAS = ['nombre', 'fecha', 'ticket', 'ida', 'retorno'];

const limpiar = (texto) => String(texto ?? '').replace(/\s+/g, ' ').trim();
const mayusculas = (texto) => limpiar(texto).toUpperCase();

const mapearEncabezado = (fila) => {
  const columnas = {};

  fila.forEach((celda, indice) => {
    const texto = normalizarTexto(celda?.texto);

    for (const { campo, patron } of COLUMNAS) {
      if (columnas[campo] === undefined && patron.test(texto)) {
        columnas[campo] = indice;
        break;
      }
    }
  });

  return columnas;
};

// Elige la tabla que tenga una fila de encabezados con todas las columnas obligatorias.
export const encontrarTablaTickets = (tablas) => {
  let elegida = null;

  for (const tabla of tablas) {
    for (let indiceFila = 0; indiceFila < Math.min(tabla.length, 3); indiceFila += 1) {
      const columnas = mapearEncabezado(tabla[indiceFila]);
      const completa = OBLIGATORIAS.every((campo) => columnas[campo] !== undefined);

      if (completa && (!elegida || tabla.length > elegida.tabla.length)) {
        elegida = { tabla, indiceEncabezado: indiceFila, columnas };
      }
    }
  }

  return elegida;
};

// dd/mm/aa o dd/mm/aaaa (el OCR a veces cambia los separadores). Devuelve 'YYYY-MM-DD' o null.
export const parsearFecha = (texto) => {
  const coincidencia = String(texto ?? '').match(/(\d{1,2})\D+(\d{1,2})\D+(\d{2,4})/);

  if (!coincidencia) {
    return null;
  }

  const dia = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  let anio = Number(coincidencia[3]);

  if (anio < 100) {
    anio += 2000;
  }

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return null;
  }

  return fecha.toISOString().slice(0, 10);
};

// Devuelve las filas de datos de la hoja, con las cajas de IDA y RETORNO para medir tinta.
export const extraerFilasTickets = ({ tabla, indiceEncabezado, columnas }) => {
  const filas = [];

  for (let indice = indiceEncabezado + 1; indice < tabla.length; indice += 1) {
    const celdas = tabla[indice];
    const texto = (campo) => limpiar(celdas[columnas[campo]]?.texto);

    const nombre = texto('nombre');
    const fecha = texto('fecha');
    const ticket = texto('ticket');
    const ruta = columnas.ruta === undefined ? '' : texto('ruta');

    // Fila sin nombre, fecha ni ticket: separador o pie de la hoja.
    if (!nombre && !fecha && !ticket) {
      continue;
    }

    filas.push({
      nombre_leido: nombre,
      fecha_leida: fecha,
      nro_ticket: ticket || null,
      ruta_leida: ruta,
      caja_ida: celdas[columnas.ida]?.caja,
      caja_retorno: celdas[columnas.retorno]?.caja
    });
  }

  return filas;
};

// Vocabulario de lo ya validado: palabras de nombres y rutas completas, con su frecuencia.
export const construirVocabulario = (filasValidadas) => {
  const palabras = new Map();
  const rutas = new Map();

  // La clave es el texto normalizado (para comparar); el valor conserva tildes y Ñ.
  const sumar = (mapa, clave, valor) => {
    const actual = mapa.get(clave);

    if (actual) {
      actual.frecuencia += 1;
    } else {
      mapa.set(clave, { valor, frecuencia: 1 });
    }
  };

  for (const fila of filasValidadas) {
    for (const palabra of mayusculas(fila.nombre_solicitante).split(' ')) {
      if (palabra.length >= MINIMO_LARGO_PALABRA) {
        sumar(palabras, normalizarTexto(palabra), palabra);
      }
    }

    const ruta = mayusculas(fila.ruta);

    if (ruta) {
      sumar(rutas, normalizarTexto(ruta), ruta);
    }
  }

  return { palabras, rutas };
};

// Corrige cada palabra desconocida con la palabra conocida mas parecida. Una palabra que ya
// esta en el vocabulario no se toca (asi MARIO y MARIA no se confunden entre si).
export const corregirNombre = (texto, vocabulario) => {
  const original = mayusculas(texto);

  if (!original) {
    return { valor: null, corregido: false };
  }

  let corregido = false;

  const palabras = original.split(' ').map((palabra) => {
    const clave = normalizarTexto(palabra);

    if (palabra.length < MINIMO_LARGO_PALABRA || vocabulario.palabras.has(clave)) {
      return palabra;
    }

    const coincidencia = mejorCoincidencia(clave, vocabulario.palabras, SIMILITUD_PALABRA);

    if (!coincidencia) {
      return palabra;
    }

    corregido = true;

    return coincidencia.entrada.valor;
  });

  return { valor: palabras.join(' '), corregido };
};

export const corregirRuta = (texto, vocabulario) => {
  const original = mayusculas(texto);

  if (!original) {
    return { valor: null, corregido: false };
  }

  const clave = normalizarTexto(original);

  if (vocabulario.rutas.has(clave)) {
    return { valor: vocabulario.rutas.get(clave).valor, corregido: false };
  }

  const coincidencia = mejorCoincidencia(clave, vocabulario.rutas, SIMILITUD_RUTA);

  if (!coincidencia) {
    return { valor: original, corregido: false };
  }

  return { valor: coincidencia.entrada.valor, corregido: true };
};

// Indices de las filas cuya fecha rompe el orden cronologico de la hoja. Se conserva la
// subsecuencia no decreciente mas larga; las demas (y las fechas ilegibles) quedan marcadas.
export const indicesFechasFueraDeOrden = (fechas) => {
  const validas = [];

  fechas.forEach((fecha, indice) => {
    if (fecha) {
      validas.push({ fecha, indice });
    }
  });

  const longitud = new Array(validas.length).fill(1);
  const previo = new Array(validas.length).fill(-1);

  for (let i = 0; i < validas.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      if (validas[j].fecha <= validas[i].fecha && longitud[j] + 1 > longitud[i]) {
        longitud[i] = longitud[j] + 1;
        previo[i] = j;
      }
    }
  }

  let fin = 0;

  for (let i = 1; i < validas.length; i += 1) {
    if (longitud[i] > longitud[fin]) {
      fin = i;
    }
  }

  const enOrden = new Set();

  for (let i = validas.length ? fin : -1; i >= 0; i = previo[i]) {
    enOrden.add(validas[i].indice);
  }

  const fuera = new Set();

  fechas.forEach((fecha, indice) => {
    if (fecha && !enOrden.has(indice)) {
      fuera.add(indice);
    }
  });

  return fuera;
};

export default {
  encontrarTablaTickets,
  parsearFecha,
  extraerFilasTickets,
  construirVocabulario,
  corregirNombre,
  corregirRuta,
  indicesFechasFueraDeOrden
};
