import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getIngresos,
  getIngreso,
  crearIngreso,
  actualizarIngreso,
  anularIngreso
} from '../controllers/ingresos.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarJWT } from '../middlewares/validar-jwt.js';
import { validarPaginacion } from '../middlewares/validar-paginacion.js';
import { validarRol } from '../middlewares/validar-rol.js';
import { TIPOS_INGRESO, MONEDAS_COMPRA } from '../models/IngresoAlmacen.js';

const router = Router();

router.use(validarJWT, validarRol('admin'));

const FORMATO_FECHA = { format: 'YYYY-MM-DD', strictMode: true };

const validarId = param('id')
  .isUUID()
  .withMessage('El id del ingreso debe ser un UUID valido');

const validarDatosIngreso = [
  body('tipo_ingreso')
    .isIn(TIPOS_INGRESO)
    .withMessage(`El tipo de ingreso debe ser uno de: ${TIPOS_INGRESO.join(', ')}`),
  body('proveedor_id')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('El proveedor debe ser un UUID valido'),
  body('fecha')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La fecha debe tener formato ISO 8601')
    .toDate(),
  body('tipo_cambio_bs_usd')
    .optional({ nullable: true })
    .isFloat({ gt: 0, max: 99999999 })
    .withMessage('El tipo de cambio debe ser un numero mayor a 0')
    .toFloat(),
  body('moneda_compra')
    .optional({ nullable: true })
    .isIn(MONEDAS_COMPRA)
    .withMessage(`La moneda debe ser una de: ${MONEDAS_COMPRA.join(', ')}`),
  body('monto_total_bs')
    .optional({ nullable: true })
    .isFloat({ gt: 0, max: 999999999999 })
    .withMessage('El monto total (Bs) debe ser un numero mayor a 0')
    .toFloat(),
  body('nro_cia')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 2147483647 })
    .withMessage('El numero de formulario CIA debe ser un entero')
    .toInt(),
  body('nro_documento_respaldo')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 30 })
    .withMessage('El documento de respaldo no puede superar 30 caracteres'),
  body('motivo')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('El motivo no puede superar 200 caracteres'),
  body('observaciones')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Las observaciones no pueden superar 255 caracteres'),
  body('detalles')
    .isArray({ min: 1, max: 100 })
    .withMessage('El ingreso debe tener entre 1 y 100 items'),
  body('detalles.*.producto_id')
    .isUUID()
    .withMessage('El producto de cada item debe ser un UUID valido'),
  body('detalles.*.cantidad_presentaciones')
    .isFloat({ gt: 0, max: 1000000 })
    .withMessage('La cantidad de presentaciones debe ser un numero mayor a 0')
    .toFloat(),
  body('detalles.*.precio_unitario_usd')
    .optional({ nullable: true })
    .isFloat({ gt: 0, max: 99999999 })
    .withMessage('El precio (USD) debe ser un numero mayor a 0')
    .toFloat(),
  body('detalles.*.precio_unitario_bs')
    .optional({ nullable: true })
    .isFloat({ gt: 0, max: 99999999 })
    .withMessage('El precio (Bs) debe ser un numero mayor a 0')
    .toFloat(),
  body('detalles.*.fecha_expiracion')
    .optional({ nullable: true })
    .isDate(FORMATO_FECHA)
    .withMessage('La fecha de vencimiento debe tener formato YYYY-MM-DD'),
  body('detalles.*.inventario_almacen_lote_id')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('El lote debe ser un UUID valido'),
  body('detalles.*.notas')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Las notas no pueden superar 255 caracteres')
];

