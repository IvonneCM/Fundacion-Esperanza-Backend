# tasks.md — Backend

Tareas ordenadas, pensadas para **una sesión de 90 minutos cada una**. Cada tarea referencia su requerimiento y dice cuándo está terminada. No se empieza la siguiente hasta cumplir el "Hecho cuando" de la actual.

Al cerrar cada sesión: marcar la tarea y escribir en `CONTEXT.md` cuál es la siguiente acción concreta.

Para trabajar con opencode, un prompt tipo: *"Implementa la tarea T-0X de tasks.md siguiendo design.md y AGENTS.md. No crees archivos ni dependencias fuera de lo indicado; si falta una decisión, pregúntame."*

## Fase 1 — Autenticación (RF-01, RF-02, NFR-03)

- [ ] **T-01 — Base de datos local y tabla `usuarios`**
  Crear en Postgres local (instalado o con Docker) las bases `fundacion_dev` y `fundacion_test`, y en ambas la tabla `usuarios` con el DDL de `design.md` §3.
  *Hecho cuando:* `\d usuarios` muestra la tabla en las dos bases, con el `CHECK` de `rol` y `email` único.

- [ ] **T-02 — Conexión a la base y separación de app/server**
  `config/database.js` (Sequelize leyendo `.env`), `.env.example` sin secretos, y separar `app.js` (exporta la app) de `server.js` (hace `listen`).
  *Hecho cuando:* `npm run dev` conecta a la base sin errores y `/api/health` sigue respondiendo.

- [ ] **T-03 — Modelo `Usuario` y script del primer admin**
  `models/Usuario.js` siguiendo `AGENTS.md` (UUID, un campo por línea) y `scripts/crear-admin.js` con bcrypt.
  *Hecho cuando:* ejecutar el script crea un admin, ejecutarlo de nuevo no lo duplica, y en la base el `password_hash` no es la contraseña en texto plano.

- [ ] **T-04 — Login (`POST /api/auth/login`)**
  `controllers/auth.js`, `routes/auth.js` y validaciones de campos, con los códigos de respuesta de `design.md` §4.
  *Hecho cuando:* desde Postman un login correcto devuelve token y usuario, y los casos 400, 401 y 403 responden como dice el diseño.

- [ ] **T-05 — Middlewares `validarJWT` y `validarRol`, y `GET /api/auth/perfil`**
  *Hecho cuando:* una ruta protegida responde 401 sin token o con token inválido, 403 con rol insuficiente y 200 con rol permitido, y `/api/auth/perfil` devuelve el usuario del token.

- [ ] **T-06 — Pruebas de autenticación (Jest + Supertest)**
  Todos los casos obligatorios de `design.md` §5, contra `fundacion_test`.
  *Hecho cuando:* `npm test` pasa en verde y no toca la base de desarrollo.

- [ ] **T-07 — Documentación OpenAPI y colección de Postman**
  `swagger-jsdoc` + `swagger-ui-express` en `/api-docs`, con los endpoints de auth documentados (NFR-04).
  *Hecho cuando:* `/api-docs` permite probar el login, y el `swagger.json` se importa en Postman generando la colección.

## Fase 2 — Gestión de usuarios (solo admin)

- [ ] **T-08 — CRUD de usuarios (`/api/usuarios`)**
  Listar, crear, editar y activar/desactivar. Solo `admin`. Requiere agregar el RF correspondiente a `requirements.md`.
  *Hecho cuando:* un admin puede crear un archivista, y un archivista o visitante recibe 403 en todas esas rutas.

- [ ] **T-09 — Pruebas de gestión de usuarios**
  *Hecho cuando:* `npm test` sigue en verde con los casos de permisos y de validación.

## Fase 3 — Frontend del login (después de la Fase 1)

Antes de empezar: crear el repositorio del frontend y su `AGENTS.md`.

- [ ] **F-01 — Proyecto Vite + React y estructura base**
- [ ] **F-02 — Pantalla de login y contexto de sesión** (guarda el token, llama a `/api/auth/perfil` al recargar).
- [ ] **F-03 — Rutas protegidas según el rol y menú según el rol**
  *Hecho cuando (F-01 a F-03):* un admin, un archivista y un visitante entran y ven solo lo que les corresponde, y sin sesión se redirige al login.

## Cuando llegue el acceso al VPS

- [ ] **V-01 — Levantar Postgres y MinIO en el VPS** con `docker-compose.yml`, usando el esquema SQL actualizado (no el borrador anterior).
- [ ] **V-02 — Apuntar el backend a la base del VPS** mediante túnel SSH y verificar que el login funciona igual.

## Pendiente de definir (siguientes módulos)

Documental (subida, MinIO, OCR, validación, búsqueda) y alimentario (stock, recetas, PuLP). Se agregan a este archivo cuando lleguemos a cada uno.
