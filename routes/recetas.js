import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getRecetas,
  getReceta,
  getDisponibilidadReceta,
  crearReceta,
  actualizarReceta,
  eliminarReceta
} from '../controllers/recetas.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarJWT } from '../middlewares/validar-jwt.js';
import { validarPaginacion } from '../middlewares/validar-paginacion.js';
import { validarRol } from '../middlewares/validar-rol.js';

const router = Router();

router.use(validarJWT, validarRol('admin'));

const validarId = param('id')
  .isUUID()
  .withMessage('El id de la receta debe ser un UUID valido');

const validarInsumos = (obligatorio) => {
  const regla = body('insumos');

  return [
    (obligatorio ? regla : regla.optional())
      .isArray({ min: 1, max: 100 })
      .withMessage('La receta necesita entre 1 y 100 insumos'),
    body('insumos.*.producto_id')
      .isUUID()
      .withMessage('Cada insumo necesita un producto_id valido'),
    body('insumos.*.cantidad_requerida')
      .isFloat({ gt: 0, max: 99999999 })
      .withMessage('La cantidad requerida por persona debe ser un numero mayor a 0')
      .toFloat()
  ];
};

const validarNombre = (obligatorio) => {
  const regla = body('nombre');

  return (obligatorio ? regla : regla.optional())
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ max: 150 })
    .withMessage('El nombre no puede superar 150 caracteres');
};

const validarDescripcion = body('descripcion')
  .optional({ nullable: true })
  .isString()
  .withMessage('La descripcion debe ser texto')
  .isLength({ max: 5000 })
  .withMessage('La descripcion no puede superar 5000 caracteres');

const validarAlMenosUnCampo = body().custom((cuerpo) => {
  const hayCampo = ['nombre', 'descripcion', 'insumos'].some((campo) => cuerpo[campo] !== undefined);

  if (!hayCampo) {
    throw new Error('Envia al menos uno de: nombre, descripcion, insumos');
  }

  return true;
});

/**
 * @openapi
 * /api/recetas:
 *   get:
 *     tags: [Recetas]
 *     summary: Listar recetas
 *     description: >
 *       Solo administradores. Una receta se define para **una persona**: cada insumo trae la
 *       cantidad por persona, en la unidad base del insumo. Orden por nombre.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: buscar
 *         schema:
 *           type: string
 *         description: Coincidencia parcial en el nombre.
 *       - in: query
 *         name: producto_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Solo las recetas que usan ese insumo.
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
 *         description: Lista de recetas con su numero de insumos.
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
 *                 recetas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RecetaResumen'
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
 *     tags: [Recetas]
 *     summary: Crear una receta
 *     description: >
 *       Solo administradores. Se guarda en una transaccion. Debe tener al menos un insumo (RF-12).
 *       Cada `producto_id` debe ser una **base** o un producto sin base, nunca una presentacion
 *       (400), y no puede repetirse. `cantidad_requerida` es por persona, en la unidad base.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecetaCrear'
 *     responses:
 *       201:
 *         description: Receta creada con la disponibilidad y el precio vigente de sus insumos.
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
 *                 receta:
 *                   $ref: '#/components/schemas/Receta'
 *       400:
 *         description: Datos invalidos, insumo inexistente, repetido o que es una presentacion.
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
 */
router.get(
  '/',
  [
    query('buscar')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('El termino de busqueda no puede superar los 100 caracteres'),
    query('producto_id')
      .optional()
      .isUUID()
      .withMessage('producto_id debe ser un UUID valido'),
    ...validarPaginacion
  ],
  validarCampos,
  getRecetas
);

router.post(
  '/',
  [validarNombre(true), validarDescripcion, ...validarInsumos(true)],
  validarCampos,
  crearReceta
);

/**
 * @openapi
 * /api/recetas/{id}:
 *   get:
 *     tags: [Recetas]
 *     summary: Obtener una receta con sus insumos
 *     description: >
 *       Solo administradores. Cada insumo trae el stock disponible hoy (suma de la base y todas
 *       sus presentaciones, sin lotes vencidos), el precio vigente por unidad base (lote que
 *       vence primero; si no hay stock, el de referencia) y el costo por persona.
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
 *         name: tipo_cambio_bs_usd
 *         schema:
 *           type: number
 *         description: Opcional. Tipo de cambio para los importes en Bs; por defecto el configurado en el servidor (`tipo_cambio_usado` lo indica).
 *     responses:
 *       200:
 *         description: Receta con sus insumos.
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
 *                 receta:
 *                   $ref: '#/components/schemas/Receta'
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
 *         description: Receta no encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     tags: [Recetas]
 *     summary: Editar una receta
 *     description: >
 *       Solo administradores. Cambia solo los campos enviados (al menos uno). Si se envia
 *       `insumos`, reemplaza la lista completa; todo en una transaccion. Mismas reglas de
 *       insumos que al crear.
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
 *             $ref: '#/components/schemas/RecetaEditar'
 *     responses:
 *       200:
 *         description: Receta actualizada.
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
 *                 receta:
 *                   $ref: '#/components/schemas/Receta'
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
 *         description: Receta no encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags: [Recetas]
 *     summary: Eliminar una receta
 *     description: Solo administradores. Responde 409 si la receta ya forma parte de una planificacion de menu.
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
 *         description: Receta eliminada.
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
 *         description: El rol del usuario no es admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Receta no encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: La receta forma parte de una planificacion de menu.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * /api/recetas/{id}/disponibilidad:
 *   get:
 *     tags: [Recetas]
 *     summary: Verificar si alcanzan los insumos para N personas
 *     description: >
 *       Solo administradores. Multiplica la cantidad por persona de cada insumo por `personas`
 *       y la compara con el stock disponible hoy (sin lotes vencidos). No descuenta nada.
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
 *         name: personas
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10000
 *     responses:
 *       200:
 *         description: Disponibilidad por insumo y resultado global.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecetaDisponibilidad'
 *       400:
 *         description: Id o numero de personas invalido.
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
 *         description: Receta no encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id/disponibilidad',
  [
    validarId,
    query('personas')
      .isInt({ min: 1, max: 10000 })
      .withMessage('personas debe ser un entero entre 1 y 10000')
      .toInt(),
    query('tipo_cambio_bs_usd')
      .optional()
      .isFloat({ gt: 0, max: 99999999 })
      .withMessage('El tipo de cambio debe ser un numero mayor a 0')
  ],
  validarCampos,
  getDisponibilidadReceta
);

const validarTipoCambio = query('tipo_cambio_bs_usd')
  .optional()
  .isFloat({ gt: 0, max: 99999999 })
  .withMessage('El tipo de cambio debe ser un numero mayor a 0');

router.get('/:id', [validarId, validarTipoCambio], validarCampos, getReceta);

router.patch(
  '/:id',
  [
    validarId,
    validarAlMenosUnCampo,
    validarNombre(false),
    validarDescripcion,
    ...validarInsumos(false)
  ],
  validarCampos,
  actualizarReceta
);

router.delete('/:id', validarId, validarCampos, eliminarReceta);

export default router;
