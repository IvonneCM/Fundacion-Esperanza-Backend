import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  actualizarLote,
  ajustarLote,
  getLotes,
  getLotesPorVencer,
  getLote
} from '../controllers/lotes.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarJWT } from '../middlewares/validar-jwt.js';
import { validarPaginacion } from '../middlewares/validar-paginacion.js';
import { validarRol } from '../middlewares/validar-rol.js';

const router = Router();

router.use(validarJWT, validarRol('admin'));

const validarId = param('id')
  .isUUID()
  .withMessage('El id del lote debe ser un UUID valido');

const validarAjuste = [
  body('cantidad_contada')
    .custom((valor, { req }) => {
      const indicadas = [req.body.cantidad_contada, req.body.cantidad_contada_presentaciones]
        .filter((campo) => campo !== undefined && campo !== null)
        .length;

      if (indicadas !== 1) {
        throw new Error('Indique cantidad_contada o cantidad_contada_presentaciones (solo una)');
      }

      return true;
    }),
  body('cantidad_contada')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 99999999.99 })
    .withMessage('La cantidad contada debe ser un numero mayor o igual a 0')
    .toFloat(),
  body('cantidad_contada_presentaciones')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('La cantidad contada (presentaciones) debe ser un numero mayor o igual a 0')
    .toFloat(),
  body('motivo')
    .trim()
    .notEmpty()
    .withMessage('El motivo del ajuste es obligatorio')
    .isLength({ max: 200 })
    .withMessage('El motivo no puede superar 200 caracteres'),
  body('tipo_cambio_bs_usd')
    .optional({ nullable: true })
    .isFloat({ gt: 0, max: 99999999 })
    .withMessage('El tipo de cambio debe ser un numero mayor a 0')
    .toFloat(),
  body('precio_unitario_usd')
    .optional({ nullable: true })
    .isFloat({ gt: 0, max: 99999999 })
    .withMessage('El precio (USD) debe ser un numero mayor a 0')
    .toFloat()
];

