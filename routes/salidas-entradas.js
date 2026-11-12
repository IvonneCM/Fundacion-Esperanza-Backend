import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getFilas,
  crearFila,
  actualizarFila,
  eliminarFila
} from '../controllers/salidas-entradas.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarPaginacion } from '../middlewares/validar-paginacion.js';
import { validarRol } from '../middlewares/validar-rol.js';

const router = Router({ mergeParams: true });

router.use(validarRol('admin', 'archivista'));

const validarDocumento = param('id').isUUID().withMessage('El id del documento debe ser un UUID valido');
const validarFila = param('filaId').isUUID().withMessage('El id de la fila debe ser un UUID valido');

/**
 * @openapi
 * /api/documentos/{id}/salidas-entradas:
 *   get:
 *     tags: [Documentos]
 *     summary: Listar filas de salidas y entradas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Filas de salidas y entradas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 msg:
 *                   type: string
 *                 total:
 *                   type: integer
 *                 pagina:
 *                   type: integer
 *                 limite:
 *                   type: integer
 *                 filas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SalidaEntradaRegistro'
 *       400:
 *         description: El documento no es de tipo SALIDAS.
 *       404:
 *         description: Documento no encontrado.
 *   post:
 *     tags: [Documentos]
 *     summary: Agregar una fila de salida/entrada
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
 *             $ref: '#/components/schemas/SalidaEntradaRegistroCrear'
 *     responses:
 *       201:
 *         description: Fila creada.
 *       400:
 *         description: Datos invalidos o tipo de documento incorrecto.
 *       404:
 *         description: Documento no encontrado.
 */
router.get('/', validarDocumento, ...validarPaginacion, validarCampos, getFilas);

router.post(
  '/',
  validarDocumento,
  body('nombre_nino').notEmpty().withMessage('El nombre del nino es obligatorio'),
  body('fecha_ingreso').optional().isISO8601().withMessage('La fecha de ingreso no es valida'),
  body('fecha_salida').optional().isISO8601().withMessage('La fecha de salida no es valida'),
  body('fila_numero').optional().isInt({ min: 1 }).withMessage('El numero de fila debe ser un entero positivo'),
  validarCampos,
  crearFila
);

/**
 * @openapi
 * /api/documentos/{id}/salidas-entradas/{filaId}:
 *   patch:
 *     tags: [Documentos]
 *     summary: Editar una fila de salida/entrada
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
 *             $ref: '#/components/schemas/SalidaEntradaRegistroCrear'
 *     responses:
 *       200:
 *         description: Fila actualizada.
 *       400:
 *         description: Datos invalidos o tipo de documento incorrecto.
 *       404:
 *         description: Documento o fila no encontrados.
 *   delete:
 *     tags: [Documentos]
 *     summary: Eliminar una fila de salida/entrada
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
 *         description: El documento no es de tipo SALIDAS.
 *       404:
 *         description: Documento o fila no encontrados.
 */
router.patch(
  '/:filaId',
  validarDocumento,
  validarFila,
  body('nombre_nino').optional().notEmpty().withMessage('El nombre del nino no puede quedar vacio'),
  body('fecha_ingreso').optional().isISO8601().withMessage('La fecha de ingreso no es valida'),
  body('fecha_salida').optional().isISO8601().withMessage('La fecha de salida no es valida'),
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
