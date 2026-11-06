# design.md — Backend (Node.js / Express)

Cómo se construye lo definido en `requirements.md`. Este documento crece por módulo: cubre autenticación, roles/usuarios, la estrategia de pruebas y, desde esta sesión, **el mapeo del esquema documental (§8)**. El módulo alimentario se mapea en §8.8 pero se implementa más adelante.

Lo marcado como **(propuesto)** no fue discutido todavía: se puede cambiar antes de implementarlo.

## 1. Requerimientos que cubre

- RF-01 Login diferenciado por rol
- RF-02 Restricción de funcionalidades sensibles según rol
- RF-03	Gestion de usuarios
- NFR-03 Seguridad
- NFR-04 Documentacion de la API

Estado de avance: la Fase 1 (T-01 a T-05 y T-07) y la Fase 2 (T-08) estan implementadas y verificadas. Las pruebas automatizadas (T-06 y T-09) quedaron diferidas hasta terminar el proyecto. El módulo documental inicia con el mapeo de esquema de §8. Ver `CONTEXT.md`.

## 2. Roles y permisos

Tres roles, guardados como una columna `rol` en `usuarios` (sin tabla `roles`):

| Módulo | admin | archivista | visitante |
|---|---|---|---|
| Documental | todo | subir, validar OCR, buscar, ver | buscar y ver solo documentos validados |
| Alimentario | todo | sin acceso | solo lectura |
| Usuarios | crear, editar, desactivar | sin acceso | sin acceso |

Reglas:

- Solo el admin crea cuentas. No hay registro abierto.
- El mapa "rol → qué puede hacer" vive en el código (`config/roles.js`), no en la base de datos.
- La protección real está en el backend (`validarJWT` + `validarRol` en cada ruta). El frontend solo oculta o redirige por experiencia de usuario.
- Para `visitante`, toda consulta de documentos filtra por `estado_validacion = 'validado'` en el servidor.
- Decisión institucional pendiente: confirmar con la fundación que el visitante puede ver documentos validados (contienen datos de salud y familiares de menores).

## 3. Modelo de datos: usuarios

