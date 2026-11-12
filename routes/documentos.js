import { Router } from 'express';
import { body, param } from 'express-validator';
import { getTipos, crearDocumento, actualizarCodigo } from '../controllers/documentos.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarJWT } from '../middlewares/validar-jwt.js';
import { validarRol } from '../middlewares/validar-rol.js';
import { procesarArchivo } from '../middlewares/procesar-archivo.js';
import fichasSocialesRouter from './fichas-sociales.js';
import referenciasSocialesRouter from './referencias-sociales.js';
import almuerzosRouter from './almuerzos.js';
import salidasEntradasRouter from './salidas-entradas.js';
import ticketsTransporteRouter from './tickets-transporte.js';

const router = Router();

router.use(validarJWT);

/**
 * @openapi
 * /api/documentos/tipos:
 *   get:
 *     tags: [Documentos]
 *     summary: Listar tipos de documento
 *     description: Devuelve el catalogo `tipos_documentos` ordenado por nombre. Disponible para cualquier usuario autenticado.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Catalogo de tipos de documento.
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
 *                 tipos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TipoDocumento'
 *       401:
 *         description: Sin token o token invalido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/tipos', getTipos);

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