/**
 * @openapi
 * /api/lotes:
 *   get:
 *     tags: [Inventario]
 *     summary: Listar lotes del almacen
 *     description: >
 *       Solo administradores. Lista paginada ordenada por fecha de vencimiento (el que vence
 *       antes primero). Cada lote trae su producto, `vence_el` (fecha local) y la cantidad
 *       tambien en presentaciones. Los lotes agotados se incluyen salvo que se filtre con
 *       `con_stock=true`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: producto_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: con_stock
 *         schema:
 *           type: boolean
 *         description: true = solo con existencias; false = solo agotados.
 *       - in: query
 *         name: vence_antes_de
 *         schema:
 *           type: string
 *           format: date
 *         description: Lotes que vencen hasta esa fecha inclusive (hora de La Paz).
 *       - in: query
 *         name: buscar
 *         schema:
 *           type: string
 *         description: Coincidencia parcial en el nombre del lote.
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Lista de lotes.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 msg:
 *                   type: string
 *                 total:
 *                   type: integer
 *                 pagina:
 *                   type: integer
 *                 limite:
 *                   type: integer
 *                 lotes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LoteInventario'
 *       400:
 *         description: Filtros o paginacion invalidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 *       401:
 *         description: Sin token o token invalido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: El rol del usuario no es admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * /api/lotes/por-vencer:
 *   get:
 *     tags: [Inventario]
 *     summary: Alerta de lotes por vencer
 *     description: >
 *       Solo administradores. Lotes con existencias que vencen dentro de los proximos `dias`
 *       (por defecto 30), mas los que ya vencieron y siguen en el almacen. Ordenados por
 *       vencimiento. `dias_para_vencer` es negativo y `vencido` es true si ya vencio.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dias
 *         schema:
 *           type: integer
 *           default: 30
 *           minimum: 0
 *           maximum: 3650
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Lotes en riesgo de vencimiento.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 msg:
 *                   type: string
 *                 dias:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 pagina:
 *                   type: integer
 *                 limite:
 *                   type: integer
 *                 lotes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LoteAlerta'
 *       400:
 *         description: Parametros invalidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 *       401:
 *         description: Sin token o token invalido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: El rol del usuario no es admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * /api/lotes/{id}:
 *   get:
 *     tags: [Inventario]
 *     summary: Obtener un lote con sus movimientos
 *     description: Solo administradores. Los movimientos son los ingresos y salidas (incluidos los ajustes) que tocaron el lote, del mas reciente al mas antiguo.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lote con su producto y sus movimientos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 msg:
 *                   type: string
 *                 lote:
 *                   $ref: '#/components/schemas/LoteInventario'
 *                 movimientos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MovimientoLote'
 *       400:
 *         description: Id invalido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 *       401:
 *         description: Sin token o token invalido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: El rol del usuario no es admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Lote no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  [
    query('producto_id')
      .optional()
      .isUUID()
      .withMessage('El producto debe ser un UUID valido'),
    query('con_stock')
      .optional()
      .isBoolean()
      .withMessage('con_stock debe ser true o false')
      .toBoolean(),
    query('vence_antes_de')
      .optional()
      .isDate({ format: 'YYYY-MM-DD', strictMode: true })
      .withMessage('vence_antes_de debe tener formato YYYY-MM-DD'),
    query('buscar')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('El termino de busqueda no puede superar los 100 caracteres'),
    ...validarPaginacion
  ],
  validarCampos,
  getLotes
);

router.get(
  '/por-vencer',
  [
    query('dias')
      .optional()
      .isInt({ min: 0, max: 3650 })
      .withMessage('Los dias deben ser un entero entre 0 y 3650'),
    ...validarPaginacion
  ],
  validarCampos,
  getLotesPorVencer
);

router.get('/:id', validarId, validarCampos, getLote);

/**
 * @openapi
 * /api/lotes/{id}/ajuste:
 *   post:
 *     tags: [Inventario]
 *     summary: Ajustar un lote por conteo manual
 *     description: >
 *       Solo administradores. El stock no se edita directo: se indica lo que se conto y la
 *       API registra la diferencia como un movimiento. Si se conto mas que lo que dice el
 *       sistema, crea un ingreso de tipo `ajuste` (sin proveedor); si se conto menos, una
 *       salida de tipo `ajuste`. Se envia la cantidad contada en unidad base
 *       (`cantidad_contada`) o en presentaciones (`cantidad_contada_presentaciones`), solo
 *       una de las dos. Un conteo de 0 deja el lote agotado. Si la diferencia es positiva y
 *       se omite `tipo_cambio_bs_usd`, se toma el del ingreso mas reciente (409 si no hay
 *       ninguno); el precio se toma del body, del lote o del producto, en ese orden.
 *       `cantidad_inicial` del lote no se modifica.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AjusteLoteCrear'
 *     responses:
 *       200:
 *         description: Ajuste registrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 msg:
 *                   type: string
 *                 ajuste:
 *                   $ref: '#/components/schemas/AjusteLoteResultado'
 *       400:
 *         description: Datos invalidos, o el conteo coincide con el stock del sistema.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 *       401:
 *         description: Sin token o token invalido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: El rol del usuario no es admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Lote no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Diferencia positiva sin tipo de cambio disponible.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/ajuste', validarId, validarAjuste, validarCampos, ajustarLote);

/**
 * @openapi
 * /api/lotes/{id}:
 *   patch:
 *     tags: [Inventario]
 *     summary: Corregir la fecha de vencimiento o las notas de un lote
 *     description: >
 *       Solo administradores. Permite corregir `fecha_expiracion` (o dejar el lote sin fecha
 *       enviando `null`) y las `notas`. Nunca modifica cantidades: esas cambian solo por
 *       ingresos, salidas o ajustes por conteo. Los ingresos ya registrados conservan la
 *       fecha que declararon. Hay que enviar al menos un campo.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fecha_expiracion:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: '2027-03-31'
 *               notas:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Lote actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 msg:
 *                   type: string
 *                 lote:
 *                   $ref: '#/components/schemas/LoteInventario'
 *       400:
 *         description: Fecha invalida o no se envio ningun campo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 *       403:
 *         description: El rol del usuario no es admin.
 *       404:
 *         description: Lote no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
  '/:id',
  validarId,
  body('fecha_expiracion')
    .optional({ nullable: true })
    .isDate({ format: 'YYYY-MM-DD', strictMode: true })
    .withMessage('La fecha de vencimiento debe tener formato YYYY-MM-DD'),
  body('notas')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Las notas no pueden superar 255 caracteres'),
  validarCampos,
  actualizarLote
);

export default router;