```sql
CREATE TABLE usuarios (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         VARCHAR(100) NOT NULL,
  apellido       VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  rol            VARCHAR(20) NOT NULL DEFAULT 'visitante'
                 CHECK (rol IN ('admin','archivista','visitante')),
  activo         BOOLEAN NOT NULL DEFAULT true,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- El rol por defecto es el de menor privilegio.
- Las tablas `roles`, `permisos` y `rol_permisos` del borrador anterior se eliminan.
- Las demás tablas que apuntan a `usuarios(id)` no cambian.

## 4. Autenticación

Convenciones generales: respuestas `{ ok, msg, error? }` como en `AGENTS.md`.

**Contraseñas (propuesto):** hash con bcrypt (costo 10). Longitud mínima de 8 caracteres al crear o cambiar una contraseña. Nunca se devuelve `password_hash` en ninguna respuesta.

**Token (propuesto):** JWT firmado con `JWT_SECRET` (en `.env`), payload `{ uid, rol }`, expiración de 8 horas, sin refresh token por ahora. Se envía en el header `Authorization: Bearer <token>` (lo soportan Swagger y Postman de forma nativa).

**Primer admin:** como no hay registro abierto, el primer admin se crea con un script (`scripts/crear-admin.js`) que lee nombre, email y contraseña desde variables de entorno o argumentos. No debe quedar ninguna contraseña en el repositorio.

### Endpoints de esta fase
Fase 1, implementada y verificada.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | público | Recibe `email` y `password`, devuelve token con informacion esencial cifrada y datos del usuario |
| GET | `/api/auth/perfil` | cualquier rol autenticado | Devuelve el usuario del token (para que el frontend recupere la sesión) |

**POST `/api/auth/login`**

- Body: `email` (formato email, obligatorio), `password` (obligatorio).
- 200: `{ ok: true, token, usuario: { id, nombre, apellido, email, rol } }`
- 400: campos inválidos (por `validarCampos`).
- 401: credenciales inválidas. El mismo mensaje para email inexistente y contraseña incorrecta, para no revelar qué cuentas existen.
- 403: usuario desactivado (solo se revela después de validar la contraseña).

**Middlewares (`middlewares/`)**

- `validar-campos.js`: envuelve `validarCampos` de `express-validator`. Si hay errores, 400 con `{ ok, msg, errores: [{ campo, mensaje }] }`.
- `validar-jwt.js`: exige header `Authorization: Bearer`, verifica el token, busca el usuario y comprueba que siga `activo`. Sin token, con token invalido o expirado, o si el usuario ya no existe: **401**. Si el usuario fue desactivado despues de emitir el token: **403**. Implementado asi, confirmado por la persona a cargo.
- `validar-rol.js`: `validarRol('admin', 'archivista')`. Si el rol del usuario no está en la lista, 403.

## 4b. Gestión de usuarios (`/api/usuarios`)

RF-03. Solo `admin`. Todas las rutas usan `validarJWT` + `validarRol('admin')`.

**Decisión: no hay borrado físico de usuarios.** RF-03 habla de "desactivar", no de eliminar. Un usuario tiene datos asociados (documentos subidos, validaciones OCR) y borrar la fila rompería esas referencias y el historial de salud de menores. Por eso `DELETE` no existe y la desactivación es la unica salida. Si mas adelante se necesita borrar, se decide por separado y con una regla explícita sobre que pasa con los datos asociados.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/usuarios` | Listar usuarios. Admite `?rol=`, `?activo=`, `?buscar=` y paginación `?pagina=` / `?limite=`. |
| GET | `/api/usuarios/:id` | Obtener uno. |
| POST | `/api/usuarios` | Crear. |
| PUT | `/api/usuarios/:id` | Editar datos y rol. |
| PATCH | `/api/usuarios/:id/estado` | Activar o desactivar (`{ activo: false }`). |

**Filtros y paginación de `GET /api/usuarios`**

Todos opcionales y combinables:

- `?rol=`: filtra por rol (`admin`, `archivista` o `visitante`). Un valor fuera de esa lista responde 400.
- `?activo=`: filtra por estado (`true` o `false`). Otro valor responde 400.
- `?buscar=`: coincidencia parcial, sin distinguir mayúsculas (`ILIKE`), contra `nombre`, `apellido` y `email`.
- `?pagina=` (default 1) y `?limite=` (default 20, máximo 100): paginan el resultado. Valores no enteros o menores a 1 responden 400.
- `total` en la respuesta es la cantidad de filas que cumplen los filtros, antes de paginar.
- Orden fijo: `creado_en DESC`.

**Respuestas**

- `GET /api/usuarios`: 200 `{ ok, msg, total, pagina, limite, usuarios: [...] }`.
- `GET /api/usuarios/:id`: 200 con el usuario; 404 si el `id` no existe.
- `POST`: 201 con el usuario creado; 400 campos inválidos; 409 si el `email` ya existe.
- `PUT`: 200 con el usuario actualizado; 400; 404; 409 si el `email` cambia a uno ya usado.
- `PATCH /:id/estado`: 200 con el usuario; 400 si intenta desactivarse a sí mismo o al último admin activo; 404.

**Reglas de negocio (propuestas)**

