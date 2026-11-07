# CONTEXT.md — Dónde retomar

## Estado

**Fase 1 de autenticacion COMPLETA: T-01 a T-05 y T-07 hechos y verificados end-to-end contra Neon.** El admin existio y el login devolvio token. **T-08 (CRUD de usuarios, solo admin) implementada.** Jest/Supertest (T-06 y T-09) quedan **pospuestos hasta despues de terminar todo el proyecto**, por decision de la persona a cargo: no son prioridad ahora.

**2026-11-06: la base de Neon fue recreada con el esquema candidato `Fundacion_Nuestra_Esperanza.sql` (20 tablas).** Al recrearla se perdieron los usuarios. Verificado con `npm run db:probar`: 20 tablas, `usuarios` con 0 filas y `tipos_documentos` con 0 filas. **Falta sembrar los 5 tipos de documento y recrear el admin.**

## Base de datos de desarrollo y pruebas

Una sola base, descartable, en Neon. La persona a cargo decidio no crear `fundacion_test`.

- Host `ep-square-moon-b5xcy9hw-pooler.c-7.us-east-2.aws.neon.tech`, base `neondb`, usuario `neondb_owner`, PostgreSQL 18.6, SSL activo.
- Las **20 tablas** del esquema candidato `Fundacion_Nuestra_Esperanza.sql` existen. Al 2026-11-06: `usuarios` **0 filas** (falta recrear el admin) y `tipos_documentos` **0 filas** (falta el seed de los 5 tipos). Las demás tablas están en 0 filas. `usuarios` coincide con `design.md` §3 (incluida `ci` nullable y `usuarios_ci_unique`).
- `DB_PERMITIR_TEST=true` en el `.env`. Verificado que el flag esta bien cableado: en `false` el guard bloquea, en `true` deja pasar.
- `npm run db:probar` lista los objetos del schema `public` y el detalle de `usuarios` (columnas y restricciones). Solo hace `SELECT`.
- **La region `us-east-2` (Ohio) se queda asi.** Produccion vive en el VPS, no en Neon; los saltos de latencia no afectan a nadie. Decision cerrada, no volver a abrirla.

## Base de datos del VPS (produccion)

- Las credenciales ya estan en el `.env`: `DB_HOST=ocr_postgres`, `DB_PORT=5432`, `DB_DATABASE=fundacion_nuestra_esperanza`, `DB_USERNAME=postgres`.
- `ocr_postgres` es un **nombre de servicio de Docker Compose**: solo resuelve dentro de la red de Docker del VPS. Desde Windows da `ENOTFOUND`, y por eso `config/database.js` no se puede probar tal cual desde la laptop.
- El esquema ya esta desplegado ahi. No hay archivos de despliegue en el repo (sin `Dockerfile`, sin `docker-compose.yml`).

## Hecho

- `app.js` / `server.js` separados. `app.js` crea y exporta la app; `server.js` solo hace `listen`. Verificado: importar `app.js` no abre puerto, asi que Supertest podra usarla en T-06.
- `routes/salud.js` con `GET /health`, montado en `/api` → `/api/health`.
- `server.js` llama a `conectar()` al arrancar dentro de un `catch`, para que la base caida no tumbe el servidor. Verificado: `/api/health` responde 200 aunque la base no exista.
- `middlewares/validar-rol.js` con `validarRol(...rolesPermitidos)`. 401 si no hay `req.usuario`, 403 si el rol no esta en la lista.
- Borrado `middlewares/validar-permiso.js` (estaba vacio).
- `config/database.js`: lee `DATABASE_URL` si existe (Neon, con `sslmode=require`), si no arma la conexion con `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD`. Exporta `sequelize` y `conectar()`. El guard detiene las pruebas si `NODE_ENV=test` apunta a una base cuyo nombre no contiene `test`, salvo que `DB_PERMITIR_TEST=true`.
- `utils/redactar-conexion.js`: arma el resumen de conexion con la contraseña redactada, desde `DATABASE_URL` o desde las variables separadas.
- `scripts/probar-conexion.js` (`npm run db:probar`): imprime host, puerto, base, usuario, SSL, version de PostgreSQL, objetos del schema `public` y el detalle de `usuarios`. **Nunca imprime la contraseña.** Con `NODE_ENV=test` imprime un aviso destacado con la base a la que van a pegarle las pruebas.
- **Borrado `scripts/inicializar-base.js` y el script `db:inicializar`.** Escribia en la base, duplicaba el SQL, y cubria solo 1 de las 14 tablas. Ver "Cambios en la base de datos" en `AGENTS.md`.
- `.env.example` con placeholders, documentando Neon, las variables separadas y `DB_PERMITIR_TEST`.
- `AGENTS.md`: seccion "Secretos" (prohibe leer o imprimir el `.env`) y seccion "Cambios en la base de datos" (**el agente lee, la persona a cargo escribe**).
- `AGENTS.md`: roles corregidos a `admin` / `archivista` / `visitante` (discrepancia 1 resuelta).
- `design.md` §5: un solo `.env`, una sola base descartable, `DB_PERMITIR_TEST` documentado.

