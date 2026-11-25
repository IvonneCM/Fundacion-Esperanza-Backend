import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getProductos,
  getProductosPorAgotarse,
  getProducto,
  crearProducto,
  actualizarProducto
} from '../controllers/productos.js';
import { validarCampos } from '../middlewares/validar-campos.js';
import { validarJWT } from '../middlewares/validar-jwt.js';
import { validarPaginacion } from '../middlewares/validar-paginacion.js';
import { validarRol } from '../middlewares/validar-rol.js';

const router = Router();

router.use(validarJWT, validarRol('admin'));

const validarId = param('id')
  .isUUID()
  .withMessage('El id del producto debe ser un UUID valido');

const validarDatosProducto = [
  body('codigo')
    .trim()
    .notEmpty()
    .withMessage('El codigo es obligatorio')
    .isLength({ max: 10 })
    .withMessage('El codigo no puede superar 10 caracteres'),
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ max: 150 })
    .withMessage('El nombre no puede superar 150 caracteres'),
  body('tipo_envase')
    .trim()
    .notEmpty()
    .withMessage('El tipo de envase es obligatorio')
    .isLength({ max: 30 })
    .withMessage('El tipo de envase no puede superar 30 caracteres'),
  body('unidad_medida')
    .trim()
    .notEmpty()
    .withMessage('La unidad de medida es obligatoria')
    .isLength({ max: 20 })
    .withMessage('La unidad de medida no puede superar 20 caracteres'),
  body('contenido_neto_referencia')
    .isFloat({ gt: 0, max: 99999999.99 })
    .withMessage('El contenido neto debe ser un numero mayor a 0')
    .toFloat(),
  body('precio_referencia_usd')
    .optional({ nullable: true })
    .isFloat({ gt: 0, max: 99999999 })
    .withMessage('El precio de referencia (USD) debe ser un numero mayor a 0')
    .toFloat(),
  body('precio_referencia_bs')
    .optional({ nullable: true })
    .isFloat({ gt: 0, max: 99999999 })
    .withMessage('El precio de referencia (Bs) debe ser un numero mayor a 0')
    .toFloat(),
  body()
    .custom((cuerpo) => {
      const tieneUsd = cuerpo.precio_referencia_usd !== undefined && cuerpo.precio_referencia_usd !== null;
      const tieneBs = cuerpo.precio_referencia_bs !== undefined && cuerpo.precio_referencia_bs !== null;

      if (!tieneUsd && !tieneBs) {
        throw new Error('Indica el precio de referencia en Bs (precio_referencia_bs) o en USD (precio_referencia_usd)');
      }

      return true;
    }),
  body('producto_base_id')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('El producto base debe ser un UUID valido'),
  body('marca')
    .optional({ nullable: true })
    .isString()
    .withMessage('La marca debe ser texto')
    .trim()
    .isLength({ max: 100 })
    .withMessage('La marca no puede superar 100 caracteres'),
  body('medida_casera_nombre')
    .optional({ nullable: true })
    .isString()
    .withMessage('El nombre de la medida casera debe ser texto')
    .trim()
    .isLength({ max: 30 })
    .withMessage('El nombre de la medida casera no puede superar 30 caracteres'),
  body('medida_casera_cantidad')
    .optional({ nullable: true })
    .isFloat({ gt: 0, max: 999999 })
    .withMessage('La cantidad de la medida casera debe ser un numero mayor a 0')
    .toFloat(),
  body()
    .custom((cuerpo) => {
      const tieneNombre = Boolean(String(cuerpo.medida_casera_nombre ?? '').trim());
      const tieneCantidad = cuerpo.medida_casera_cantidad !== undefined && cuerpo.medida_casera_cantidad !== null;

      if (tieneNombre !== tieneCantidad) {
        throw new Error('La medida casera lleva nombre y cantidad juntos, o ninguno');
      }

      return true;
    })
];

