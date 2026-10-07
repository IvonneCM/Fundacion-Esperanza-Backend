import { Router } from 'express';
import { body } from 'express-validator';
import { login, perfil } from '../controllers/auth.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarJWT } from '../middlewares/validar-jwt.js';

const router = Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesion
 *     description: >
 *       Valida las credenciales y devuelve un token JWT con datos basicos del usuario.
 *       El mismo mensaje se devuelve tanto si el email no existe como si la contrasena
 *       es incorrecta, para no revelar que cuentas estan registradas. La respuesta 403
 *       solo aparece despues de confirmar que la contrasena es correcta.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: anita@fundacion.org
 *               password:
 *                 type: string
 *                 format: password
 *                 description: >
 *                   En Postman, definir una variable de entorno llamada PASSWORD y dejar
 *                   este campo como {{PASSWORD}}. La contrasena no se escribe aqui.
 *                 example: "{{PASSWORD}}"
 *     responses:
 *       200:
 *         description: Credenciales correctas. Devuelve el token y el usuario.
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
 *                 token:
 *                   type: string
 *                   description: JWT con payload { uid, rol }. Expira en 8 horas.
 *                 usuario:
 *                   $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Faltan campos o el email no tiene formato valido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 *       401:
 *         description: Credenciales invalidas. Mismo mensaje para email inexistente y contrasena incorrecta.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: El usuario existe y la contrasena es correcta, pero esta desactivado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/login',
  [
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
  ],
  validarCampos,
  login
);

/**
 * @openapi
 * /api/auth/perfil:
 *   get:
 *     tags: [Auth]
 *     summary: Usuario de la sesion actual
 *     description: >
 *       Devuelve el usuario del token. Lo usa el frontend para recuperar la sesion al
 *       recargar la pagina. El token debe seguir siendo valido y el usuario debe seguir
 *       activo; si el usuario fue desactivado despues de emitir el token, la respuesta
 *       es 403.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario autenticado.
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
 *                   $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: Sin header Authorization, token invalido o token expirado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: El usuario del token fue desactivado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/perfil', validarJWT, perfil);

export default router;