### T-03 a T-05 (autenticacion)

- `models/Usuario.js`: 8 campos del DDL de `design.md` §3, `timestamps: false`, `defaultScope` que excluye `password_hash` y scope `conPassword` que lo incluye, `validate.isIn` con los 3 roles.
- `scripts/crear-admin.js` (`npm run admin:crear`): lee argumentos o `ADMIN_*`, normaliza el email, es idempotente, bcrypt costo 10, nunca imprime la contrasena.
- `middlewares/validar-campos.js`: envuelve `validationResult` de `express-validator`; 400 con `{ ok, msg, errores: [{ campo, mensaje }] }`.
- `utils/token.js`: firma y verifica JWT, payload `{ uid, rol }`, 8 horas. Falla ruidosamente si `JWT_SECRET` sigue en `cambiar_esto`.
- `controllers/auth.js`: `login` (401 con el mismo mensaje para email inexistente y contrasena incorrecta; 403 si esta desactivado) y `perfil`.
- `middlewares/validar-jwt.js`: exige `Authorization: Bearer`, verifica el token, busca el usuario, y responde 403 si fue desactivado.
- `routes/auth.js`: `POST /api/auth/login` (publico) y `GET /api/auth/perfil` (cualquier rol autenticado), montados en `/api/auth`.

### T-07 (documentacion, NFR-04)

- `config/swagger.js`: OpenAPI 3.0.3, esquemas `Usuario`, `Error`, `ErrorValidacion`, esquema de seguridad `bearerAuth`. El glob es `./routes/*.js`.
- Anotaciones `@openapi` sobre las dos rutas de `routes/auth.js`.
- `app.js` monta `GET /api/docs/swagger.json` y Swagger UI en `/api-docs`.
- **Verificado:** el spec devuelve 200 con los 2 paths, 3 esquemas, y `security: [bearerAuth]` en `/perfil`. Swagger UI responde 200 con el HTML de la interfaz.
- **Verificado end-to-end contra Neon:** login 200 con token, `/perfil` 200 con rol `admin`, token invalido 401, email mal formado 400. `password_hash` **no aparece** en ninguna respuesta.

### T-08 (gestion de usuarios, RF-03)

