# observaciones-revision.md — Revisión del 2026-11-24

Observaciones de la persona a cargo tras recorrer Documental, Inventario y la maqueta de Menú, con las decisiones tomadas y su clasificación. Las tareas resultantes están en `tasks.md` (Fase 4, F-18 en adelante). Lo que toca al backend está resumido para pasarle en `doc/cambios-backend.md`.

Etiquetas: **[FE]** solo frontend · **[BE]** requiere cambio en el backend · **[DEC]** decisión tomada · **[ABIERTO]** falta definir.

## 1. Decisiones tomadas (2026-11-24)

- **[DEC] Las "mamás" son la cocina.** La salida de almacén es la entrega de insumos a la cocina. Una mamá encargada (rota) prepara el almuerzo para todas; el administrador le entrega los insumos y ella debe marcar que los recibió. Hace falta un receptor identificable por salida (nombre + CI, idealmente de un catálogo corto de mamás).
- **[DEC] Registro manual de documentos = ya validado.** La validación solo existe para lo que sale de OCR. Si una persona escribió o editó los metadatos, el documento queda validado. Un documento subido sin metadatos no se valida solo. Además debe poder aprobarse/corregirse el estado a mano (RF-08).
- **[DEC] Se permite sacar producto vencido**, con advertencia que diga cuántos días lleva vencido y la cantidad, y con confirmación explícita. Se registra en el movimiento. Solo `admin`.
- **[DEC] También debe poder darse de baja un lote vencido.** Eso ya existe como ajuste por conteo (`POST /api/lotes/:id/ajuste` con cantidad contada 0 y motivo), pero está enterrado en el detalle del producto. Hay que ponerlo como acción visible ("Dar de baja") en la tabla de lotes y en Alertas.
- **[DEC] Inicio/perfil:** colores por módulo, ícono de usuario, nombre en tamaño destacado y edición de nombre y correo desde ahí. El proyecto usa `lucide-react` (no FontAwesome); se usa ese ícono, sin instalar dependencias.
- **[DEC] Menú:** las pantallas de maqueta ya existen en `src/features/menu/` (Planificación, Menús, Recetas). Son temporales (datos fijos). Las recetas reales esperan el rediseño de inventario (§3).

## 2. Documental

| Observación | Etiqueta | Nota |
|---|---|---|
| Registro manual no debe pedir validación | [BE] [FE] | El backend debe marcar `validado` al guardar metadatos manuales; el frontend deja de mostrar el aviso "por validar" para esos documentos. |
| Poder editar el estado de validación | [FE] [BE] | RF-08 no tiene tarea de UI. Botón Aprobar / Volver a pendiente en el detalle, y por fila en tabulares. |
| CRUD de tipos de documento | [BE] [FE] | Hoy los 5 tipos tienen tablas de extensión fijas (RF-05). Los tipos nuevos no tendrán metadatos específicos: solo campos comunes. Hay que definir de dónde sacan color e ícono (propuesta: paleta rotativa y un ícono por defecto elegible). |

## 3. Inventario — qué muestran los Excel (`doc/inventario/`)

Hallazgos relevantes del Excel real:

- **Código jerárquico** `C1/C2/C3`: categoría (01 comestibles secos, 02 limpieza), subcategoría (sal, azúcar, arroz...) y ítem. Ej. `0103001`. Hoy el sistema no modela esa jerarquía.
- **Un artículo, varias presentaciones.** Arroz tiene quintal 46 kg, bolsa 1 kg, bolsa 500 g, arroba 11,5 kg y granel. Cada una es una fila distinta con su propio stock. Esto es exactamente el problema de equivalencias que bloquea las recetas (T-17 del backend).
- **Granel medido en "jarra"** (ej. arroz: jarra de 510 g; azúcar: 560 g). Hoja `UNIDADES DE MEDIDA`. Es la medida casera con la que cocina la cocina; las recetas probablemente la necesiten.
- **`SFV` = sin fecha de vencimiento.** Muchísimos productos no tienen fecha. El backend exige `fecha_expiracion` en cada ítem de ingreso; hay que permitir lote sin vencimiento. **[BE]**
- **Perecederos con vida útil** ("máximo 20 días desde su compra"): pollo, costillas, carne molida. Su vencimiento se deriva de la compra.
- **Conversión a presas/porciones:** "1 pollo se divide en 10 presas", un kilo de costillas en N porciones. Se cuenta en piezas, no en kg.
- **Estados en notas:** "caja abierta", "saldo de un bidón abierto", "vencido". Son lotes abiertos o parciales; no hay campo para eso.
- **Falta la marca** en la plantilla. Las columnas son: código, artículo, tipo de envase, contenido neto (referencia), fecha de inventario inicial, cantidad, unidad de medida, fecha de expiración, notas, precio unitario (Bs), tipo de cambio.
- **Formulario de ingreso (CIA):** N.º CIA, tipo (donación en especie / traspaso; la compra va con factura), proveedor/donante (nombre, NIT/CI), N.º de factura o acta de donación, programa POA, ítems (descripción, cantidad, unidad, precio unitario y total, vencimiento) y observaciones.
- **Formulario de salida (CSA):** N.º CSA, área/solicitante, ubicación/programa POA, ítems (código, descripción, cantidad, unidad, **origen donación/compra**), observaciones de entrega y **firmas** (solicitado por: nombre y CI; entregado por) al momento de la entrega.