/**
 * @openapi
 * /api/ingresos:
 *   get:
 *     tags: [Inventario]
 *     summary: Listar ingresos al almacen
 *     description: >
 *       Solo administradores. Lista paginada ordenada por fecha descendente. Cada ingreso
 *       trae su proveedor (si tiene) y `items`, la cantidad de lineas de detalle.
 *       Las fechas del filtro se interpretan en hora de La Paz.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tipo_ingreso
 *         schema:
 *           type: string
 *           enum: [compra, donacion, traspaso, ajuste]
 *       - in: query
 *         name: proveedor_id
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Lista de ingresos.
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
 *                 ingresos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IngresoAlmacen'
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
 *     summary: Registrar un ingreso al almacen
 *     description: >
 *       Solo administradores. Todo ocurre en una sola transaccion: si cualquier item falla,
 *       no se guarda nada. Por cada item se crea un lote nuevo (por defecto) o se suma a un
 *       lote existente si se indica `inventario_almacen_lote_id`; en ese caso el lote debe
 *       ser del mismo producto y tener la misma fecha de vencimiento (o ambos sin fecha), solo sube
 *       `cantidad_actual` y `cantidad_inicial` no se toca. Las cantidades se envian en
 *       presentaciones y se guardan en unidad base (presentaciones x contenido neto del
 *       producto). El precio es por presentacion; si se omite se usa el del lote o el de
 *       referencia del producto. Un ingreso de tipo `compra` requiere proveedor; el resto
 *       lo admite pero no lo exige (conteos, ajustes y donaciones). El conteo inicial se
 *       carga como ingreso de tipo `ajuste`.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IngresoAlmacenCrear'
 *     responses:
 *       201:
 *         description: Ingreso registrado, con sus detalles y lotes.
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
 *                 ingreso:
 *                   $ref: '#/components/schemas/IngresoAlmacenDetalle'
 *       400:
 *         description: >
 *           Datos invalidos, compra sin proveedor, lote de otro producto o con otra fecha
 *           de vencimiento, o cantidad fuera de rango.
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
 *         description: El proveedor, un producto o un lote indicado no existe.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: El proveedor esta desactivado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  [
    query('tipo_ingreso')
      .optional()
      .isIn(TIPOS_INGRESO)
      .withMessage(`El tipo de ingreso debe ser uno de: ${TIPOS_INGRESO.join(', ')}`),
    query('proveedor_id')
      .optional()
      .isUUID()
      .withMessage('El proveedor debe ser un UUID valido'),
    query('estado')
      .optional()
      .isIn(['activo', 'anulado'])
      .withMessage('El estado debe ser activo o anulado'),
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
  getIngresos
);

router.post('/', validarDatosIngreso, validarCampos, crearIngreso);

/**
 * @openapi
 * /api/ingresos/{id}:
 *   get:
 *     tags: [Inventario]
 *     summary: Obtener un ingreso con sus detalles
 *     description: Solo administradores. Cada detalle trae el producto, el lote y las cantidades en unidad base y en presentaciones.
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
 *         description: Ingreso con sus detalles.
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
 *                 ingreso:
 *                   $ref: '#/components/schemas/IngresoAlmacenDetalle'
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
 *         description: Ingreso no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', validarId, validarCampos, getIngreso);

/**
 * @openapi
 * /api/ingresos/{id}:
 *   patch:
 *     tags: [Inventario]
 *     summary: Editar datos de un ingreso que no afectan el stock
 *     description: >
 *       Solo administradores. Cambia solo los campos enviados (al menos uno): `proveedor_id`
 *       (un ingreso de compra no puede quedar sin proveedor), `nro_documento_respaldo`,
 *       `nro_cia`, `motivo`, `observaciones`. Las cantidades y precios no se editan: se corrigen
 *       anulando el ingreso. Un ingreso anulado responde 409.
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
 *               proveedor_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               nro_documento_respaldo:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 30
 *               nro_cia:
 *                 type: integer
 *                 nullable: true
 *               motivo:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 200
 *               observaciones:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Ingreso actualizado.
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
 *                 ingreso:
 *                   $ref: '#/components/schemas/IngresoAlmacenDetalle'
 *       400:
 *         description: Datos invalidos.
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
 *         description: Ingreso o proveedor no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Ingreso anulado o proveedor desactivado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * /api/ingresos/{id}/anular:
 *   post:
 *     tags: [Inventario]
 *     summary: Anular un ingreso
 *     description: >
 *       Solo administradores. Descuenta de cada lote lo que este ingreso puso y deja el ingreso
 *       como traza (`estado: anulado`, con fecha y motivo). **Solo se permite si ese stock sigue
 *       en el lote**: si parte ya se uso, responde 409 con los lotes afectados y no cambia nada
 *       (hay que anular antes las salidas que lo consumieron). No se anulan los ajustes (se
 *       corrigen con otro ajuste del lote). Todo en una transaccion.
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
 *             required: [motivo]
 *             properties:
 *               motivo:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Ingreso anulado.
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
 *                 ingreso:
 *                   $ref: '#/components/schemas/IngresoAlmacenDetalle'
 *       400:
 *         description: Falta el motivo o el id es invalido.
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
 *         description: Ingreso no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Ya anulado, es un ajuste, o parte de lo ingresado ya se uso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
  '/:id',
  [
    validarId,
    body().custom((cuerpo) => {
      const campos = ['proveedor_id', 'nro_documento_respaldo', 'nro_cia', 'motivo', 'observaciones'];

      if (!campos.some((campo) => cuerpo[campo] !== undefined)) {
        throw new Error(`Envia al menos uno de: ${campos.join(', ')}`);
      }

      return true;
    }),
    body('proveedor_id')
      .optional({ nullable: true })
      .isUUID()
      .withMessage('El proveedor debe ser un UUID valido'),
    body('nro_cia')
      .optional({ nullable: true })
      .isInt({ min: 1, max: 2147483647 })
      .withMessage('El numero CIA debe ser un entero mayor a 0')
      .toInt(),
    body('nro_documento_respaldo')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 30 })
      .withMessage('El documento de respaldo no puede superar 30 caracteres'),
    body('motivo')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 200 })
      .withMessage('El motivo no puede superar 200 caracteres'),
    body('observaciones')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 255 })
      .withMessage('Las observaciones no pueden superar 255 caracteres')
  ],
  validarCampos,
  actualizarIngreso
);

router.post(
  '/:id/anular',
  [
    validarId,
    body('motivo')
      .trim()
      .notEmpty()
      .withMessage('El motivo de la anulacion es obligatorio')
      .isLength({ max: 255 })
      .withMessage('El motivo no puede superar 255 caracteres')
  ],
  validarCampos,
  anularIngreso
);

export default router;
