// Bolivia no usa horario de verano: America/La_Paz es siempre UTC-4.
// Los vencimientos se guardan como medianoche de La Paz y se comparan por fecha local.
const ZONA = 'America/La_Paz';
const DESFASE = '-04:00';

const formatoFecha = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

// 'YYYY-MM-DD' -> instante de la medianoche en La Paz.
export const inicioDelDia = (fecha) => new Date(`${fecha}T00:00:00.000${DESFASE}`);

// 'YYYY-MM-DD' -> ultimo instante de ese dia en La Paz.
export const finDelDia = (fecha) => new Date(`${fecha}T23:59:59.999${DESFASE}`);

// Instante -> 'YYYY-MM-DD' segun el calendario de La Paz. Sin instante (lote sin fecha de
// vencimiento) devuelve null.
export const fechaLocal = (instante) => {
  if (instante === null || instante === undefined) {
    return null;
  }

  return formatoFecha.format(new Date(instante));
};

// 'YYYY-MM-DD' + n dias -> 'YYYY-MM-DD' (calendario puro, sin zonas horarias).
export const sumarDias = (fecha, dias) => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
};

// Dias de calendario desde `desde` hasta `hasta` (negativo si `hasta` es anterior).
export const diasEntre = (desde, hasta) => {
  const aMilisegundos = (fecha) => {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return Date.UTC(anio, mes - 1, dia);
  };

  return Math.round((aMilisegundos(hasta) - aMilisegundos(desde)) / 86400000);
};

export default {
  inicioDelDia,
  finDelDia,
  fechaLocal,
  sumarDias,
  diasEntre
};