- El email se normaliza a minúsculas antes de comparar, para que `Ana@x.org` y `ana@x.org` sean la misma cuenta. `usuarios.email` ya es `UNIQUE`.
- **Un admin no puede desactivar ni degradar a sí mismo.** Es la única forma de garantizar que la fundación nunca se queda sin nadie capaz de administrar usuarios. Si intenta hacerlo, 400 con un mensaje explicito.
- No se puede eliminar al último admin activo. Misma razón, aplicada al caso en que haya mas de una cuenta.
- Al desactivar a un usuario sus tokens ya emitidos dejan de servir: `validarJWT` comprueba `activo` en cada request (responde 403). No hace falta lista de revocacion.
- `POST /api/usuarios` exige `nombre`, `apellido`, `email`, `password` y opcionalmente `rol`. Si no viene `rol`, se aplica `visitante` (menor privilegio, segun §3).
- Contrasena: minimo 8 caracteres, hash bcrypt costo 10. **Nunca se devuelve `password_hash`.**
- Editar no acepta `password`: cambiar la contrasena es un endpoint aparte, para no depender de que el formulario la mande de vuelta.

**Pendiente:** `design.md` §7 preve que el usuario cambie su propia contrasena con recuperacion por correo. Eso define una ruta que hoy no existe. Requiere decidir el mecanismo de correo, que no esta definido en ninguna parte.

## 4c. Documentación de la API (NFR-04)

Implementada en T-07.

- **`swagger-jsdoc`** lee bloques `@openapi` en `routes/*.js` y arma el spec en `config/swagger.js` (OpenAPI 3.0.3). El spec se regenera en cada request: no hay archivo que mantener a mano.
- **`GET /api/docs/swagger.json`** devuelve el spec. Es lo que Postman importa.
- **`/api-docs`** monta Swagger UI (interactivo, con "Try it out").
- Esquemas reutilizables: `Usuario` (sin `password_hash`), `Error`, `ErrorValidacion`. Seguridad vía `bearerAuth`.
- **Ninguna contraseña real en el repositorio.** Los ejemplos usan `{{PASSWORD}}`, que en Postman es una variable de entorno. `design.md` §4 lo exige.

**Dos cosas que hay que tener presentes:**

1. **La colección de Postman es una copia, no un flujo.** Al hacer Import → Link, Postman guarda el spec de ese momento y no vuelve a consultar al servidor. Cuando cambie una ruta hay que re-importar. Nada avisa que quedó vieja. El spec, en cambio, siempre está al día.
2. **`/api-docs` y `/api/docs/swagger.json` no tienen autenticación.** Aceptable en desarrollo; hay que protegerlos o retirarlos antes de producción.

## 5. Estrategia de pruebas

**Estado: diferida.** La persona a cargo decidió aplazar T-06 porque el alcance del trabajo dirigido de esta parte pide la documentación de la API, no la suite de pruebas. Lo que sigue está planeado, no escrito. Cuando se retome, `jest` y `supertest` hay que instalarlos (no están en `package.json`).

- **Herramientas:** Jest + Supertest.
- **El proyecto es ESM** (`"type": "module"`), asi que Jest necesita `--experimental-vm-modules` para correr los tests.
- **Separar la app del arranque:** `app.js` crea y exporta la aplicación Express; `server.js` solo hace `listen`. Así Supertest puede probar rutas sin abrir un puerto.
- **Una sola base de datos, la de Neon, descartable.** Mientras el sistema este en desarrollo no hace falta una base de pruebas aparte: `neondb` se puede perder. La separacion con produccion es una decision de configuracion, no de arquitectura. **Ya no esta vacia:** tiene el admin de pruebas.
- **Un solo `.env`, sin `.env.test`:** la conexion se define en `DATABASE_URL` y se cambia a mano segun el ambiente. La barrera la pone `config/database.js`, que detiene las pruebas cuando `NODE_ENV=test` apunta a una base cuyo nombre no contiene `test`, salvo que `DB_PERMITIR_TEST=true` declare que esa base es desechable. En produccion ese flag va en `false`.
- **Probar a mano** (Postman, `curl`) contra la base de desarrollo esta permitido: la separacion protege a las pruebas automaticas, no al trabajo diario.
- **Pruebas unitarias:** funciones de `services/` y `utils/` (con mocks para integraciones externas como S3, Textract o PuLP).
- **Pruebas de integración:** rutas con Supertest contra la base de prueba.
- **Casos obligatorios de auth:**
  - login correcto
  - contraseña incorrecta
  - campos faltantes o email mal formado
  - petición sin token, con token inválido y con token expirado
  - rol insuficiente (403) y rol permitido (200)