Observaciones:

| Observación | Etiqueta | Nota |
|---|---|---|
| Editar fecha de vencimiento | [BE] | `PATCH` del lote (fecha y notas), nunca cantidad (la cantidad solo cambia por movimientos/ajustes). |
| Lotes dentro del producto | [FE] | Ya existe el modelo (producto → lotes). Mostrar el próximo vencimiento y los lotes en la lista y el detalle. |
| Nombre duplicado en producto y lote | [BE] [FE] | El lote copia `nombre` y `unidad`. Ocultarlo en la UI y proponer quitarlo. |
| Marca, formato, bolsa/caja | [BE] | Agregar `marca` y `presentación` al producto, ver §3 hallazgos. Pendiente de diseño con el backend. |
| Precio de referencia | [FE] [BE] | El precio de referencia (USD) solo se usa cuando no se sabe cuánto costó. Si se conoce el precio real en Bs, se ingresa en Bs y se convierte con el tipo de cambio. Revisar el formulario de ingreso; decidir con el backend si la moneda canónica pasa a ser Bs. |
| Notas por ítem en ingreso | [FE] | Se quitan del formulario; queda la observación de cabecera. |
| Selector de producto con búsqueda | [FE] | Campo de texto que busca con cada letra (debounce) y despliega resultados. Con ~50 productos el desplegable actual no sirve. Mismo componente para proveedor y para insumos de receta. |
| Elegir lote, FEFO por defecto | [FE] | El backend ya acepta `inventario_almacen_lote_id` en ingresos y salidas. |
| Salida: solo productos utilizables | [FE] | Mostrar stock sin vencidos; si solo hay vencido, mensaje propio ("hay N kg pero vencidos"), no "stock insuficiente". |
| Salida de vencidos con advertencia | [BE] [FE] | Hoy el backend responde 409. Cambio: flag de confirmación + motivo; se registra "salió vencido (N días)". |
| Editar ingresos/salidas | [BE] | El backend decidió no tener `PUT`/`DELETE`. Propuesta: **anular** (movimiento inverso) y volver a registrar; editar libre solo campos que no afectan stock (proveedor, nº de documento, observaciones). |
| Entrega a la cocina con confirmación | [BE] [FE] | Ver §1. Propuesta v1: receptor (nombre + CI, catálogo de mamás), casilla "recibido conforme" con fecha/hora, y opción de adjuntar la foto del comprobante firmado en Documental. Pendiente de nuevo RF. |
| Dónde están los ajustes | [FE] | Existen en el detalle del producto, por lote. Hacerlos visibles (§1, "Dar de baja"). |
| Ingresos y salidas de comida en Excel | [ABIERTO] | Los formularios ya están en `doc/inventario/`. Falta definir si se importa el inventario inicial desde el Excel. |

## 4. Alertas y Proveedores

- **[FE]** Alertas con severidad por color: vencido / vence en 7 días o menos / vence en 30 días o menos; agotado / stock bajo. Orden por gravedad, contadores arriba y contador en el sidebar. Solo tokens de `variables.css`.
- **[FE]** Proveedores: ícono de persona de `lucide-react` (sin emojis).
- Alertas y Proveedores son funciones de soporte: tienen libertad de diseño. Productos y Movimientos deben respetar el procedimiento de los formularios CIA/CSA, aunque se simplifiquen campos innecesarios.

## 5. Menú

- La maqueta usa nombres de insumo en texto libre y costos en Bs. En el backend `receta_insumos` apunta a un **producto**, y la equivalencia entre presentaciones del mismo insumo está abierta (T-17).
- Antes de recetas reales hay que definir el concepto **insumo genérico** (arroz) con **productos/presentaciones** debajo (quintal, bolsa 1 kg, granel por jarra). Una receta pediría "arroz 8 kg" y el sistema descontaría de los lotes de cualquier presentación vía FEFO.
- La maqueta puede quedar así hasta entonces; al conectarla, el selector de insumo reutiliza el combobox de F-18.