- `controllers/usuarios.js`: `getUsuarios`, `getUsuario`, `crearUsuario`, `actualizarUsuario`, `cambiarEstado`. Todos con `try/catch` y respuesta `{ ok, msg, error? }`.
- `routes/usuarios.js`: `router.use(validarJWT, validarRol('admin'))` aplica a las 5 rutas. Cadenas `express-validator` + `validarCampos` + anotaciones `@openapi`.
- `utils/usuario-publico.js`: `usuarioPublico(usuario)` → `{ id, nombre, apellido, email, rol, activo, creado_en }`. Se usa en las respuestas de gestion; el hash nunca sale.
- `app.js` monta `/api/usuarios`.
- `config/swagger.js`: tag `Usuarios` y esquemas `UsuarioAdmin`, `UsuarioCrear`, `UsuarioEditar`, `UsuarioEstado`.
- **Filtros y paginacion de `GET /api/usuarios`** (reflejados en `design.md` §4b): `?rol=`, `?activo=`, `?buscar=` (ILIKE en nombre/apellido/email), `?pagina=` (default 1) y `?limite=` (default 20, maximo 100). Orden fijo `creado_en DESC`. `total` es el conteo antes de paginar.
- **Verificado end-to-end contra Neon:** crear archivista 201, email duplicado 409, falta de password 400, auto-degradacion del admin 400, auto-desactivacion del admin 400, archivista recibe **403** en las 5 rutas, editar 200, email a uno usado 409, desactivar/reactivar 200, id inexistente 404. La lista no expone `password_hash`.

### T-11 (servicio S3/MinIO)

- `config/aws.js`: lee `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE` y `S3_USE_SSL`. Con `S3_ENDPOINT` vacío usa AWS real; con endpoint y `S3_FORCE_PATH_STYLE=true` sirve para MinIO en el VPS. Falla ruidosamente si falta región o bucket.
- `services/s3.js`: `subirArchivo`, `obtenerUrlFirmada` (1 hora), `existeArchivo` y `eliminarArchivo`. Los controladores no tocan el SDK.
- **Verificado contra AWS S3 real (`us-east-2`):** `HeadBucket` devolvió 200. Las credenciales están solo en el `.env`.
- **Decisión de precios:** USD canónico (`precio_referencia_usd`, `precio_unitario_usd`, `presupuesto_usd`) y tipo de cambio guardado por operación (`ingreso_almacen.tipo_cambio_bs_usd`, `planificaciones_menu.tipo_cambio_bs_usd`). Se agregaron `precio_unitario_bs`, `moneda_compra` y `monto_total_bs` para conservar el importe real en bolivianos. Sin tabla `tipos_cambio`, sin `fuente_tipo_cambio` y sin `capturado_en`: la fecha de la operación alcanza.
- **Precio por día:** no se guarda un precio histórico aparte. Cada compra crea su `detalle_ingreso_almacen` y su `inventario_almacen_lote` con el precio USD de ese día; la historia se reconstruye desde las operaciones.

## Siguiente acción concreta

### Lo que tiene que hacer la persona a cargo

1. **Rotar la contraseña del admin al finalizar el proyecto.** Se compartio en texto plano por chat (`anita0709`). En Neon da igual porque la base es descartable, pero antes de produccion hay que cambiarla. **Pospuesto por decision de la persona a cargo: se hace al cerrar el trabajo del proyecto, no ahora.**
2. **Datos del VPS: no disponibles por ahora.** Decision: no bloquear el modulo documental por eso. Se trabaja con **S3 + MinIO temporal** y la base **Neon** hasta llegar a produccion; el tunel SSH y la base del VPS quedan para el final.
3. **`/api-docs` se protege** (decision tomada) y la documentacion generada no debe quedar publicada en GitHub. Se implementa cuando se toque ese frente; anotado en "Pendientes de seguridad".
4. **Esquema confirmado y base recreada (2026-11-06).** `Fundacion_Nuestra_Esperanza.sql` (20 tablas) es la fuente de verdad; `_create.sql` quedó obsoleto. **Falta que la persona a cargo siembre `tipos_documentos` con los 5 tipos y recree el admin con `npm run admin:crear`.** El agente no ejecuta `CREATE`/`DROP`/`INSERT`: solo verifica con `npm run db:probar` (lectura).

### Lo que hace el agente en la proxima sesion

**Modelos documentales creados (T-12).** `design.md` §8 describe las 20 tablas reales; `config/aws.js` + `services/s3.js` están implementados y verificados (T-11); y ya existen `TipoDocumento`, `Documento` y las 6 extensiones con sus asociaciones en `models/index.js`. **Verificado:** los 9 modelos cargan y coinciden con las columnas reales (se omite `texto_ocr_tsv` a propósito). **`multer@2.5.0` ya está instalado** (lo instaló la persona a cargo). El siguiente paso es **proponer las rutas del documental en `design.md`** (método, path, roles y respuestas) y luego implementar `GET /api/documentos/tipos` y `POST /api/documentos` con multer + S3 + estado OCR pendiente.