- **Obligatorios en fases posteriores:** la transacción de descuento de stock al confirmar un menú (NFR-01) y el filtro de documentos validados para el visitante.
- **Cobertura mínima:** sin umbral por ahora.
- **Pruebas manuales:** mientras no haya suite automatica, la verificacion es a mano contra la base de desarrollo con Postman o Swagger UI. Ver §4c.

## 6. Frontend (fase posterior)

No se implementa hasta que el login del backend esté probado y exista el `AGENTS.md` del frontend. Valores por defecto (propuesto): Vite + React, React Router, Context API para la sesión, rutas protegidas según el rol del usuario.

## 7. Desiciones a implementar

- El usuario puede cambiar su propia contraseña con recuperación por correo
- Bloqueo por intentos fallidos de login: fuera de alcance por ahora.
- Mecanismo de correo para la recuperación de contraseña: sin definir, y bloquea el punto anterior.

## 8. Módulo documental: esquema confirmado

**Fuente:** `Fundacion_Nuestra_Esperanza.sql` (20 tablas, 2026-11-06). Es la única fuente de verdad del esquema, según `AGENTS.md`. La base Neon fue recreada con este archivo y verificada con `npm run db:probar` (20 tablas, sin constraints duplicados). **Todavía no se crearon modelos ni endpoints**: primero hay que cerrar los puntos abiertos de §8.9.

El módulo documental toca 8 tablas: `documentos` (común), el catálogo `tipos_documentos` y 6 tablas de extensión. `ficha_social_datos` y `referencia_social_datos` son 1:1 con `documentos`; `almuerzo_registro`, `salida_entrada_registro` y `ticket_transporte_registro` son 1:N (varias filas por imagen); `ficha_social_grupo_familiar` es 1:N de `ficha_social_datos`.

### 8.1 `tipos_documentos` (catálogo)

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `nombre_tipo` | varchar(50) | no | — | Nombre visible |
| `codigo` | varchar(10) | no | — | `UNIQUE` (`tipos_documentos_codigo_unique`) |

**Seed obligatorio:** `ficha_social`, `almuerzo`, `salida_entrada`, `referencia_social` y `ticket_transporte`. Sin estas filas no se puede insertar en `documentos` porque `tipos_documentos_id` es `NOT NULL`.

### 8.2 `documentos` (común)

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `codigo` | varchar(30) | no | — | Sin `UNIQUE` (§8.9) |
| `tipos_documentos_id` | uuid | no | — | FK → `tipos_documentos(id)` |
| `ruta_archivo` | varchar(500) | no | — | Clave del archivo en S3/MinIO |
| `texto_ocr` | text | sí | — | Texto crudo extraído |
| `texto_ocr_tsv` | tsvector | sí | — | Índice GIN; nada lo llena todavía (§8.9) |
| `estado_ocr` | varchar(20) | no | `'pendiente'` | CHECK: `pendiente`, `procesado`, `error` |
| `estado_validacion` | varchar(20) | no | `'pendiente'` | CHECK: `pendiente`, `validado`, `rechazado` |
| `usuario_registro_id` | uuid | no | — | FK → `usuarios(id)` |
| `usuario_validacion_id` | uuid | sí | — | FK → `usuarios(id)`; se llena al validar |
| `fecha_registro` | timestamptz | no | `now()` | |
| `fecha_validacion` | timestamptz | sí | — | |

Índices: `idx_documentos_fts` GIN sobre `texto_ocr_tsv` y `idx_documentos_tipo` sobre `tipos_documentos_id`.

