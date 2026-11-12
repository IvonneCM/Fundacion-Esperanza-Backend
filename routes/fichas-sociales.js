import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getFichaSocial,
  putFichaSocial,
  getGrupoFamiliar,
  crearGrupoFamiliar,
  actualizarGrupoFamiliar,
  eliminarGrupoFamiliar
} from '../controllers/fichas-sociales.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarRol } from '../middlewares/validar-rol.js';

const router = Router({ mergeParams: true });

router.use(validarRol('admin', 'archivista'));

const validarDocumento = param('id').isUUID().withMessage('El id del documento debe ser un UUID valido');
const validarFila = param('filaId').isUUID().withMessage('El id de la fila debe ser un UUID valido');

/**
 * @openapi
 * /api/documentos/{id}/ficha-social:
 *   get:
 *     tags: [Documentos]
 *     summary: Obtener la ficha social y su grupo familiar
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
 *         description: Ficha social.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 msg:
 *                   type: string
 *                 ficha:
 *                   $ref: '#/components/schemas/FichaSocialDatos'
 *                 grupo_familiar:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FichaSocialGrupoFamiliar'
 *       400:
 *         description: El documento no es de tipo FICHA.
 *       404:
 *         description: Documento o ficha social no encontrados.
 *   put:
 *     tags: [Documentos]
 *     summary: Crear o actualizar la ficha social
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
 *             $ref: '#/components/schemas/FichaSocialDatosCrear'
 *     responses:
 *       200:
 *         description: Ficha actualizada.
 *       201:
 *         description: Ficha creada.
 *       400:
 *         description: Datos invalidos o tipo de documento incorrecto.
 *       404:
 *         description: Documento no encontrado.
 */
router.get('/', validarDocumento, validarCampos, getFichaSocial);

router.put(
  '/',
  validarDocumento,
  body('fecha_nacimiento').optional().isISO8601().withMessage('La fecha de nacimiento no es valida'),
  body('fecha_diagnostico').optional().isISO8601().withMessage('La fecha de diagnostico no es valida'),
  body('edad_entrada').optional().isInt({ min: 0 }).withMessage('La edad de entrada debe ser un entero positivo'),
  validarCampos,
  putFichaSocial
);

/**
 * @openapi
 * /api/documentos/{id}/ficha-social/grupo-familiar:
 *   get:
 *     tags: [Documentos]
 *     summary: Listar el grupo familiar
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
 *         description: Grupo familiar.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 msg:
 *                   type: string
 *                 grupo_familiar:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FichaSocialGrupoFamiliar'
 *       400:
 *         description: El documento no es de tipo FICHA.
 *       404:
 *         description: Documento o ficha social no encontrados.
 *   post:
 *     tags: [Documentos]
 *     summary: Agregar un integrante al grupo familiar
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
 *             $ref: '#/components/schemas/FichaSocialGrupoFamiliarCrear'
 *     responses:
 *       201:
 *         description: Integrante creado.
 *       400:
 *         description: Datos invalidos o tipo de documento incorrecto.
 *       404:
 *         description: Documento o ficha social no encontrados.
 */
router.get('/grupo-familiar', validarDocumento, validarCampos, getGrupoFamiliar);

router.post(
  '/grupo-familiar',
  validarDocumento,
  body('nombre_apellido').notEmpty().withMessage('El nombre y apellido es obligatorio'),
  body('edad').optional().isInt({ min: 0 }).withMessage('La edad debe ser un entero positivo'),
  validarCampos,
  crearGrupoFamiliar
);

/**
 * @openapi
 * /api/documentos/{id}/ficha-social/grupo-familiar/{filaId}:
 *   patch:
 *     tags: [Documentos]
 *     summary: Editar un integrante del grupo familiar
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
 *             $ref: '#/components/schemas/FichaSocialGrupoFamiliarCrear'
 *     responses:
 *       200:
 *         description: Integrante actualizado.
 *       400:
 *         description: Datos invalidos o tipo de documento incorrecto.
 *       404:
 *         description: Documento, ficha o integrante no encontrados.
 *   delete:
 *     tags: [Documentos]
 *     summary: Eliminar un integrante del grupo familiar
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
 *         description: Integrante eliminado.
 *       400:
 *         description: El documento no es de tipo FICHA.
 *       404:
 *         description: Documento, ficha o integrante no encontrados.
 */
router.patch(
  '/grupo-familiar/:filaId',
  validarDocumento,
  validarFila,
  body('nombre_apellido').optional().notEmpty().withMessage('El nombre y apellido no puede quedar vacio'),
  body('edad').optional().isInt({ min: 0 }).withMessage('La edad debe ser un entero positivo'),
  validarCampos,
  actualizarGrupoFamiliar
);

router.delete(
  '/grupo-familiar/:filaId',
  validarDocumento,
  validarFila,
  validarCampos,
  eliminarGrupoFamiliar
);

export default router;