Ver `tasks.md` para el detalle de cada tarea.

### Despues, en orden

- **Modulo documental:** modelos Sequelize de las tablas documentales, servicio S3/MinIO, carga de archivos, Textract, validacion y busqueda. Se detalla en `tasks.md` a medida que se cierre cada diseno.
- **T-06 y T-09 — Jest + Supertest**, **pospuestas hasta despues de terminar todo el proyecto.** No son prioridad ahora (decision de la persona a cargo). Requieren `jest` y `supertest` (no instalados). El proyecto es ESM, asi que Jest necesita `--experimental-vm-modules`. Antes de la primera suite, correr `npm run db:probar` y confirmar en el aviso la base.

## Como arrancar la proxima sesion

Prompt sugerido para opencode:

> Arranca la sesion siguiente segun `CONTEXT.md` (seccion "Lo que hace el agente en la proxima sesion"). Si es el mapeo documental, es solo lectura: lee `Fundacion_Nuestra_Esperanza_create.sql` y registra las discrepancias en `design.md` antes de crear modelos.

## Como usar la documentacion y Postman

1. Levantar el servidor: `npm run dev`.
2. Swagger UI (interactivo, con boton "Try it out"): `http://localhost:3000/api-docs`.
3. El spec, para importar en Postman: `http://localhost:3000/api/docs/swagger.json`.
4. En Postman: **Import -> Link**, pegar esa URL. Postman crea la coleccion con los endpoints, cuerpos y esquemas.
5. En Postman, la contrasena se maneja con una **variable de entorno**: crear el entorno, definir `PASSWORD` con el valor real, y en el body del login dejar `"password": "{{PASSWORD}}"`. Asi la contrasena nunca se escribe en el spec ni en un archivo del repo.
6. Para que las rutas protegidas usen el token: en la pestana **Tests** del request `POST /api/auth/login` agregar:
   ```js
   pm.environment.set("token", pm.response.json().token);
   ```
   y en `GET /api/auth/perfil` poner el header `Authorization: Bearer {{token}}`.

**La coleccion de Postman es una copia, no un flujo.** Postman no vuelve a leer el spec. Cuando cambie una ruta hay que re-importar el link; si no, la coleccion queda desactualizada sin avisar. El spec si se regenera solo en cada request.

## V-02 — Conectar a la base del VPS (bloqueada, faltan datos)

Para leer la base del VPS desde la laptop hacen falta dos cambios en el `.env` y un tunel. **La persona a cargo los ejecuta; el agente propone y explica.**

1. **Comentar `DATABASE_URL` en el `.env`.** Es obligatorio: `config/database.js:31` le da prioridad sobre todas las variables separadas. Si queda definida, se sigue viendo Neon.
2. **Cambiar `DB_HOST=ocr_postgres` por `localhost`.** El nombre de Docker no resuelve fuera del VPS.
3. **Levantar el tunel SSH** y apuntar `DB_PORT` al puerto local del tunel. Postgres queda accesible solo por tunel, no expuesto a internet, que es lo correcto para datos de salud de menores.
4. `npm run db:probar` para confirmar.

**Datos que faltan y que solo tiene la persona a cargo:**

- IP o hostname del VPS.
- Usuario SSH.
- Si el puerto 5432 esta publicado en el `docker-compose.yml` del VPS. Si el servicio de Postgres no tiene `ports:`, el tunel a `localhost:5432` no llega y hay que apuntar al contenedor (`docker compose ps` lo muestra).
- Si hay clave SSH disponible. La carpeta `.ssh` de la maquina tiene `config` y `known_hosts` pero **ninguna clave privada**. Si la clave esta en un agente o se usa contraseña, el tunel funciona igual.

