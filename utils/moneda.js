// Moneda (design.md 12.3): el USD es la moneda interna, pero la API acepta y devuelve
// bolivianos. Estas funciones convierten con un tipo de cambio dado.

const TIPO_CAMBIO_INICIAL = 6.96;

const redondear = (valor, decimales) => {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
};

// Tipo de cambio para los datos que no traen uno propio (productos, recetas, lotes).
// Se lee de TIPO_CAMBIO_BS_USD; si falta o es invalido se usa el oficial.
export const tipoCambioPorDefecto = () => {
  const valor = Number(process.env.TIPO_CAMBIO_BS_USD);

  return Number.isFinite(valor) && valor > 0 ? valor : TIPO_CAMBIO_INICIAL;
};

export const usdDesdeBs = (bs, tipoCambio) => redondear(Number(bs) / Number(tipoCambio), 4);

export const bsDesdeUsd = (usd, tipoCambio) => redondear(Number(usd) * Number(tipoCambio), 2);

export default {
  tipoCambioPorDefecto,
  usdDesdeBs,
  bsDesdeUsd
};
