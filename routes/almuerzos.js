import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getFilas,
  crearFila,
  actualizarFila,
  eliminarFila
} from '../controllers/almuerzos.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarRol } from '../middlewares/validar-rol.js';

const router = Router({ mergeParams: true });

router.use(validarRol('admin', 'archivista'));

const validarDocumento = param('id').isUUID().withMessage('El id del documento debe ser un UUID valido');
const validarFila = param('filaId').isUUID().withMessage('El id de la fila debe ser un UUID valido');

/**
 * @openapi
 * /api/documentos/{id}/almuerzos:
 *   get:
 *     tags: [Documentos]
 *     summary: Listar filas de almuerzo
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
 *         description: Filas de almuerzo.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 msg:
 *                   type: string
 *                 filas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AlmuerzoRegistro'
 *       400:
 *         description: El documento no es de tipo ALMUERZOS.
 *       404:
 *         description: Documento no encontrado.
 *   post:
 *     tags: [Documentos]
 *     summary: Agregar una fila de almuerzo
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
 *             $ref: '#/components/schemas/AlmuerzoRegistroCrear'
 *     responses:
 *       201:
 *         description: Fila creada.
 *       400:
 *         description: Datos invalidos o tipo de documento incorrecto.
 *       404:
 *         description: Documento no encontrado.
 */
router.get('/', validarDocumento, validarCampos, getFilas);

router.post(
  '/',
  validarDocumento,
  body('nombres_paciente').notEmpty().withMessage('El nombre del paciente es obligatorio'),
  body('fecha_almuerzo').optional().isISO8601().withMessage('La fecha del almuerzo no es valida'),
  body('cantidad_almuerzos').optional().isInt({ min: 1 }).withMessage('La cantidad debe ser un entero mayor o igual a 1'),
  body('fila_numero').optional().isInt({ min: 1 }).withMessage('El numero de fila debe ser un entero positivo'),
  validarCampos,
  crearFila
);

/**
 * @openapi
 * /api/documentos/{id}/almuerzos/{filaId}:
 *   patch:
 *     tags: [Documentos]
 *     summary: Editar una fila de almuerzo
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: filaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlmuerzoRegistroCrear'
 *     responses:
 *       200:
 *         description: Fila actualizada.
 *       400:
 *         description: Datos invalidos o tipo de documento incorrecto.
 *       404:
 *         description: Documento o fila no encontrados.
 *   delete:
 *     tags: [Documentos]
 *     summary: Eliminar una fila de almuerzo
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: filaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Fila eliminada.
 *       400:
 *         description: El documento no es de tipo ALMUERZOS.
 *       404:
 *         description: Documento o fila no encontrados.
 */
router.patch(
  '/:filaId',
  validarDocumento,
  validarFila,
  body('nombres_paciente').optional().notEmpty().withMessage('El nombre del paciente no puede quedar vacio'),
  body('fecha_almuerzo').optional().isISO8601().withMessage('La fecha del almuerzo no es valida'),
  body('cantidad_almuerzos').optional().isInt({ min: 1 }).withMessage('La cantidad debe ser un entero mayor o igual a 1'),
  validarCampos,
  actualizarFila
);

router.delete(
  '/:filaId',
  validarDocumento,
  validarFila,
  validarCampos,
  eliminarFila
);

export default router;
