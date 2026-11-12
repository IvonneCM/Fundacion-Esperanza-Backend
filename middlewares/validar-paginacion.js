import { query } from 'express-validator';

export const validarPaginacion = [
  query('pagina')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La pagina debe ser un entero mayor o igual a 1'),
  query('limite')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El limite debe estar entre 1 y 100')
];

export default validarPaginacion;
