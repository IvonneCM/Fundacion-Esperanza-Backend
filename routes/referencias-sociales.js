import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getReferenciaSocial,
  putReferenciaSocial
} from '../controllers/referencias-sociales.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarRol } from '../middlewares/validar-rol.js';

const router = Router({ mergeParams: true });

router.use(validarRol('admin', 'archivista'));

const validarDocumento = param('id').isUUID().withMessage('El id del documento debe ser un UUID valido');

/**
 * @openapi
 * /api/documentos/{id}/referencia-social:
 *   get:
 *     tags: [Documentos]
 *     summary: Obtener la referencia social
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
 *         description: Referencia social.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 msg:
 *                   type: string
 *                 referencia:
 *                   $ref: '#/components/schemas/ReferenciaSocialDatos'
 *       400:
 *         description: El documento no es de tipo REFERENCIA.
 *       404:
 *         description: Documento o referencia social no encontrados.
 *   put:
 *     tags: [Documentos]
 *     summary: Crear o actualizar la referencia social
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
 *             $ref: '#/components/schemas/ReferenciaSocialDatosCrear'
 *     responses:
 *       200:
 *         description: Referencia actualizada.
 *       201:
 *         description: Referencia creada.
 *       400:
 *         description: Datos invalidos o tipo de documento incorrecto.
 *       404:
 *         description: Documento no encontrado.
 */
router.get('/', validarDocumento, validarCampos, getReferenciaSocial);

router.put(
  '/',
  validarDocumento,
  body('fecha').optional().isISO8601().withMessage('La fecha no es valida'),
  validarCampos,
  putReferenciaSocial
);

export default router;
