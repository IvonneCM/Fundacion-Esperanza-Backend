import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getSalidas,
  getSalida,
  crearSalida
} from '../controllers/salidas.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarJWT } from '../middlewares/validar-jwt.js';
import { validarPaginacion } from '../middlewares/validar-paginacion.js';
import { validarRol } from '../middlewares/validar-rol.js';
import { TIPOS_SALIDA } from '../models/SalidaAlmacen.js';

const router = Router();

router.use(validarJWT, validarRol('admin'));

const FORMATO_FECHA = { format: 'YYYY-MM-DD', strictMode: true };

const validarId = param('id')
  .isUUID()
  .withMessage('El id de la salida debe ser un UUID valido');

const validarDatosSalida = [
  body('responsable')
    .trim()
    .notEmpty()
    .withMessage('El responsable es obligatorio')
    .isLength({ max: 100 })
    .withMessage('El responsable no puede superar 100 caracteres'),
  body('nro_csa')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 10 })
    .withMessage('El numero CSA no puede superar 10 caracteres'),
  body('area_solicitante')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('El area solicitante no puede superar 20 caracteres'),
  body('programa_poa')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 10 })
    .withMessage('El programa POA no puede superar 10 caracteres'),
  body('fecha')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La fecha debe tener formato ISO 8601')
    .toDate(),
  body('observaciones')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Las observaciones no pueden superar 255 caracteres'),
  body('detalles')
    .isArray({ min: 1, max: 100 })
    .withMessage('La salida debe tener entre 1 y 100 items'),
  body('detalles.*.producto_id')
    .isUUID()
    .withMessage('El producto de cada item debe ser un UUID valido'),
  body('detalles.*.cantidad_base')
    .isFloat({ gt: 0, max: 99999999.99 })
    .withMessage('La cantidad (en unidad base) debe ser un numero mayor a 0')
    .toFloat(),
  body('detalles.*.inventario_almacen_lote_id')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('El lote debe ser un UUID valido')
];

/**
 * @openapi
 * /api/salidas:
 *   get:
 *     tags: [Inventario]
 *     summary: Listar salidas del almacen
 *     description: >
 *       Solo administradores. Lista paginada ordenada por fecha descendente. Incluye las
 *       salidas de consumo y los ajustes por conteo (`tipo_salida`). `items` es la cantidad
 *       de lineas de detalle. Las fechas del filtro se interpretan en hora de La Paz.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tipo_salida
 *         schema:
 *           type: string
 *           enum: [consumo, ajuste]
 *       - in: query
 *         name: buscar
 *         schema:
 *           type: string
 *         description: Coincidencia parcial en responsable o numero CSA.
 *       - in: query
 *         name: fecha_desde
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fecha_hasta
 *         schema:
 *           type: string
 *           format: date
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
 *         description: Lista de salidas.
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
 *                 salidas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SalidaAlmacen'
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
 *   post:
 *     tags: [Inventario]
 *     summary: Registrar una salida de consumo
 *     description: >
 *       Solo administradores. Las salidas normales son consumo para los menus del dia. Todo
 *       ocurre en una sola transaccion: si cualquier item falla, no se descuenta nada.
 *       Las cantidades van en unidad base (la `unidad_medida` del producto, ej. kg). Sin
 *       `inventario_almacen_lote_id` se aplica FEFO: sale primero el lote que vence antes,
 *       sin contar los vencidos, repartiendo entre varios lotes si hace falta. Con lote
 *       indicado se usa ese, siempre que sea del mismo producto, no este vencido y alcance.
 *       Los ajustes por conteo no se crean aqui, sino con `POST /api/lotes/{id}/ajuste`.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SalidaAlmacenCrear'
 *     responses:
 *       201:
 *         description: Salida registrada, con los lotes de los que salio cada cantidad.
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
 *                 salida:
 *                   $ref: '#/components/schemas/SalidaAlmacenDetalle'
 *       400:
 *         description: Datos invalidos, o el lote indicado es de otro producto.
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
 *         description: Un producto o un lote indicado no existe.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Stock insuficiente, o el lote indicado esta vencido. No se descuenta nada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  [
    query('tipo_salida')
      .optional()
      .isIn(TIPOS_SALIDA)
      .withMessage(`El tipo de salida debe ser uno de: ${TIPOS_SALIDA.join(', ')}`),
    query('buscar')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('El termino de busqueda no puede superar los 100 caracteres'),
    query('fecha_desde')
      .optional()
      .isDate(FORMATO_FECHA)
      .withMessage('fecha_desde debe tener formato YYYY-MM-DD'),
    query('fecha_hasta')
      .optional()
      .isDate(FORMATO_FECHA)
      .withMessage('fecha_hasta debe tener formato YYYY-MM-DD'),
    ...validarPaginacion
  ],
  validarCampos,
  getSalidas
);

router.post('/', validarDatosSalida, validarCampos, crearSalida);

/**
 * @openapi
 * /api/salidas/{id}:
 *   get:
 *     tags: [Inventario]
 *     summary: Obtener una salida con sus detalles
 *     description: Solo administradores. Cada detalle indica de que lote salio la cantidad.
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
 *         description: Salida con sus detalles.
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
 *                 salida:
 *                   $ref: '#/components/schemas/SalidaAlmacenDetalle'
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
 *         description: Salida no encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', validarId, validarCampos, getSalida);

export default router;