/**
 * @openapi
 * /api/productos:
 *   get:
 *     tags: [Inventario]
 *     summary: Listar productos del almacen
 *     description: >
 *       Solo administradores. Cada producto es una presentacion (arroz a granel, arroz por
 *       quintal y arroz en caja son tres productos). Incluye el stock, calculado como la suma
 *       de `cantidad_actual` de sus lotes: `stock_base` en la unidad base del producto y
 *       `stock_presentaciones` dividido por el contenido neto. Orden por nombre.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: buscar
 *         schema:
 *           type: string
 *         description: Coincidencia parcial en nombre, codigo o marca.
 *       - in: query
 *         name: tipo_envase
 *         schema:
 *           type: string
 *         description: Tipo de envase exacto (sin distinguir mayusculas).
 *       - in: query
 *         name: solo_bases
 *         schema:
 *           type: boolean
 *         description: true = solo productos sin base (los insumos, para el selector de recetas).
 *       - in: query
 *         name: producto_base_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Solo las presentaciones de esa base.
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
 *         description: Lista de productos con su stock.
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
 *                 productos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductoInventario'
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
 *     summary: Registrar un producto del almacen
 *     description: >
 *       Solo administradores. El `codigo` es unico y se normaliza a mayusculas. Las cantidades
 *       del inventario se guardan en `unidad_medida` (unidad base); `contenido_neto_referencia`
 *       es cuantas unidades base trae una presentacion; el precio es por presentacion.
 *       Con `producto_base_id` el producto es presentacion de ese insumo: la base debe existir,
 *       no ser a su vez presentacion (400/409) y tener la misma `unidad_medida`. La medida casera
 *       (`medida_casera_nombre` + `medida_casera_cantidad`, ej. jarra 0.51 kg) solo va en una base.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductoInventarioCrear'
 *     responses:
 *       201:
 *         description: Producto creado, con stock en 0.
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
 *                 producto:
 *                   $ref: '#/components/schemas/ProductoInventario'
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
 *         description: Ya existe un producto con ese codigo.
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
    query('tipo_envase')
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage('El tipo de envase no puede superar 30 caracteres'),
    query('solo_bases')
      .optional()
      .isBoolean()
      .withMessage('solo_bases debe ser true o false')
      .toBoolean(),
    query('producto_base_id')
      .optional()
      .isUUID()
      .withMessage('producto_base_id debe ser un UUID valido'),
    ...validarPaginacion
  ],
  validarCampos,
  getProductos
);

router.post('/', validarDatosProducto, validarCampos, crearProducto);

/**
 * @openapi
 * /api/productos/por-agotarse:
 *   get:
 *     tags: [Inventario]
 *     summary: Alerta de productos por agotarse
 *     description: >
 *       Solo administradores. Productos cuyo stock disponible es menor o igual al `umbral`
 *       (en unidad base; por defecto 0, es decir, agotados). El stock disponible no cuenta
 *       los lotes vencidos; `stock_base` si los cuenta. Incluye los productos sin lotes.
 *       Ordenados del que menos tiene al que mas. No hay un minimo por producto: el umbral
 *       es el mismo para todos.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: umbral
 *         schema:
 *           type: number
 *           default: 0
 *           minimum: 0
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
 *         description: Productos con poco o ningun stock disponible.
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
 *                 umbral:
 *                   type: number
 *                 total:
 *                   type: integer
 *                 pagina:
 *                   type: integer
 *                 limite:
 *                   type: integer
 *                 productos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductoInventario'
 *       400:
 *         description: Parametros invalidos.
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
 * /api/productos/{id}:
 *   get:
 *     tags: [Inventario]
 *     summary: Obtener un producto con su stock y sus lotes
 *     description: >
 *       Solo administradores. Los lotes devueltos son los que tienen existencias, ordenados por
 *       fecha de vencimiento (FEFO). Si el producto no tiene base (es un insumo), agrega
 *       `presentaciones` (con su stock) e `insumo`: stock total y disponible de todas ellas y el
 *       precio vigente por unidad base (lote que vence primero; si no hay stock, el de referencia).
 *       Si es presentacion de otro, agrega `base`.
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
 *         description: Producto con stock y lotes con existencias.
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
 *                 producto:
 *                   $ref: '#/components/schemas/ProductoInventario'
 *                 lotes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LoteInventario'
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
 *         description: Producto no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     tags: [Inventario]
 *     summary: Editar un producto
 *     description: >
 *       Solo administradores. Reemplaza todos los campos. Si el producto ya tiene lotes, no se
 *       puede cambiar `unidad_medida` ni `contenido_neto_referencia` (responde 409): las
 *       cantidades y los precios ya registrados dependen de ellos.
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
 *             $ref: '#/components/schemas/ProductoInventarioCrear'
 *     responses:
 *       200:
 *         description: Producto actualizado.
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
 *                 producto:
 *                   $ref: '#/components/schemas/ProductoInventario'
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
 *         description: Producto no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Codigo repetido, o cambio de unidad/contenido neto con lotes existentes.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/por-agotarse',
  [
    query('umbral')
      .optional()
      .isFloat({ min: 0, max: 99999999.99 })
      .withMessage('El umbral debe ser un numero mayor o igual a 0')
      .toFloat(),
    ...validarPaginacion
  ],
  validarCampos,
  getProductosPorAgotarse
);

router.get('/:id', validarId, validarCampos, getProducto);

router.put('/:id', validarId, validarDatosProducto, validarCampos, actualizarProducto);

export default router;