Flujo de estados: al cargar, `estado_ocr='pendiente'` y `estado_validacion='pendiente'`; cuando Textract termina, `estado_ocr='procesado'`; al validar, `estado_validacion='validado'` y se completa `usuario_validacion_id`. No hay estado "cargado" separado de "pendiente de OCR".

### 8.3 `ficha_social_datos` (1:1 con `documentos`)

`id` uuid PK · `documento_id` uuid FK → `documentos(id)` `ON DELETE CASCADE`, `UNIQUE` (`ficha_social_datos_documento_id_unique`) · `nombre_paciente` varchar(150) NOT NULL · `fecha_nacimiento` date · `edad_entrada` smallint · `grado_escolaridad` varchar(50) · `procedencia` varchar(100) · `domicilio_zona` varchar(150) · `calle` varchar(150) · `numero_casa` varchar(20) · `celular_padre` varchar(20) · `celular_madre` varchar(20) · `diagnostico` varchar(200) · `fecha_diagnostico` date · `medico_tratante` varchar(150) · `hospital` varchar(150) · `observaciones` text.

### 8.4 `ficha_social_grupo_familiar` (1:N de `ficha_social_datos`)

`id` uuid PK · `ficha_social_id` uuid FK → `ficha_social_datos(id)` `ON DELETE CASCADE` · `nombre_apellido` varchar(150) NOT NULL · `parentesco` varchar(50) · `edad` smallint · `estado_civil` varchar(30) · `grado_instruccion` varchar(80) · `ocupacion` varchar(100).

### 8.5 `referencia_social_datos` (1:1 con `documentos`)

`id` uuid PK · `documento_id` uuid FK → `documentos(id)` `ON DELETE CASCADE`, `UNIQUE` (`referencia_social_datos_documento_id_unique`) · `cite` varchar(50) · `fecha` date · `remitente_nombre` varchar(150) · `remitente_cargo` varchar(150) · `institucion_remitente` varchar(150) · `nombre_paciente` varchar(150) NOT NULL · `edad_paciente` varchar(20) · `expediente_clinico` varchar(50) · `diagnostico` varchar(200) · `procedencia` varchar(150) · `contenido` text.

### 8.6 `almuerzo_registro` (1:N con `documentos`)

`id` uuid PK · `documento_id` uuid FK → `documentos(id)` `ON DELETE CASCADE` · `fila_numero` smallint · `fecha_almuerzo` date · `apellido_paciente` varchar(100) · `nombres_paciente` varchar(150) NOT NULL · `nombre_cuidador` varchar(150) · `hospital` varchar(100) · `cantidad_almuerzos` smallint NOT NULL DEFAULT 1 · `estado_fila_validacion` varchar(20) NOT NULL DEFAULT `'pendiente'` (CHECK: `pendiente`, `validado`, `rechazado`).

### 8.7 `salida_entrada_registro` (1:N con `documentos`)

`id` uuid PK · `documento_id` uuid FK → `documentos(id)` `ON DELETE CASCADE` · `fila_numero` smallint · `nombre_nino` varchar(150) NOT NULL · `nombre_acompanante` varchar(150) · `ci_acompanante` varchar(20) · `celular_acompanante` varchar(20) · `fecha_ingreso` date · `fecha_salida` date · `estado_fila_validacion` varchar(20) NOT NULL DEFAULT `'pendiente'` (mismo CHECK).

### 8.8 `ticket_transporte_registro` (1:N con `documentos`)

`id` uuid PK · `documento_id` uuid FK → `documentos(id)` (en el SQL actual **sin `ON DELETE CASCADE`**, a diferencia de las otras extensiones; revisar si se agrega) · `fila_numero` smallint · `fecha_ticket` date · `nombre_solicitante` varchar(150) NOT NULL · `nro_ticket` varchar(100) · `ruta` varchar(150) · `tipo_viaje` varchar(12) NOT NULL DEFAULT `'ida'` (CHECK: `ida`, `vuelta`, `ida_vuelta`) · `estado_fila_validacion` varchar(20) NOT NULL DEFAULT `'pendiente'` (mismo CHECK).