Alternativa sin tunel: `docker compose exec` en el VPS, donde `ocr_postgres` si resuelve. Sirve para confirmar que la base esta viva, aunque no prueba el codigo de la laptop.

## Decisiones tomadas en esta sesión

- **Un solo `.env`, sin `.env.test`.** La persona a cargo cambia `DATABASE_URL` a mano segun el ambiente. Reflejado en `design.md` §5 y `AGENTS.md`.
- **Una sola base de datos, descartable.** No se crea `fundacion_test`: `neondb` sirve para desarrollo y pruebas mientras tanto. Perdio su estado vacio: ya tiene el admin. Sigue siendo desechable.
- **`DB_PERMITIR_TEST=true` habilita correr pruebas contra cualquier base**, sin exigir que el nombre contenga `test`. El guard anterior (chequear el nombre) era una heuristica weak: daba sensacion de seguridad sin darla, porque una base de produccion llamada `neondb_test` habria pasado el filtro. El flag invierte la logica: bloquea por defecto y exige una declaracion explicita para desactivarlo. En produccion debe ser `false`.
- **El agente nunca escribe en la base.** Todo cambio de esquema lo aplica la persona a cargo con `Fundacion_Nuestra_Esperanza.sql` (20 tablas, confirmado 2026-11-06), que es la unica fuente de verdad del esquema. `Fundacion_Nuestra_Esperanza_create.sql` quedó obsoleto. El agente solo usa `npm run db:probar`, que es de solo lectura.
- **Roles: `admin` / `archivista` / `visitante`.** Manda `design.md` §2 sobre el texto viejo de `AGENTS.md`.
- **Probar a mano contra la base de desarrollo esta permitido.** La separacion protege a las pruebas automaticas, no al trabajo diario.
- **La region de Neon no se cambia.** Solo sostiene dev y pruebas; produccion esta en el VPS.
- **Sin contrasenas en el repositorio, ni en el spec.** El ejemplo de login usa `{{PASSWORD}}`, que en Postman es una variable de entorno. `design.md` §4 lo exige y se respeta.
- **`validarJWT` devuelve 403 (no 401) si el usuario fue desactivado** despues de emitir el token. Confirmado por la persona a cargo. Coherente con el 403 de "usuario desactivado" del login. Reflejado en `design.md` §4.
- **T-06 y T-09 (Jest + Supertest) pospuestas hasta despues de terminar todo el proyecto**, por decision de la persona a cargo. No son prioridad ahora: la suite se escribe cuando el sistema este completo. Queda anotado en `tasks.md`.
- **T-08 sin `DELETE`:** desactivar es la unica salida. RF-03 pide desactivar, y los usuarios tienen datos asociados (documentos, validaciones OCR) que son datos de salud de menores. Escrito en `design.md` §4b.
- **`GET /api/usuarios` con filtros y paginacion** (`?rol=`, `?activo=`, `?buscar=`, `?pagina=`, `?limite=`). La persona a cargo pidio filtros; el diseno se amplio en `design.md` §4b antes de implementar (regla de `AGENTS.md`). `?buscar=` usa `ILIKE` en nombre, apellido y email.
- **`swagger-jsdoc` se verifica pidiendo el spec y contando los paths**, no confiando en que "no tira error": si el glob no encuentra los archivos devuelve un spec vacio en silencio.
- **El usuario de prueba de T-08 ya fue borrado.** No queda SQL pendiente por ese lado; `usuarios` tiene solo el admin.
- **El apellido del admin (`"Perez"'`) no se corrige:** la persona a cargo decidio que no es necesario y no es un problema.
- **La rotacion de la contrasena del admin se hace al finalizar el trabajo del proyecto**, no ahora.
- **`/api-docs` se protege y no se publica en GitHub.** La documentacion generada no debe quedar expuesta publicamente. Implementacion pendiente.
- **Sin datos del VPS, se avanza con S3 + MinIO temporal y Neon.** No se espera al tunel SSH para el modulo documental; la base y MinIO del VPS se conectan recien en produccion.
- **El frontend ya existe y esta probado:** repositorio `Fundacion-Esperanza-Fronend` (sic), con F-01 a F-03 resueltas. No se crea un repositorio nuevo desde el backend.

