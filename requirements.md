# requirements.md — Sistema Fundación Nuestra Esperanza

Fuente de verdad de **qué** debe hacer el sistema. Distinto de `AGENTS.md` (cómo se programa) y de `design.md` (cómo se construye técnicamente). Cada requerimiento tiene un identificador estable (RF-xx) para poder referenciarlo desde `design.md`, `tasks.md` y los commits.

## Módulo documental

**RF-01 — Login diferenciado por rol**
El sistema deberá autenticar usuarios mediante JWT y determinar, según su rol, qué módulos y funcionalidades puede ver o modificar.
*Criterio de aceptación:* al autenticarse, la respuesta incluye el rol del usuario; el frontend oculta o deshabilita las funcionalidades no permitidas para ese rol.

**RF-02 — Restricción de funcionalidades sensibles**
El sistema deberá restringir funcionalidades sensibles (validación de extracciones OCR, administración de insumos) únicamente a los roles autorizados.
*Criterio:* un intento de acceso a un endpoint protegido sin el permiso correspondiente responde con estado 403.

**RF-03 — Registro y carga de documentos digitalizados**
El sistema deberá permitir subir una imagen ya digitalizada y crear su registro correspondiente.
*Criterio:* al subir un archivo válido (jpg/png/pdf), el sistema crea un registro en estado "cargado, pendiente de OCR" y devuelve su identificador.

**RF-04 — Vinculación de metadatos según tipo de documento**
El sistema deberá vincular cada documento con su registro de metadatos correspondiente, según su tipo (ficha social, almuerzos, salidas y entradas, referencia social).
*Criterio:* cada tipo de documento persiste sus metadatos en su propia tabla de extensión, ligada al documento común por clave foránea.

**RF-05 — Flexibilidad de formatos documentales**
El sistema deberá reconocer y aplicar el conjunto de campos correcto según el tipo de documento seleccionado al momento de la carga.
*Criterio:* seleccionar un tipo de documento en la interfaz de carga presenta el formulario de metadatos específico de ese tipo, no uno genérico.

**RF-06 — Extracción por OCR (AWS Textract)**
El sistema deberá extraer automáticamente el contenido de documentos impresos y manuscritos mediante AWS Textract, distinguiendo documentos de registro único (ficha social, referencia social) de documentos tabulares con múltiples registros por imagen (ingresos y salidas, almuerzos).
*Criterio:* al finalizar el proceso de OCR, el documento pasa a estado "pendiente de validación" y expone el texto o los campos extraídos para revisión.

**RF-07 — Validación de la extracción**
El sistema deberá permitir revisar y validar (o corregir) las extracciones mediante una interfaz, a nivel de documento completo o de fila individual según el tipo.
*Criterio:* un usuario con permiso de validación puede aprobar o editar cada campo o fila extraído; al aprobar, el documento pasa a estado "validado".

**RF-08 — Búsqueda de documentos**
El sistema deberá permitir la búsqueda de documentos por texto completo (contenido OCR) y por metadatos.
*Criterio:* una búsqueda por palabra clave devuelve los documentos cuyo texto extraído o campos de metadatos coinciden con el término buscado.

**RF-09 — Consulta y visualización remota**
El sistema deberá permitir consultar y visualizar de forma remota un documento ya catalogado.
*Criterio:* un usuario autorizado puede abrir el archivo original de un documento catalogado desde cualquier ubicación con acceso al sistema.

## Módulo alimentario

**RF-10 — Gestión de stock de insumos**
El sistema deberá permitir registrar y actualizar el stock de insumos disponibles.
*Criterio:* cada movimiento de stock (entrada/salida) queda registrado, y la cantidad actual refleja correctamente el resultado de cada operación.

**RF-11 — Registro y composición de recetas**
El sistema deberá permitir registrar recetas, indicando los insumos y cantidades que requiere cada una.
*Criterio:* una receta no puede guardarse sin al menos un insumo asociado con su cantidad correspondiente.

**RF-12 — Optimización de menús por presupuesto y stock**
El sistema deberá calcular, mediante programación lineal (microservicio Python/PuLP, comunicación HTTP síncrona), la combinación de recetas que optimiza el uso de presupuesto, stock disponible y precios de referencia.
*Criterio:* dado un presupuesto y stock disponibles, el sistema devuelve una combinación de recetas factible (que no excede los insumos disponibles) o indica explícitamente que no hay solución factible.

## Requisitos no funcionales

**NFR-01 — Integridad transaccional**
Toda operación que afecte múltiples tablas (ej. registrar un documento junto con sus metadatos, o descontar stock al confirmar un menú) deberá ejecutarse dentro de una transacción atómica — si una parte falla, no debe quedar información parcial guardada.

**NFR-02 — Resiliencia de red**
Dado que la conectividad en el sitio es lenta pero generalmente disponible, las operaciones de carga de archivos deberán implementar reintentos con backoff, mostrar progreso visible, y no bloquear otras operaciones del usuario mientras una carga está en curso.

**NFR-03 — Seguridad**
Las contraseñas nunca se almacenan en texto plano (hash). Los tokens JWT tienen expiración definida. La autorización es granular por endpoint (ver RF-02).

**NFR-04 — Documentación de API**
Cada endpoint deberá documentarse mediante anotaciones OpenAPI/Swagger, de forma que la documentación y la colección de Postman puedan generarse o actualizarse directamente desde el código, sin mantenerse a mano por separado.

## Fuera de alcance (decidido explícitamente)

- Arquitectura offline-first (aplicación funcionando sin conexión y sincronizando después) — descartada; la conectividad en el sitio es lenta, no intermitente ni ausente.
- Cola de mensajes o broker para la comunicación con el microservicio de PuLP — se usa HTTP síncrono, dado que el módulo lo usa una sola persona a la vez.
- Registro de la asistencia alimentaria efectivamente entregada como funcionalidad separada — evaluado y descartado por ahora.
