# CONTEXT.md — Dónde retomar

## Estado

**Conexion a Neon verificada y funcionando. T-01 y T-02 completados. Las pruebas automaticas ya pueden correr contra `neondb` con `DB_PERMITIR_TEST=true`.** Listo para T-03.

## Base de datos de desarrollo y pruebas

Una sola base, descartable, en Neon. La persona a cargo decidio no crear `fundacion_test`.

- Host `ep-square-moon-b5xcy9hw-pooler.c-7.us-east-2.aws.neon.tech`, base `neondb`, usuario `neondb_owner`, PostgreSQL 18.6, SSL activo.
- Las 14 tablas del borrador SQL existen, **todas en 0 filas**. `usuarios` coincide con `design.md` §3.
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

## Siguiente acción concreta

1. **T-03** — `models/Usuario.js` (UUID, un campo por linea, `timestamps: false` salvo confirmacion) y `scripts/crear-admin.js` con `bcryptjs`. Requiere instalar `bcryptjs` (ya aprobada).
   *Hecho cuando:* el script crea un admin, ejecutarlo de nuevo no lo duplica, y en la base el `password_hash` no es la contraseña en texto plano.
   **Ojo:** el script escribe en la base. Se permite porque lo ejecuta la persona a cargo, no el agente. El SQL lo aplica quien lo corre.
2. **T-04** — `controllers/auth.js`, `routes/auth.js` y `validarCampos`, con los codigos de `design.md` §4. Requiere `jsonwebtoken` y `express-validator` (ya aprobadas).
3. **T-05** — `validarJWT` y `GET /api/auth/perfil`.
4. **T-06** — Jest + Supertest. Antes de la primera suite, correr `npm run db:probar` y confirmar en el aviso que la base de pruebas es la correcta.

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
- **Una sola base de datos, descartable.** No se crea `fundacion_test`: `neondb` esta vacia y sirve para desarrollo y pruebas mientras tanto.
- **`DB_PERMITIR_TEST=true` habilita correr pruebas contra cualquier base**, sin exigir que el nombre contenga `test`. El guard anterior (chequear el nombre) era una heuristica weak: daba sensacion de seguridad sin darla, porque una base de produccion llamada `neondb_test` habria pasado el filtro. El flag invierte la logica: bloquea por defecto y exige una declaracion explicita para desactivarlo. En produccion debe ser `false`.
- **El agente nunca escribe en la base.** Todo cambio de esquema lo aplica la persona a cargo con `Fundacion_Nuestra_Esperanza_create.sql`, que es la unica fuente de verdad del esquema. El agente solo usa `npm run db:probar`, que es de solo lectura.
- **Roles: `admin` / `archivista` / `visitante`.** Manda `design.md` §2 sobre el texto viejo de `AGENTS.md`.
- **Probar a mano contra la base de desarrollo esta permitido.** La separacion protege a las pruebas automaticas, no al trabajo diario.
- **La region de Neon no se cambia.** Solo sostiene dev y pruebas; produccion esta en el VPS.

## Discrepancias abiertas (no tocar sin confirmación)

1. ~~`AGENTS.md` linea 64 vs `design.md` §2~~ — **resuelta**, `AGENTS.md` ya dice `admin` / `archivista` / `visitante`.
2. `AGENTS.md` nombra `almuerzo_datos` y `salida_entrada_datos`; la base tiene `almuerzo_registro` y `salida_entrada_registro`. **La base real le da la razon al SQL, no a `AGENTS.md`.** Por regla 3 de `AGENTS.md` hay que reflejarlo en `design.md` antes de crear los modelos.
3. `config/aws.js` esta vacio y las variables `MINIO_*` del `.env` no las lee ningun modulo.
4. La base tiene 14 tablas del borrador, pero `design.md` solo define `usuarios`. Las otras 13 no tienen respaldo en el diseno.

## Pendientes de seguridad

- **`MINIO_ROOT_PASSWORD`** sigue en el `.env` aunque ningun modulo lo lea. Viene de un entorno Docker compartido.
- Cuando exista produccion, `DB_PERMITIR_TEST` debe valer `false` y `NODE_ENV` debe quedar en `production` en el `.env` del servidor. Ninguno de los dos esta automatizado.

## Notas

- `.env` esta en `.gitignore`, no se versiona. Los cambios del working tree siguen sin commitear.
- Instaladas a hoy: express, cors, dotenv, pg, sequelize, nodemon. Faltan bcryptjs, jsonwebtoken, express-validator, jest, supertest, swagger-jsdoc, swagger-ui-express.
- `bcryptjs`, `jsonwebtoken` y `express-validator` ya estan aprobadas: no preguntar antes de instalarlas.
- `validar-jwt.js` no se implementa hasta T-05, porque necesita el modelo `Usuario` (T-03) y el login emitiendo tokens reales (T-04).
- Todo middleware que lea `req.usuario` responde 401 si no existe (`design.md` §4).
- El middleware de roles es `validarRol`, no `validarPermiso`.
- En `scripts/probar-conexion.js` usar siempre `QueryTypes.SELECT`: `sequelize.query()` sin tipo devuelve `[filas, metadatos]`, y desestructurar una sola vez da el array de filas, no la fila.
