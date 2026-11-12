import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { getDocumentos, crearDocumento, actualizarCodigo } from '../controllers/documentos.js';
import { ESTADOS_OCR, ESTADOS_VALIDACION } from '../models/Documento.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarJWT } from '../middlewares/validar-jwt.js';
import { validarPaginacion } from '../middlewares/validar-paginacion.js';
import { validarRol } from '../middlewares/validar-rol.js';
import { procesarArchivo } from '../middlewares/procesar-archivo.js';
import tiposDocumentosRouter from './tipos-documentos.js';
import fichasSocialesRouter from './fichas-sociales.js';
import referenciasSocialesRouter from './referencias-sociales.js';
import almuerzosRouter from './almuerzos.js';
import salidasEntradasRouter from './salidas-entradas.js';
import ticketsTransporteRouter from './tickets-transporte.js';

const router = Router();

router.use(validarJWT);
router.use('/tipos', tiposDocumentosRouter);

/**
 * @openapi
 * /api/documentos:
 *   get:
 *     tags: [Documentos]
 *     summary: Listar, buscar y paginar documentos
 *     description: >
 *       Disponible para todos los roles. `visitante` solo ve documentos con
 *       `estado_validacion='validado'` (el servidor fuerza el filtro). `q` busca
 *       en `codigo` y `texto_ocr`. Orden: `fecha_registro` descendente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Texto a buscar en codigo y texto OCR.
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *         description: Codigo del tipo de documento (por ejemplo FICHA).
 *       - in: query
 *         name: tipos_documentos_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: codigo
 *         schema:
 *           type: string
 *         description: Coincidencia parcial del codigo del documento.
 *       - in: query
 *         name: estado_ocr
 *         schema:
 *           type: string
 *           enum: [pendiente, procesado, error]
 *       - in: query
 *         name: estado_validacion
 *         schema:
 *           type: string
 *           enum: [pendiente, validado, rechazado]
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
 *         description: Incluye el dia completo.
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Documentos paginados.
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
 *                 documentos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DocumentoListado'
 *       400:
 *         description: Query invalida.
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
 */
router.get(
  '/',
  query('q')
    .optional()
    .isString()
    .withMessage('La busqueda debe ser texto')
    .isLength({ max: 200 })
    .withMessage('La busqueda no puede superar 200 caracteres'),
  query('tipo')
    .optional()
    .isString()
    .withMessage('El tipo debe ser un codigo')
    .isLength({ max: 10 })
    .withMessage('El codigo del tipo no puede superar 10 caracteres'),
  query('tipos_documentos_id')
    .optional()
    .isUUID()
    .withMessage('El tipo de documento debe ser un UUID valido'),
  query('codigo')
    .optional()
    .isString()
    .withMessage('El codigo debe ser texto')
    .isLength({ max: 30 })
    .withMessage('El codigo no puede superar 30 caracteres'),
  query('estado_ocr')
    .optional()
    .isIn(ESTADOS_OCR)
    .withMessage(`El estado OCR debe ser uno de: ${ESTADOS_OCR.join(', ')}`),
  query('estado_validacion')
    .optional()
    .isIn(ESTADOS_VALIDACION)
    .withMessage(`El estado de validacion debe ser uno de: ${ESTADOS_VALIDACION.join(', ')}`),
  query('fecha_desde')
    .optional()
    .isISO8601()
    .withMessage('La fecha desde no es valida'),
  query('fecha_hasta')
    .optional()
    .isISO8601()
    .withMessage('La fecha hasta no es valida'),
  ...validarPaginacion,
  validarCampos,
  getDocumentos
);

/**
 * @openapi
 * /api/documentos:
 *   post:
 *     tags: [Documentos]
 *     summary: Subir un documento digitalizado
 *     description: >
 *       Solo administradores y archivistas. Recibe el archivo por multipart/form-data,
 *       lo sube a S3/MinIO y crea la fila en `documentos` con `estado_ocr` y
 *       `estado_validacion` en `pendiente`. Si no se envia `codigo`, se genera como
 *       `{CODIGO_TIPO}-{YYYYMMDD}-{HHMMSS}`. La clave en S3 es
 *       `documentos/{codigoTipo}/{codigo}.{ext}`.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [archivo, tipos_documentos_id]
 *             properties:
 *               archivo:
 *                 type: string
 *                 format: binary
 *                 description: Archivo jpg, jpeg, png o pdf. Maximo 25 MB.
 *               tipos_documentos_id:
 *                 type: string
 *                 format: uuid
 *                 description: Id del tipo de documento.
 *               codigo:
 *                 type: string
 *                 maxLength: 30
 *                 description: >
 *                   Opcional. Si no se envia (o se envia vacio) se genera
 *                   `{CODIGO_TIPO}-{YYYYMMDD}-{HHMMSS}`. En Swagger UI, borra
 *                   el valor de ejemplo "string" antes de enviar.
 *     responses:
 *       201:
 *         description: Documento cargado.
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
 *                 documento:
 *                   $ref: '#/components/schemas/Documento'
 *       400:
 *         description: Archivo o campos invalidos, o archivo mayor a 25 MB.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Sin token o token invalido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Rol no autorizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: El tipo de documento no existe.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/',
  validarRol('admin', 'archivista'),
  procesarArchivo,
  body('tipos_documentos_id').isUUID().withMessage('El tipo de documento debe ser un UUID valido'),
  body('codigo').optional().isLength({ max: 30 }).withMessage('El codigo no puede superar 30 caracteres'),
  validarCampos,
  crearDocumento
);

/**
 * @openapi
 * /api/documentos/{id}/codigo:
 *   patch:
 *     tags: [Documentos]
 *     summary: Editar el codigo de un documento
 *     description: >
 *       Cambia solo `documentos.codigo`. No renombra el objeto en S3/MinIO:
 *       `ruta_archivo` queda igual.
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
 *             required: [codigo]
 *             properties:
 *               codigo:
 *                 type: string
 *                 maxLength: 30
 *     responses:
 *       200:
 *         description: Codigo actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 msg:
 *                   type: string
 *                 documento:
 *                   $ref: '#/components/schemas/Documento'
 *       400:
 *         description: Codigo invalido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Rol no autorizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Documento no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
  '/:id/codigo',
  validarRol('admin', 'archivista'),
  param('id').isUUID().withMessage('El id del documento debe ser un UUID valido'),
  body('codigo').notEmpty().withMessage('El codigo es obligatorio').isLength({ max: 30 }).withMessage('El codigo no puede superar 30 caracteres'),
  validarCampos,
  actualizarCodigo
);

router.use('/:id/ficha-social', fichasSocialesRouter);
router.use('/:id/referencia-social', referenciasSocialesRouter);
router.use('/:id/almuerzos', almuerzosRouter);
router.use('/:id/salidas-entradas', salidasEntradasRouter);
router.use('/:id/tickets', ticketsTransporteRouter);

export default router;
