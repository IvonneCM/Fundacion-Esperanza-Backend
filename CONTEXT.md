# CONTEXT.md — Dónde retomar

## Estado

**Fase 1 de autenticacion COMPLETA: T-01 a T-05 y T-07 hechos y verificados end-to-end contra Neon.** El admin existe en la base y el login devuelve token. T-06 (Jest) queda diferida por la persona a cargo: el alcance del trabajo dirigido pide la documentacion, no las pruebas. El diseño de T-08 ya esta escrito en `design.md` §4b, asi que la proxima sesion arranca implementando, no definiendo.

## Base de datos de desarrollo y pruebas

Una sola base, descartable, en Neon. La persona a cargo decidio no crear `fundacion_test`.

- Host `ep-square-moon-b5xcy9hw-pooler.c-7.us-east-2.aws.neon.tech`, base `neondb`, usuario `neondb_owner`, PostgreSQL 18.6, SSL activo.
- Las 14 tablas del borrador SQL existen. `usuarios` coincide con `design.md` §3 y **tiene 1 fila**: el admin `anita@fundacion.org` (id `29fbbb9c-6d97-46f4-a693-b2627db845fa`, rol `admin`). Las otras 13 siguen en 0 filas.
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

## Siguiente acción concreta

### Lo que tiene que hacer la persona a cargo

1. **Corregir el apellido del admin (SQL).**
   Al crear el admin, `ADMIN_APELLIDO` traia un apostrofo sobrante y quedo guardado como `"Perez"'` (con comilla y apostrofo). El codigo esta bien; el dato esta mal.
   ```sql
   UPDATE usuarios SET apellido = 'Perez' WHERE email = 'anita@fundacion.org';
   ```
2. **Cambiar la contraseña del admin antes de produccion.** Se compartio en texto plano por chat (`anita0709`). En Neon da igual porque la base es descartable, pero si esa misma contrasena llega al VPS hay que rotarla.
3. **Decidir si se protege `/api-docs` o se retira antes de produccion.** Hoy es publico.
4. **Enviar los datos del VPS** si se quiere desbloquear el modulo documental: IP, usuario SSH, metodo de auth, y si Postgres tiene `ports:` en el compose. Ver seccion "Bloqueo actual" mas abajo.

### Lo que hace el agente en la proxima sesion

**T-08 — CRUD de usuarios (`/api/usuarios`), solo admin.**

El diseño ya esta escrito en `design.md` §4b: endpoints, codigos de respuesta y reglas de negocio. **La proxima sesion arranca implementando, no decidiendo.**

- `GET /api/usuarios`, `GET /:id`, `POST`, `PUT /:id`, `PATCH /:id/estado`
- **No hay `DELETE`.** RF-03 pide desactivar, no borrar. Los usuarios tienen datos asociados.
- Aqui se prueba por fin el caso **403 por rol insuficiente**, que quedo pendiente en T-06: es la primera ruta con `validarRol('admin')` de verdad.
- Documentar las rutas nuevas con anotaciones OpenAPI (§4c), si no el swagger se queda a medias.

*Hecho cuando:* un admin puede crear un archivista, y un archivista o visitante recibe 403 en todas esas rutas.

### Despues, en orden

- **T-06 — Jest + Supertest**, cuando la persona a cargo lo pida. Requiere `jest` y `supertest` (no instalados). El proyecto es ESM, asi que Jest necesita `--experimental-vm-modules`. Antes de la primera suite, correr `npm run db:probar` y confirmar en el aviso la base.

## Como arrancar la proxima sesion

Prompt sugerido para opencode:

