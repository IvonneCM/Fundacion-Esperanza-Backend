import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getProveedores,
  getProveedor,
  crearProveedor,
  actualizarProveedor,
  cambiarEstadoProveedor
} from '../controllers/proveedores.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarJWT } from '../middlewares/validar-jwt.js';
import { validarPaginacion } from '../middlewares/validar-paginacion.js';
import { validarRol } from '../middlewares/validar-rol.js';

const router = Router();

router.use(validarJWT, validarRol('admin'));

const validarId = param('id')
  .isUUID()
  .withMessage('El id del proveedor debe ser un UUID valido');

const validarDatosProveedor = [
  body('razon_proveedor')
    .trim()
    .notEmpty()
    .withMessage('La razon social es obligatoria')
    .isLength({ max: 150 })
    .withMessage('La razon social no puede superar 150 caracteres'),
  body('ci_nit_proveedor')
    .trim()
    .notEmpty()
    .withMessage('El CI/NIT es obligatorio')
    .isLength({ max: 20 })
    .withMessage('El CI/NIT no puede superar 20 caracteres'),
  body('telefono')
    .trim()
    .notEmpty()
    .withMessage('El telefono es obligatorio')
    .isLength({ max: 20 })
    .withMessage('El telefono no puede superar 20 caracteres')
];

/**
 * @openapi
 * /api/proveedores:
 *   get:
 *     tags: [Inventario]
 *     summary: Listar proveedores
 *     description: >
 *       Solo administradores. Lista paginada ordenada por razon social. Admite filtro por
 *       estado y busqueda parcial (sin distinguir mayusculas) en razon social o CI/NIT.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: activo
 *         schema:
 *           type: boolean
 *         description: Filtra por proveedores activos o inactivos.
 *       - in: query
 *         name: buscar
 *         schema:
 *           type: string
 *         description: Coincidencia parcial en razon social o CI/NIT.
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
 *         description: Lista de proveedores.
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
 *                 proveedores:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Proveedor'
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
 *     summary: Registrar un proveedor
 *     description: Solo administradores. El CI/NIT es unico. El proveedor se crea activo.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProveedorCrear'
 *     responses:
 *       201:
 *         description: Proveedor creado.
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
 *                 proveedor:
 *                   $ref: '#/components/schemas/Proveedor'
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
 *       409:
 *         description: Ya existe un proveedor con ese CI/NIT.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  [
    query('activo')
      .optional()
      .isBoolean()
      .withMessage('El campo activo debe ser true o false')
      .toBoolean(),
    query('buscar')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('El termino de busqueda no puede superar los 100 caracteres'),
    ...validarPaginacion
  ],
  validarCampos,
  getProveedores
);

router.post('/', validarDatosProveedor, validarCampos, crearProveedor);

/**
 * @openapi
 * /api/proveedores/{id}:
 *   get:
 *     tags: [Inventario]
 *     summary: Obtener un proveedor
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
 *         description: Proveedor.
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
 *                 proveedor:
 *                   $ref: '#/components/schemas/Proveedor'
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
 *         description: Proveedor no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     tags: [Inventario]
 *     summary: Editar un proveedor
 *     description: Solo administradores. Reemplaza razon social, CI/NIT y telefono. No cambia el estado (usar PATCH /estado).
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
 *             $ref: '#/components/schemas/ProveedorCrear'
 *     responses:
 *       200:
 *         description: Proveedor actualizado.
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
 *                 proveedor:
 *                   $ref: '#/components/schemas/Proveedor'
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
 *         description: Proveedor no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: El CI/NIT ya pertenece a otro proveedor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * /api/proveedores/{id}/estado:
 *   patch:
 *     tags: [Inventario]
 *     summary: Activar o desactivar un proveedor
 *     description: >
 *       Solo administradores. No hay borrado fisico porque el proveedor puede estar
 *       referenciado por ingresos.
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
 *             $ref: '#/components/schemas/ProveedorEstado'
 *     responses:
 *       200:
 *         description: Estado actualizado.
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
 *                 proveedor:
 *                   $ref: '#/components/schemas/Proveedor'
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
 *         description: Proveedor no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', validarId, validarCampos, getProveedor);

router.put('/:id', validarId, validarDatosProveedor, validarCampos, actualizarProveedor);

router.patch(
  '/:id/estado',
  validarId,
  body('activo')
    .isBoolean()
    .withMessage('El campo activo debe ser true o false')
    .toBoolean(),
  validarCampos,
  cambiarEstadoProveedor
);

export default router;