## Discrepancias abiertas (no tocar sin confirmación)

1. ~~`AGENTS.md` linea 64 vs `design.md` §2~~ — **resuelta**, `AGENTS.md` ya dice `admin` / `archivista` / `visitante`.
2. ~~`AGENTS.md` nombra `almuerzo_datos` / `salida_entrada_datos` y la base tiene `almuerzo_registro` / `salida_entrada_registro`~~ — **resuelta:** manda el SQL. `design.md` §8 lo documenta y `AGENTS.md` ya usa los nombres reales.
3. ~~`config/aws.js` esta vacio y las variables `MINIO_*` del `.env` no las lee ningun modulo~~ — **resuelta:** T-11 implementado y verificado contra AWS S3 (`us-east-2`). MinIO del VPS se conecta cambiando `S3_ENDPOINT` y `S3_FORCE_PATH_STYLE`.
4. ~~La base tiene 14 tablas y `design.md` solo define `usuarios`~~ — **resuelta:** las 20 tablas están mapeadas en `design.md` §8, ya actualizado al esquema confirmado.
5. ~~`documentos.usuario_validacion_id` es `NOT NULL`~~ — **resuelta en el candidato y en la base:** ya es nullable, asi que se puede crear el documento pendiente de validacion.
6. ~~`entrada_inventario` / `salida_inventario` con `CHECK` sobre `tipo`~~ — **resuelta en el candidato:** las tablas son `ingreso_almacen` / `salida_almacen` y los CHECK ya no apuntan a una columna inexistente. Verificado en la base real.
7. **`documentos.codigo` es `NOT NULL` pero no `UNIQUE`**, y RF-04 permite editar el codigo. Falta decidir si debe ser unico por tipo/fecha.
8. **`texto_ocr_tsv` (tsvector) tiene indice GIN pero nada lo llena:** no hay trigger en el SQL. La busqueda de texto completo (RF-09) necesita decidir si se actualiza desde el servicio o con trigger.
9. **`Fundacion_Nuestra_Esperanza.sql` (2026-11-06) es la version candidata mas reciente** y ya fue corregida: CHECK invalidos, IDs sin default, `receta_insumos` apuntando a producto, un solo `tipos_documentos_id`, `usuario_validacion_id` nullable, cantidades solo en el detalle, tipos numericos de precio/tipo de cambio, `ci` nullable, `tipo_proveedor` eliminado y campos de bolivianos agregados. **La base de Neon ya fue recreada con este archivo.** Falta la confirmacion formal para reemplazar a `_create.sql` y actualizar `AGENTS.md` y `design.md` §8. El archivo está en `.gitignore`, como el anterior.

## Pendientes de seguridad

Recopilados. Los tres primeros son de esta sesion o anteriores; el ultimo viene de antes.

- **`/api-docs` y `/api/docs/swagger.json` estan abiertos, sin autenticacion.** **Decision tomada: se protegen** (y la documentacion generada no se publica en GitHub). Implementacion pendiente; sigue abierto hasta entonces.
- **La contrasena del admin de pruebas (`anita0709`) se compartio en texto plano por chat.** **Se rota al finalizar el trabajo del proyecto**, no ahora (decision de la persona a cargo).
- **`npm audit` reporta 5 vulnerabilidades**, todas transitivas y de desarrollo: `nodemon` -> `chokidar` -> `braces` (alta), `sequelize` -> `uuid` (moderada). Ninguna es codigo de produccion expuesto. Revisar antes de produccion.
- **`MINIO_ROOT_PASSWORD`** sigue en el `.env` aunque ningun modulo lo lea. Viene de un entorno Docker compartido.
- **VPS (produccion):** `DB_PERMITIR_TEST` debe valer `false` y `NODE_ENV` debe quedar en `production` en el `.env` del servidor. Ninguno de los dos esta automatizado.