### 8.9 Puntos abiertos antes de crear los modelos

1. **`documentos.codigo` no es `UNIQUE`.** RF-04 permite generar o editar el código. Falta definir si debe ser único (y si es por tipo, por fecha o global).
2. **`texto_ocr_tsv` no se llena con ningún trigger.** Hay que decidir si lo actualiza el servicio al guardar `texto_ocr` (`to_tsvector`) o si se agrega un trigger en la base.
3. **`ruta_archivo` es varchar(500), no una URL.** Falta definir el formato de clave en S3/MinIO (por ejemplo `documentos/{tipo}/{codigo}.{ext}`), coherente con RF-04.
4. **Escritura transaccional:** crear `documentos` + su extensión (y filas de grupo familiar) debe ir en una transacción (NFR-01).
5. **`ticket_transporte_registro.documento_id` no tiene `ON DELETE CASCADE`** en el SQL confirmado. Si se quiere el mismo borrado en cascada que las otras extensiones, hay que `ALTER TABLE` (lo aplica la persona a cargo).
6. **Operativo:** la base quedó sin `tipos_documentos` y sin admin. Antes de probar la carga hay que sembrar los 5 tipos y recrear el admin; el agente no escribe en la base.

### 8.10 Módulo alimentario (mapeado, fuera de alcance inmediato)

Las 11 tablas restantes son `ingreso_almacen`, `detalle_ingreso_almacen`, `inventario_almacen_producto`, `inventario_almacen_lote`, `salida_almacen`, `detalle_salida_almacen`, `proveedor`, `recetas`, `receta_insumos`, `planificaciones_menu` y `detalle_planificacion`. Se documentan acá solo para cerrar el mapa de las 20 tablas; no se implementan en esta fase.

Correcciones ya aplicadas en el esquema confirmado:

- `ingreso_almacen`: `CHECK` sobre `tipo_ingreso` (`compra`/`donacion`/`devolucion`/`ajuste`), cantidad fuera de la cabecera, `observaciones` varchar(255).
- `salida_almacen`: `CHECK` inválidos eliminados; la cantidad vive en `detalle_salida_almacen`.
- IDs con `DEFAULT gen_random_uuid()`; `detalle_planificacion` usa `planificacion_id`.
- `receta_insumos.insumo_id` apunta a `inventario_almacen_producto`.
- Precios: USD canónico (`precio_referencia_usd`, `precio_unitario_usd`, `presupuesto_usd`) y `tipo_cambio_bs_usd` por operación (`ingreso_almacen`, `planificaciones_menu`). Se conserva el importe real en bolivianos con `precio_unitario_bs`, `moneda_compra` (`BOB`/`USD`) y `monto_total_bs`. Sin tabla `tipos_cambio`, sin `fuente_tipo_cambio` y sin `capturado_en`.
- `usuarios.ci` nullable y único; `proveedor.telefono` varchar; `tipo_proveedor` eliminado.
- Claves alternas renombradas: `ficha_social_datos_documento_id_unique`, `referencia_social_datos_documento_id_unique`, `inventario_almacen_producto_codigo_unique`, `tipos_documentos_codigo_unique`, `proveedor_ci_nit_unique`, `usuarios_email_unique` y `usuarios_ci_unique`.

Puntos abiertos del alimentario:

- `detalle_ingreso_almacen.fecha_expiracion` es `date`, mientras `inventario_almacen_lote.fecha_expiracion` es `timestamptz`: el mismo dato vive en dos lugares y puede desincronizarse.
- El detalle referencia el lote (`inventario_almacen_lote_id`), así que el lote debe existir antes de insertar el detalle; definir el orden de escritura.
