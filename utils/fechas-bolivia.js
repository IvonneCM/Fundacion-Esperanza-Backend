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

// Instante -> 'YYYY-MM-DD' segun el calendario de La Paz.
export const fechaLocal = (instante) => formatoFecha.format(new Date(instante));

export default {
  inicioDelDia,
  finDelDia,
  fechaLocal
};
