# Cambios solicitados al backend — revisión 2026-11-24

Resumen para pasar al repo del backend (`Fundacion-Esperanza-Backend`). El detalle y las razones están en `observaciones-revision.md` de este repo. Los RF y el esquema siguen viviendo en el backend: aquí solo se listan las necesidades detectadas, en orden de prioridad. Los puntos marcados **[decidir]** necesitan una propuesta del backend antes de implementarse.

Los documentos de referencia (formularios CIA/CSA e inventario real del 11.9.2026) están en `doc/inventario/` de este repo.

## Prioridad alta (bloquean pantallas)

1. **Documental: validación automática en registro manual.** Al crear o editar metadatos a mano, el documento (o la fila) pasa a `validado`. Solo lo extraído por OCR queda `pendiente`. Un documento sin metadatos no se valida solo.
2. **Documental: cambiar el estado de validación** (aprobar / volver a pendiente) por documento y por fila en tipos tabulares (RF-08). Confirmar si el endpoint existe.
3. **Inventario: lotes sin fecha de vencimiento.** En los Excel, `SFV` (sin fecha de vencimiento) es la situación más común. Hoy `fecha_expiracion` es obligatoria en cada ítem de ingreso. Hacerla opcional y ajustar alertas/FEFO (los lotes sin fecha van al final del FEFO y nunca alertan por vencimiento).
4. **Inventario: salida de producto vencido con confirmación.** Hoy 409. Aceptar un indicador de confirmación (solo `admin`) más un motivo; registrar los días vencidos en el movimiento. Mantener el bloqueo si no se confirma.

## Prioridad media

5. **`PATCH /api/lotes/:id`**: editar `fecha_expiracion` y `notas`. No cantidades (esas solo por movimiento o ajuste). Revisar la regla de "misma fecha para reutilizar lote".
6. **Anular un ingreso o una salida** (movimiento inverso que deja traza) y editar solo campos que no afectan stock (proveedor, nº de documento, observaciones). Se mantiene sin `DELETE`.
7. **Producto: marca y presentación.** Agregar `marca` (y revisar si `tipo_envase` cubre bolsa/caja/quintal/arroba/granel). **[decidir]** además: código jerárquico `C1/C2/C3` del Excel, y medida casera del granel ("jarra de 510 g").
8. **Salida a cocina: receptor y confirmación.** Las "mamás" son la cocina; una encargada rotativa recibe los insumos. Campos: `recibido_por` (nombre), `ci_recibe`, `recibido_conforme` (bool) y `fecha_recepcion`. **[decidir]** si hay un catálogo de mamás y si la salida nace pendiente de confirmación. Origen de cada ítem (donación/compra) y N.º CSA, como en el formulario.
9. **Tipos de documento:** CRUD (`nombre`, `código`, color/ícono por defecto). Los tipos nuevos no tendrán tabla de metadatos; solo campos comunes.
10. **Perfil propio:** `PUT/PATCH /api/auth/perfil` para cambiar nombre y correo del usuario autenticado (hoy solo `GET`). Confirmar si ya existe algo equivalente en `/api/usuarios/:id`.

## Prioridad baja / a discutir

11. **Notas por ítem de ingreso:** no pedirlas desde el frontend; no hace falta cambio, solo confirmar que el backend las tolera ausentes.
12. **Nombre y unidad copiados al lote:** evaluar quitarlos (`inventario_almacen_lote.nombre`, `unidad_medida`), ya que duplican al producto.
13. **Moneda canónica:** hoy es USD (`precio_referencia_usd`, `precio_unitario_usd`). Observación: la compra real se hace en Bs y solo el precio de referencia usa USD. **[decidir]** si el precio real en Bs pasa a ser el dato principal y el USD solo el de referencia.
14. **Equivalencias entre presentaciones y conversión a porciones** (T-17): el Excel muestra arroz en 5 presentaciones y carnes contadas en presas. Necesario antes de recetas (RF-12/RF-13).
15. **Importación inicial** del inventario desde el Excel (`doc/inventario/final 16.9.26 -INVENTARIO-BD_corregido 2.xlsx`), si se decide hacerla.
