import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getSalidas,
  getSalida,
  getResponsables,
  crearSalida,
  registrarRecepcion,
  actualizarSalida,
  anularSalida
} from '../controllers/salidas.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarJWT } from '../middlewares/validar-jwt.js';
import { validarPaginacion } from '../middlewares/validar-paginacion.js';
import { validarRol } from '../middlewares/validar-rol.js';
import { TIPOS_SALIDA, ESTADOS_MOVIMIENTO } from '../models/SalidaAlmacen.js';

const router = Router();

router.use(validarJWT, validarRol('admin'));

const FORMATO_FECHA = { format: 'YYYY-MM-DD', strictMode: true };

const validarId = param('id')
  .isUUID()
  .withMessage('El id de la salida debe ser un UUID valido');

const validarCiResponsable = body('ci_responsable')
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 20 })
  .withMessage('El CI del responsable no puede superar 20 caracteres');

const validarMotivoAnulacion = body('motivo')
  .trim()
  .notEmpty()
  .withMessage('El motivo de la anulacion es obligatorio')
  .isLength({ max: 255 })
  .withMessage('El motivo no puede superar 255 caracteres');

const validarDatosSalida = [
  body('responsable')
    .trim()
    .notEmpty()
    .withMessage('El responsable es obligatorio')
    .isLength({ max: 100 })
    .withMessage('El responsable no puede superar 100 caracteres'),
  validarCiResponsable,
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
    .withMessage('El lote debe ser un UUID valido'),
  body('detalles.*.confirmar_vencido')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('confirmar_vencido debe ser verdadero o falso')
    .toBoolean(),
  body('detalles.*.motivo_vencido')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('El motivo no puede superar 255 caracteres'),
  body('detalles').custom((detalles) => {
    if (!Array.isArray(detalles)) {
      return true;
    }

    for (const [indice, item] of detalles.entries()) {
      if (item.confirmar_vencido === true && !item.motivo_vencido) {
        throw new Error(`Item ${indice + 1}: indique motivo_vencido para sacar un lote vencido`);
      }
    }

    return true;
  })
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
 *       sin contar los vencidos, repartiendo entre varios lotes si hace falta; los lotes sin
 *       fecha de vencimiento (SFV) salen al final. Con lote indicado se usa ese, siempre que
 *       sea del mismo producto y alcance. Si esta vencido responde 409 indicando cuantos dias
 *       lleva vencido; se puede sacar enviando `confirmar_vencido: true` y `motivo_vencido`
 *       en ese item, y el detalle de la salida guarda `dias_vencido` y `motivo_vencido`.
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
 *         description: Stock insuficiente, o el lote indicado esta vencido sin confirmar. No se descuenta nada.
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
    query('estado')
      .optional()
      .isIn(ESTADOS_MOVIMIENTO)
      .withMessage(`El estado debe ser uno de: ${ESTADOS_MOVIMIENTO.join(', ')}`),
    query('recibido_conforme')
      .optional()
      .isBoolean()
      .withMessage('recibido_conforme debe ser true o false')
      .toBoolean(),
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
/**
 * @openapi
 * /api/salidas/responsables:
 *   get:
 *     tags: [Inventario]
 *     summary: Sugerencias de responsable (nombre y CI)
 *     description: >
 *       Solo administradores. Nombres y CI distintos de las ultimas salidas de consumo no
 *       anuladas, la mas reciente primero (maximo 20). Sirve para sugerir al escribir el
 *       responsable; no hay un catalogo aparte.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: buscar
 *         schema:
 *           type: string
 *         description: Coincidencia parcial en nombre o CI.
 *     responses:
 *       200:
 *         description: Lista de sugerencias.
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
 *                 responsables:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       responsable:
 *                         type: string
 *                       ci_responsable:
 *                         type: string
 *                         nullable: true
 *                       ultima_fecha:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Termino de busqueda invalido.
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
 */
router.get(
  '/responsables',
  [
    query('buscar')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('El termino de busqueda no puede superar los 100 caracteres')
  ],
  validarCampos,
  getResponsables
);

router.get('/:id', validarId, validarCampos, getSalida);

/**
 * @openapi
 * /api/salidas/{id}:
 *   patch:
 *     tags: [Inventario]
 *     summary: Editar datos de una salida que no afectan el stock
 *     description: >
 *       Solo administradores. Cambia solo los campos enviados (al menos uno): `responsable`,
 *       `ci_responsable`, `area_solicitante`, `programa_poa`, `nro_csa`, `observaciones`. Las
 *       cantidades no se editan: se corrigen anulando la salida. Una salida anulada responde 409.
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
 *               responsable:
 *                 type: string
 *                 maxLength: 100
 *               ci_responsable:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 20
 *               area_solicitante:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 20
 *               programa_poa:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 10
 *               nro_csa:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 10
 *               observaciones:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Salida actualizada.
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
 *         description: Salida no encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: La salida esta anulada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * /api/salidas/{id}/recepcion:
 *   patch:
 *     tags: [Inventario]
 *     summary: Registrar que la cocina recibio la salida
 *     description: >
 *       Solo administradores. Es una constancia: el stock ya se descuento al despachar y esto
 *       no lo mueve. `recibido_conforme` es `true` por defecto; `fecha_recepcion` por defecto es
 *       ahora y se conserva si ya existia. `comprobante_documento_id` (opcional) enlaza la foto
 *       del comprobante firmado subida por Documental; se puede enviar despues. 409 si la salida
 *       es un ajuste o esta anulada; 400 si el documento no existe.
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recibido_conforme:
 *                 type: boolean
 *                 default: true
 *               fecha_recepcion:
 *                 type: string
 *                 format: date-time
 *                 description: No puede ser futura.
 *               comprobante_documento_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Recepcion registrada.
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
 *         description: Datos invalidos o documento inexistente.
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
 *       409:
 *         description: La salida es un ajuste o esta anulada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * /api/salidas/{id}/anular:
 *   post:
 *     tags: [Inventario]
 *     summary: Anular una salida
 *     description: >
 *       Solo administradores. Devuelve las cantidades a sus lotes y deja la salida como traza
 *       (`estado: anulado`, con fecha y motivo). Todo en una transaccion. No se anulan los ajustes
 *       (se corrigen con otro ajuste del lote) ni una salida ya anulada (409).
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
 *         description: Salida anulada.
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
 *         description: Salida no encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Ya anulada, es un ajuste, o la devolucion superaria el maximo de un lote.
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
      const campos = ['responsable', 'ci_responsable', 'area_solicitante', 'programa_poa', 'nro_csa', 'observaciones'];

      if (!campos.some((campo) => cuerpo[campo] !== undefined)) {
        throw new Error(`Envia al menos uno de: ${campos.join(', ')}`);
      }

      return true;
    }),
    body('responsable')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('El responsable no puede quedar vacio')
      .isLength({ max: 100 })
      .withMessage('El responsable no puede superar 100 caracteres'),
    validarCiResponsable,
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
    body('nro_csa')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 10 })
      .withMessage('El numero CSA no puede superar 10 caracteres'),
    body('observaciones')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 255 })
      .withMessage('Las observaciones no pueden superar 255 caracteres')
  ],
  validarCampos,
  actualizarSalida
);

router.patch(
  '/:id/recepcion',
  [
    validarId,
    body('recibido_conforme')
      .optional()
      .isBoolean()
      .withMessage('recibido_conforme debe ser true o false')
      .toBoolean(),
    body('fecha_recepcion')
      .optional()
      .isISO8601()
      .withMessage('La fecha de recepcion debe tener formato ISO 8601')
      .toDate()
      .custom((fecha) => {
        // Tolerancia de 5 minutos por diferencias de reloj entre el cliente y el servidor.
        if (fecha.getTime() > Date.now() + 5 * 60 * 1000) {
          throw new Error('La fecha de recepcion no puede ser futura');
        }

        return true;
      }),
    body('comprobante_documento_id')
      .optional({ nullable: true })
      .isUUID()
      .withMessage('El comprobante debe ser un UUID de documento valido')
  ],
  validarCampos,
  registrarRecepcion
);

router.post('/:id/anular', validarId, validarMotivoAnulacion, validarCampos, anularSalida);

export default router;
