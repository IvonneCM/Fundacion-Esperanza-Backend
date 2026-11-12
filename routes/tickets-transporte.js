import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getFilas,
  crearFila,
  actualizarFila,
  eliminarFila
} from '../controllers/tickets-transporte.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarRol } from '../middlewares/validar-rol.js';

const router = Router({ mergeParams: true });

router.use(validarRol('admin', 'archivista'));

const validarDocumento = param('id').isUUID().withMessage('El id del documento debe ser un UUID valido');
const validarFila = param('filaId').isUUID().withMessage('El id de la fila debe ser un UUID valido');

/**
 * @openapi
 * /api/documentos/{id}/tickets:
 *   get:
 *     tags: [Documentos]
 *     summary: Listar filas de tickets de transporte
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
 *         description: Filas de tickets.
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
 *                     $ref: '#/components/schemas/TicketTransporteRegistro'
 *       400:
 *         description: El documento no es de tipo TICKETS.
 *       404:
 *         description: Documento no encontrado.
 *   post:
 *     tags: [Documentos]
 *     summary: Agregar una fila de ticket de transporte
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
 *             $ref: '#/components/schemas/TicketTransporteRegistroCrear'
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
  body('nombre_solicitante').notEmpty().withMessage('El nombre del solicitante es obligatorio'),
  body('fecha_ticket').optional().isISO8601().withMessage('La fecha del ticket no es valida'),
  body('tipo_viaje').optional().isIn(['ida', 'vuelta', 'ida_vuelta']).withMessage('El tipo de viaje no es valido'),
  body('fila_numero').optional().isInt({ min: 1 }).withMessage('El numero de fila debe ser un entero positivo'),
  validarCampos,
  crearFila
);

/**
 * @openapi
 * /api/documentos/{id}/tickets/{filaId}:
 *   patch:
 *     tags: [Documentos]
 *     summary: Editar una fila de ticket de transporte
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
 *             $ref: '#/components/schemas/TicketTransporteRegistroCrear'
 *     responses:
 *       200:
 *         description: Fila actualizada.
 *       400:
 *         description: Datos invalidos o tipo de documento incorrecto.
 *       404:
 *         description: Documento o fila no encontrados.
 *   delete:
 *     tags: [Documentos]
 *     summary: Eliminar una fila de ticket de transporte
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
 *         description: El documento no es de tipo TICKETS.
 *       404:
 *         description: Documento o fila no encontrados.
 */
router.patch(
  '/:filaId',
  validarDocumento,
  validarFila,
  body('nombre_solicitante').optional().notEmpty().withMessage('El nombre del solicitante no puede quedar vacio'),
  body('fecha_ticket').optional().isISO8601().withMessage('La fecha del ticket no es valida'),
  body('tipo_viaje').optional().isIn(['ida', 'vuelta', 'ida_vuelta']).withMessage('El tipo de viaje no es valido'),
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