## Acceso a VPS — pospuesto (no bloquea el documental)

**Decision:** no hay datos del VPS por ahora y no se espera a tenerlos. El modulo documental avanza con **S3 + MinIO temporal** y la base **Neon** hasta produccion. El tunel SSH y la base del VPS quedan para el final.

### Estado

- **Error desde laptop si se usa la config del VPS:** `getaddrinfo ENOTFOUND ocr_postgres` (el hostname solo existe en la red Docker del VPS).
- **Via futura:** tunel SSH `ssh -L 5432:ocr_postgres:5432 USUARIO_SSH@IP_DEL_VPS` (Opcion A) o `ssh -L 5432:localhost:5432 ...` (Opcion B). Con el tunel activo, `DB_HOST=localhost` y **comentar `DATABASE_URL`**. No ejecutar ahora.
- **Datos que siguen faltando (no urgentes):** IP publica del VPS, usuario SSH, metodo de auth SSH, y si Postgres tiene `ports:` (para elegir A/B).
- **MinIO temporal:** se usara `https://minio.fundacion.cloud`, bucket `documentos-nuestra-esperanza`, usuario `minio_admin` como entorno de trabajo hasta produccion.

### Nota sobre ambientes

- **Desarrollo/documental:** S3 + MinIO temporal y Neon (`DATABASE_URL` activo). No se requiere tunel SSH.
- **Pruebas automaticas (Jest):** Neon con `NODE_ENV=test` y `DB_PERMITIR_TEST=true`.
- **Produccion:** base y MinIO del VPS; rotar credenciales y `DB_PERMITIR_TEST=false` (ver "Pendientes de seguridad").

### Que queda pendiente del modulo documental

1. ~~**[Solo lectura] Mapear esquema documental**~~ — **hecho:** `design.md` §8.
2. **Disenar y proponer el servicio S3/MinIO** (`config/aws.js` + `services/s3.js`): cliente S3-compatible con `forcePathStyle` y SSL hacia MinIO temporal. **Esperar confirmacion antes de escribir codigo.**
3. **Modelos Sequelize documentales** y endpoints de carga/OCR/validacion/busqueda, despues de cerrar los puntos abiertos de `design.md` §8 (sobre todo `usuario_validacion_id`).

La Fase 1 de autenticacion (T-03 a T-05 y T-07) y T-08 (gestion de usuarios) ya no estan en esta lista: estan terminadas.

## Notas

- `.env` esta en `.gitignore`, no se versiona. Los cambios del working tree siguen sin commitear.
- Instaladas: express, cors, dotenv, pg, sequelize, nodemon, bcryptjs, jsonwebtoken, express-validator, swagger-jsdoc, swagger-ui-express. **Faltan:** jest y supertest (para T-06/T-09, pospuestas hasta el final del proyecto).
- `validar-jwt.js` ya esta implementado y devuelve **403** cuando el usuario del token fue desactivado (no 401). Decision confirmada por la persona a cargo. Coherente con el 403 de "usuario desactivado" del login.
- Todo middleware que lea `req.usuario` responde 401 si no existe (`design.md` §4).
- El middleware de roles es `validarRol`, no `validarPermiso`.
- En `scripts/probar-conexion.js` usar siempre `QueryTypes.SELECT`: `sequelize.query()` sin tipo devuelve `[filas, metadatos]`, y desestructurar una sola vez da el array de filas, no la fila.
- `models/Usuario.js` usa `defaultScope` que **excluye `password_hash`**, mas un scope `conPassword` que lo incluye. El login usa `Usuario.scope('conPassword')`. Ninguna respuesta expone el hash (verificado en `/login` y `/perfil`).
- `npm run admin:crear` es idempotente: si el email ya existe no crea nada. Acepta argumentos o variables `ADMIN_*` (la variable es mejor: no deja la contrasena en el historial).
- **Ninguna contrasena se escribe en el repositorio.** El ejemplo del spec usa `{{PASSWORD}}` (variable de entorno de Postman). `design.md` §4 lo exige.

## Cierre de sesion (2026-10-05)

