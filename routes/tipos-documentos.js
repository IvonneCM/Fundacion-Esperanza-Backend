import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getTipos,
  getTipo,
  crearTipo,
  actualizarTipo,
  eliminarTipo
} from '../controllers/tipos-documentos.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarRol } from '../middlewares/validar-rol.js';

const router = Router();

const validarId = param('id').isUUID().withMessage('El id del tipo debe ser un UUID valido');

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
 *   post:
 *     tags: [Documentos]
 *     summary: Crear un tipo de documento
 *     description: >
 *       Solo administradores y archivistas. El `codigo` es obligatorio, unico y se
 *       normaliza a mayusculas; no se puede editar despues porque define la carpeta
 *       en S3/MinIO de las cargas nuevas.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TipoDocumentoCrear'
 *     responses:
 *       201:
 *         description: Tipo de documento creado.
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
 *                 tipo:
 *                   $ref: '#/components/schemas/TipoDocumento'
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
 *         description: Rol no autorizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Ya existe un tipo con ese codigo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', getTipos);

router.post(
  '/',
  validarRol('admin', 'archivista'),
  body('nombre_tipo')
    .notEmpty()
    .withMessage('El nombre del tipo es obligatorio')
    .isLength({ max: 50 })
    .withMessage('El nombre del tipo no puede superar 50 caracteres'),
  body('codigo')
    .notEmpty()
    .withMessage('El codigo es obligatorio')
    .isLength({ max: 10 })
    .withMessage('El codigo no puede superar 10 caracteres'),
  validarCampos,
  crearTipo
);

/**
 * @openapi
 * /api/documentos/tipos/{id}:
 *   get:
 *     tags: [Documentos]
 *     summary: Obtener un tipo de documento
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
 *         description: Tipo de documento.
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
 *                 tipo:
 *                   $ref: '#/components/schemas/TipoDocumento'
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
 *       404:
 *         description: Tipo de documento no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     tags: [Documentos]
 *     summary: Editar el nombre de un tipo de documento
 *     description: >
 *       Solo administradores y archivistas. Solo actualiza `nombre_tipo`. Si el body
 *       trae un `codigo` distinto al actual responde 400: el codigo no se edita.
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
 *             $ref: '#/components/schemas/TipoDocumentoEditar'
 *     responses:
 *       200:
 *         description: Tipo de documento actualizado.
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
 *                 tipo:
 *                   $ref: '#/components/schemas/TipoDocumento'
 *       400:
 *         description: Datos invalidos o intento de editar el codigo.
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
 *         description: Rol no autorizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tipo de documento no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags: [Documentos]
 *     summary: Eliminar un tipo de documento
 *     description: Solo administradores y archivistas. Responde 409 si el tipo tiene documentos.
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
 *         description: Tipo de documento eliminado.
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
 *         description: Rol no autorizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tipo de documento no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: El tipo tiene documentos y no se puede eliminar.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', validarId, validarCampos, getTipo);

router.put(
  '/:id',
  validarRol('admin', 'archivista'),
  validarId,
  body('nombre_tipo')
    .notEmpty()
    .withMessage('El nombre del tipo es obligatorio')
    .isLength({ max: 50 })
    .withMessage('El nombre del tipo no puede superar 50 caracteres'),
  body('codigo')
    .optional()
    .isLength({ max: 10 })
    .withMessage('El codigo no puede superar 10 caracteres'),
  validarCampos,
  actualizarTipo
);

router.delete(
  '/:id',
  validarRol('admin', 'archivista'),
  validarId,
  validarCampos,
  eliminarTipo
);

export default router;
