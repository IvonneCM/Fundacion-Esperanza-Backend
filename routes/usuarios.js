import { Router } from 'express';
import { body, query } from 'express-validator';
import {
  getUsuarios,
  getUsuario,
  crearUsuario,
  actualizarUsuario,
  cambiarEstado
} from '../controllers/usuarios.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarJWT } from '../middlewares/validar-jwt.js';
import { validarRol } from '../middlewares/validar-rol.js';
import { ROLES } from '../models/Usuario.js';

const router = Router();

router.use(validarJWT, validarRol('admin'));

/**
 * @openapi
 * /api/usuarios:
 *   get:
 *     tags: [Usuarios]
 *     summary: Listar usuarios
 *     description: >
 *       Solo administradores. Devuelve la lista paginada de usuarios. Admite filtros
 *       opcionales y combinables: por rol, por estado y una busqueda parcial por nombre,
 *       apellido o email (sin distinguir mayusculas). El campo `total` es la cantidad de
 *       filas que cumplen los filtros, antes de paginar. El orden es siempre
 *       `creado_en DESC`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: rol
 *         schema:
 *           type: string
 *           enum: [admin, archivista, visitante]
 *         description: Filtra por rol.
 *       - in: query
 *         name: activo
 *         schema:
 *           type: boolean
 *         description: Filtra por estado activo/inactivo.
 *       - in: query
 *         name: buscar
 *         schema:
 *           type: string
 *         description: Coincidencia parcial en nombre, apellido o email.
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numero de pagina (desde 1).
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Cantidad de usuarios por pagina.
 *     responses:
 *       200:
 *         description: Lista de usuarios.
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
 *                   description: Total de filas que cumplen los filtros, antes de paginar.
 *                 pagina:
 *                   type: integer
 *                 limite:
 *                   type: integer
 *                 usuarios:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UsuarioAdmin'
 *       400:
 *         description: Filtros o paginacion invalidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 *       401:
 *         description: Sin token, token invalido o expirado.
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
  '/',
  [
    query('rol')
      .optional()
      .isIn(ROLES)
      .withMessage(`El rol debe ser uno de: ${ROLES.join(', ')}`),
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
    query('pagina')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La pagina debe ser un entero mayor o igual a 1')
      .toInt(),
    query('limite')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El limite debe ser un entero entre 1 y 100')
      .toInt()
  ],
  validarCampos,
  getUsuarios
);

/**
 * @openapi
 * /api/usuarios/{id}:
 *   get:
 *     tags: [Usuarios]
 *     summary: Obtener un usuario
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
 *         description: Usuario encontrado.
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
 *                 usuario:
 *                   $ref: '#/components/schemas/UsuarioAdmin'
 *       401:
 *         description: Sin token, token invalido o expirado.
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
 *         description: El id no corresponde a ningun usuario.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getUsuario);

/**
 * @openapi
 * /api/usuarios:
 *   post:
 *     tags: [Usuarios]
 *     summary: Crear un usuario
 *     description: >
 *       Solo administradores. Si no se envia `rol`, se aplica `visitante` (menor
 *       privilegio). La contrasena se guarda con bcrypt (costo 10) y nunca se devuelve.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UsuarioCrear'
 *     responses:
 *       201:
 *         description: Usuario creado.
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
 *                 usuario:
 *                   $ref: '#/components/schemas/UsuarioAdmin'
 *       400:
 *         description: Campos invalidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 *       401:
 *         description: Sin token, token invalido o expirado.
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
 *         description: El email ya esta registrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/',
  [
    body('nombre')
      .trim()
      .notEmpty()
      .withMessage('El nombre es obligatorio')
      .isLength({ max: 100 })
      .withMessage('El nombre no puede superar los 100 caracteres'),
    body('apellido')
      .trim()
      .notEmpty()
      .withMessage('El apellido es obligatorio')
      .isLength({ max: 100 })
      .withMessage('El apellido no puede superar los 100 caracteres'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('El email es obligatorio')
      .bail()
      .isEmail()
      .withMessage('El email no tiene un formato valido')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('La contrasena es obligatoria')
      .isLength({ min: 8 })
      .withMessage('La contrasena debe tener al menos 8 caracteres'),
    body('rol')
      .optional()
      .isIn(ROLES)
      .withMessage(`El rol debe ser uno de: ${ROLES.join(', ')}`)
  ],
  validarCampos,
  crearUsuario
);

/**
 * @openapi
 * /api/usuarios/{id}:
 *   put:
 *     tags: [Usuarios]
 *     summary: Editar un usuario
 *     description: >
 *       Solo administradores. Edita nombre, apellido, email y rol. No acepta `password`:
 *       cambiar la contrasena es un endpoint aparte. Un administrador no puede quitarse
 *       su propio rol. Un email que ya pertenece a otra cuenta responde 409.
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
 *             $ref: '#/components/schemas/UsuarioEditar'
 *     responses:
 *       200:
 *         description: Usuario actualizado.
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
 *                 usuario:
 *                   $ref: '#/components/schemas/UsuarioAdmin'
 *       400:
 *         description: Campos invalidos o intento de quitarse el propio rol.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ErrorValidacion'
 *                 - $ref: '#/components/schemas/Error'
 *       401:
 *         description: Sin token, token invalido o expirado.
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
 *         description: El id no corresponde a ningun usuario.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: El email ya esta registrado por otra cuenta.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/:id',
  [
    body('nombre')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('El nombre no puede estar vacio')
      .isLength({ max: 100 })
      .withMessage('El nombre no puede superar los 100 caracteres'),
    body('apellido')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('El apellido no puede estar vacio')
      .isLength({ max: 100 })
      .withMessage('El apellido no puede superar los 100 caracteres'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('El email no tiene un formato valido')
      .normalizeEmail(),
    body('rol')
      .optional()
      .isIn(ROLES)
      .withMessage(`El rol debe ser uno de: ${ROLES.join(', ')}`)
  ],
  validarCampos,
  actualizarUsuario
);

/**
 * @openapi
 * /api/usuarios/{id}/estado:
 *   patch:
 *     tags: [Usuarios]
 *     summary: Activar o desactivar un usuario
 *     description: >
 *       Solo administradores. No hay borrado fisico: la desactivacion es la unica salida.
 *       Un administrador no puede desactivarse a si mismo ni desactivar al ultimo admin
 *       activo (400). Al desactivar, los tokens ya emitidos dejan de servir porque
 *       `validarJWT` comprueba `activo` en cada request.
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
 *             $ref: '#/components/schemas/UsuarioEstado'
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
 *                 usuario:
 *                   $ref: '#/components/schemas/UsuarioAdmin'
 *       400:
 *         description: Intento de auto-desactivarse o de desactivar al ultimo admin activo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Sin token, token invalido o expirado.
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
 *         description: El id no corresponde a ningun usuario.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
  '/:id/estado',
  [
    body('activo')
      .notEmpty()
      .withMessage('El campo activo es obligatorio')
      .isBoolean()
      .withMessage('El campo activo debe ser true o false')
      .toBoolean()
  ],
  validarCampos,
  cambiarEstado
);

export default router;