> Implementa T-08 de tasks.md siguiendo `design.md` §4b y `AGENTS.md`. El diseño ya está decidido, no lo cambies sin preguntar. Documenta las rutas nuevas con anotaciones OpenAPI.

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
- **El agente nunca escribe en la base.** Todo cambio de esquema lo aplica la persona a cargo con `Fundacion_Nuestra_Esperanza_create.sql`, que es la unica fuente de verdad del esquema. El agente solo usa `npm run db:probar`, que es de solo lectura.
- **Roles: `admin` / `archivista` / `visitante`.** Manda `design.md` §2 sobre el texto viejo de `AGENTS.md`.
- **Probar a mano contra la base de desarrollo esta permitido.** La separacion protege a las pruebas automaticas, no al trabajo diario.
- **La region de Neon no se cambia.** Solo sostiene dev y pruebas; produccion esta en el VPS.
- **Sin contrasenas en el repositorio, ni en el spec.** El ejemplo de login usa `{{PASSWORD}}`, que en Postman es una variable de entorno. `design.md` §4 lo exige y se respeta.
- **`validarJWT` devuelve 403 (no 401) si el usuario fue desactivado** despues de emitir el token. Confirmado por la persona a cargo. Coherente con el 403 de "usuario desactivado" del login. Reflejado en `design.md` §4.
- **T-06 (Jest) diferida por decision de la persona a cargo**, porque el alcance del trabajo dirigido de esta parte pide la documentacion de la API, no la suite de pruebas. No es una omision: queda anotado en `tasks.md` con el motivo.
- **T-08 sin `DELETE`:** desactivar es la unica salida. RF-03 pide desactivar, y los usuarios tienen datos asociados (documentos, validaciones OCR) que son datos de salud de menores. Escrito en `design.md` §4b.
- **`swagger-jsdoc` se verifica pidiendo el spec y contando los paths**, no confiando en que "no tira error": si el glob no encuentra los archivos devuelve un spec vacio en silencio.

## Discrepancias abiertas (no tocar sin confirmación)

1. ~~`AGENTS.md` linea 64 vs `design.md` §2~~ — **resuelta**, `AGENTS.md` ya dice `admin` / `archivista` / `visitante`.
2. `AGENTS.md` nombra `almuerzo_datos` y `salida_entrada_datos`; la base tiene `almuerzo_registro` y `salida_entrada_registro`. **La base real le da la razon al SQL, no a `AGENTS.md`.** Por regla 3 de `AGENTS.md` hay que reflejarlo en `design.md` antes de crear los modelos.
3. `config/aws.js` esta vacio y las variables `MINIO_*` del `.env` no las lee ningun modulo.
4. La base tiene 14 tablas del borrador, pero `design.md` solo define `usuarios`. Las otras 13 no tienen respaldo en el diseno.

## Pendientes de seguridad

Recopilados. Los tres primeros son de esta sesion o anteriores; el ultimo viene de antes.

- **`/api-docs` y `/api/docs/swagger.json` estan abiertos, sin autenticacion.** Aceptable en desarrollo. Antes de produccion hay que protegerlos o quitarlos. **No resuelto: sigue abierto.**
- **La contrasena del admin de pruebas (`anita0709`) se compartio en texto plano por chat.** Cambiarla antes de produccion, aunque la base sea descartable.
- **`npm audit` reporta 5 vulnerabilidades**, todas transitivas y de desarrollo: `nodemon` -> `chokidar` -> `braces` (alta), `sequelize` -> `uuid` (moderada). Ninguna es codigo de produccion expuesto. Revisar antes de produccion.
- **`MINIO_ROOT_PASSWORD`** sigue en el `.env` aunque ningun modulo lo lea. Viene de un entorno Docker compartido.
- **VPS (produccion):** `DB_PERMITIR_TEST` debe valer `false` y `NODE_ENV` debe quedar en `production` en el `.env` del servidor. Ninguno de los dos esta automatizado.

## Bloqueo actual: Acceso a VPS (BD real + MinIO) — pendiente de datos SSH

Mientras no recibimos los datos para levantar el túnel SSH, no podemos conectarnos directamente a la BD del VPS ni hacer pruebas end-to-end con archivos de MinIO.

### Estado del bloqueo