Se completo la Fase 1 de autenticacion. **No se hizo commit:** todo esta en el working tree, para que la persona a cargo lo revise antes de versionarlo. Los archivos nuevos son `config/swagger.js`, `controllers/auth.js`, `models/Usuario.js`, `routes/auth.js`, `scripts/crear-admin.js` y `utils/token.js`.

## Cierre de sesion (T-08)

Se completo la Fase 2 (gestion de usuarios): **T-08 implementada y verificada end-to-end contra Neon.** Archivos nuevos de esta sesion: `controllers/usuarios.js`, `routes/usuarios.js`, `utils/usuario-publico.js`. Modificados: `app.js` (monta `/api/usuarios`), `config/swagger.js` (tag `Usuarios` + 4 esquemas), `design.md` §4b (filtros y paginacion), `tasks.md` (T-08 hecha; T-06 y T-09 pospuestas).

- **No se hizo commit.** Todo queda en el working tree para revision.
- **Archivista de prueba `prueba.t08@fundacion.org`: ya borrado** con SQL por la persona a cargo.
- **Jest/Supertest (T-06, T-09) pospuestas hasta terminar todo el proyecto**, a pedido de la persona a cargo.

## Cierre de sesion (mapeo documental)

Se actualizaron las decisiones de la persona a cargo y se completo el mapeo de solo lectura del esquema documental (`design.md` §8). No se creo codigo ni se toco la base. Archivos modificados: `CONTEXT.md`, `tasks.md`, `design.md`, `AGENTS.md` (nombres reales de tablas).

- **Pendiente inmediato:** proponer `config/aws.js` + `services/s3.js` y esperar confirmacion antes de escribir codigo.
- **Decisiones registradas:** usuario de prueba borrado, apellido del admin no se corrige, rotacion de contrasena al final, `/api-docs` se protege, MinIO temporal + Neon hasta produccion, frontend ya probado en `Fundacion-Esperanza-Fronend`.

## Cierre de sesion (T-12 y esquema confirmado, 2026-11-06)

Se cerro el esquema y se crearon los modelos del modulo documental.

- **Esquema confirmado:** `Fundacion_Nuestra_Esperanza.sql` (20 tablas) es la fuente de verdad; `_create.sql` quedo obsoleto. La base Neon fue recreada y verificada con `npm run db:probar`: 20 tablas, sin constraints duplicados, `ticket_transporte_registro` presente, `documentos.usuario_validacion_id` nullable y las columnas de precios/tipo de cambio correctas.
- **Pendiente operativo en la base:** `tipos_documentos` sigue con 0 filas y `usuarios` con 0 filas. Antes de probar la carga hay que sembrar los 5 tipos y recrear el admin. El agente no escribe en la base.
- **T-12 hecha:** se crearon `models/TipoDocumento.js`, `models/Documento.js`, `models/FichaSocialDatos.js`, `models/FichaSocialGrupoFamiliar.js`, `models/ReferenciaSocialDatos.js`, `models/AlmuerzoRegistro.js`, `models/SalidaEntradaRegistro.js`, `models/TicketTransporteRegistro.js` y `models/index.js` con las asociaciones. Se agrego `ci` a `models/Usuario.js`.
- **Verificacion:** los 9 modelos cargan y sus atributos coinciden con las columnas reales. Unica omision deliberada: `documentos.texto_ocr_tsv` (sin tipo `TSVECTOR` en Sequelize; se usara SQL crudo para RF-09).
- **Dependencia:** `multer@2.5.0` instalado por la persona a cargo. No se uso todavia.
- **Documentos actualizados:** `design.md` §8 (esquema de 20 tablas), `AGENTS.md` (fuente de verdad y tablas documentales), `tasks.md` (T-12) y este `CONTEXT.md`.
- **No se hizo commit.** Todo queda en el working tree para revision.

**Proxima accion concreta:** definir en `design.md` las rutas documentales y arrancar por `GET /api/documentos/tipos` y `POST /api/documentos` (multer + `services/s3.js`).