- **Error desde laptop:** `getaddrinfo ENOTFOUND ocr_postgres` (el hostname solo existe en la red Docker del VPS).
- **Vía correcta:** Túnel SSH `ssh -L 5432:ocr_postgres:5432 USUARIO_SSH@IP_DEL_VPS` (Opción A) o `ssh -L 5432:localhost:5432 ...` (Opción B). Con el túnel activo, usar `DB_HOST=localhost` y **comentar `DATABASE_URL`** en `.env`.
- **Datos pendientes (pedidos):** IP pública del VPS, Usuario SSH, Método de auth SSH (clave/contraseña). También confirmar si Postgres tiene `ports:` (para elegir A/B).
- **MinIO (documental):** `https://minio.fundacion.cloud`, bucket `documentos-nuestra-esperanza`, usuario `minio_admin`. Necesario para subir/leer archivos (tests/documental end-to-end). No bloquea Fase 1 (auth).

### Nota sobre ambientes

- **Desarrollo/documental (datos reales):** usar túnel SSH + BD del VPS (con `DATABASE_URL` comentado).
- **Pruebas automáticas (Jest):** usar Neon con `NODE_ENV=test` y `DB_PERMITIR_TEST=true` (mantener `DATABASE_URL` activo). Así no tocamos BD real.

### Que queda pendiente del modulo documental

1. **[Solo lectura] Mapear esquema documental** — Leer `Fundacion_Nuestra_Esperanza_create.sql` completo. Detectar discrepancias con `AGENTS.md`/`design.md` (especialmente los nombres de las tablas de extension: `almuerzo_registro` y `salida_entrada_registro` en la base, contra `almuerzo_datos` y `salida_entrada_datos` en `AGENTS.md`). **Registrar la discrepancia en `design.md` antes de crear los modelos** (regla 3 de `AGENTS.md`). Esto no requiere VPS ni MinIO: es solo leer.
2. **Disenar el servicio S3/MinIO** — Esbozar `services/s3.js` y llenar `config/aws.js` (hoy vacio): cliente S3-compatible con `forcePathStyle` hacia `minio.fundacion.cloud:443` con SSL. Se puede escribir sin tener acceso al bucket; probarlo, no.
3. **No hacer end-to-end documental** hasta tener tunel SSH activo y acceso verificado a MinIO. Mantener la separacion clara entre la base de desarrollo (VPS via tunel) y la de pruebas (Neon).

La Fase 1 de autenticacion (T-03 a T-05 y T-07) ya no esta en esta lista: esta terminada.

## Notas

- `.env` esta en `.gitignore`, no se versiona. Los cambios del working tree siguen sin commitear.
- Instaladas: express, cors, dotenv, pg, sequelize, nodemon, bcryptjs, jsonwebtoken, express-validator, swagger-jsdoc, swagger-ui-express. **Faltan:** jest y supertest (para T-06, diferida).
- `validar-jwt.js` ya esta implementado y devuelve **403** cuando el usuario del token fue desactivado (no 401). Decision confirmada por la persona a cargo. Coherente con el 403 de "usuario desactivado" del login.
- Todo middleware que lea `req.usuario` responde 401 si no existe (`design.md` §4).
- El middleware de roles es `validarRol`, no `validarPermiso`.
- En `scripts/probar-conexion.js` usar siempre `QueryTypes.SELECT`: `sequelize.query()` sin tipo devuelve `[filas, metadatos]`, y desestructurar una sola vez da el array de filas, no la fila.
- `models/Usuario.js` usa `defaultScope` que **excluye `password_hash`**, mas un scope `conPassword` que lo incluye. El login usa `Usuario.scope('conPassword')`. Ninguna respuesta expone el hash (verificado en `/login` y `/perfil`).
- `npm run admin:crear` es idempotente: si el email ya existe no crea nada. Acepta argumentos o variables `ADMIN_*` (la variable es mejor: no deja la contrasena en el historial).
- **Ninguna contrasena se escribe en el repositorio.** El ejemplo del spec usa `{{PASSWORD}}` (variable de entorno de Postman). `design.md` §4 lo exige.

## Cierre de sesion (2026-10-05)

Se completo la Fase 1 de autenticacion. **No se hizo commit:** todo esta en el working tree, para que la persona a cargo lo revise antes de versionarlo. Los archivos nuevos son `config/swagger.js`, `controllers/auth.js`, `models/Usuario.js`, `routes/auth.js`, `scripts/crear-admin.js` y `utils/token.js`.
