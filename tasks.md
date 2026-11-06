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

- [x] **T-03 — Modelo `Usuario` y script del primer admin**
  `models/Usuario.js` siguiendo `AGENTS.md` (UUID, un campo por línea) y `scripts/crear-admin.js` con bcrypt.
  *Hecho cuando:* ejecutar el script crea un admin, ejecutarlo de nuevo no lo duplica, y en la base el `password_hash` no es la contraseña en texto plano.

- [x] **T-04 — Login (`POST /api/auth/login`)**
  `controllers/auth.js`, `routes/auth.js` y validaciones de campos, con los códigos de respuesta de `design.md` §4.
  *Hecho cuando:* desde Postman un login correcto devuelve token y usuario, y los casos 400, 401 y 403 responden como dice el diseño.

- [x] **T-05 — Middlewares `validarJWT` y `validarRol`, y `GET /api/auth/perfil`**
  *Hecho cuando:* una ruta protegida responde 401 sin token o con token inválido, 403 con rol insuficiente y 200 con rol permitido, y `/api/auth/perfil` devuelve el usuario del token.

- [ ] **T-06 — Pruebas de autenticación (Jest + Supertest)** — **POSPUESTA hasta despues de terminar todo el proyecto.**
  Todos los casos obligatorios de `design.md` §5, contra `neondb` (base descartable).
  *No es prioridad:* la suite de pruebas se escribe cuando el proyecto completo este terminado, no antes. No es una omision, es un orden de trabajo. Requiere instalar `jest` y `supertest` (regla 2 de `AGENTS.md`: confirmar antes).
  *Hecho cuando:* `npm test` pasa en verde y no toca la base de desarrollo.
  *Pendiente:* el caso de rol insuficiente (403) ya tiene su primera ruta real con `validarRol('admin')` a partir de T-08; la suite lo cubrira al retomarse.

- [x] **T-07 — Documentación OpenAPI y colección de Postman**
  `swagger-jsdoc` + `swagger-ui-express` en `/api-docs`, con los endpoints de auth documentados (NFR-04).
  *Hecho cuando:* `/api-docs` permite probar el login, y el `swagger.json` se importa en Postman generando la colección.

## Fase 2 — Gestión de usuarios (solo admin)

- [x] **T-08 — CRUD de usuarios (`/api/usuarios`)**
  Listar, ver, crear, editar y activar/desactivar. Solo `admin`, con `validarJWT` + `validarRol('admin')`.
  **Diseño ya reflejado en `design.md` §4b.** Alli estan los endpoints, los codigos de respuesta y las reglas de negocio.
  Puntos a respetar: el email se normaliza a minusculas; un admin no puede desactivar ni degradarse a si mismo; no se puede desactivar al ultimo admin activo; **no hay borrado fisico**; el hash nunca se devuelve.
  *Hecho cuando:* un admin puede crear un archivista, y un archivista o visitante recibe 403 en todas esas rutas. El 403 por rol se prueba aca, con `validarRol('admin')`: es la primera ruta real con restriction de rol.
  *Ademas:* documentar estas rutas con anotaciones OpenAPI (§4c), para no romper el swagger ya montado.
  **Verificado end-to-end contra Neon** (ver `CONTEXT.md`). `GET /api/usuarios` admite filtros `?rol=`, `?activo=`, `?buscar=` y paginacion `?pagina=` / `?limite=`.

- [ ] **T-09 — Pruebas de gestión de usuarios** — **POSPUESTA hasta despues de terminar todo el proyecto.**
  *No es prioridad:* igual que T-06, la suite se escribe cuando el proyecto completo este terminado.
  *Hecho cuando:* `npm test` sigue en verde con los casos de permisos y de validación.

## Fase 3 — Frontend del login (después de la Fase 1) — COMPLETA

El frontend vive en un repositorio aparte, **`Fundacion-Esperanza-Fronend`** (sic), con su propio `AGENTS.md`. Ya esta probado, asi que no se recrea desde el backend.

- [x] **F-01 — Proyecto Vite + React y estructura base**
- [x] **F-02 — Pantalla de login y contexto de sesión** (guarda el token, llama a `/api/auth/perfil` al recargar).
- [x] **F-03 — Rutas protegidas según el rol y menú según el rol**
  *Hecho cuando (F-01 a F-03):* un admin, un archivista y un visitante entran y ven solo lo que les corresponde, y sin sesión se redirige al login. **Verificado en el repositorio del frontend.**

## Cuando llegue el acceso al VPS

- [ ] **V-01 — Levantar Postgres y MinIO en el VPS** con `docker-compose.yml`, usando el esquema SQL actualizado (no el borrador anterior).
- [ ] **V-02 — Apuntar el backend a la base del VPS** mediante túnel SSH y verificar que el login funciona igual.

## Fase 4 — Módulo documental (RF-04 a RF-10)

Se avanza con **S3 + MinIO temporal** y la base **Neon** hasta produccion; el VPS no bloquea. El detalle de las tareas siguientes se agrega a medida que se cierra cada diseno.

- [x] **T-10 — Mapeo de solo lectura del esquema documental**
  Leer `Fundacion_Nuestra_Esperanza_create.sql` completo y registrar en `design.md` §8 las tablas, columnas y discrepancias (nombres reales, `usuario_validacion_id`, `texto_ocr_tsv`, archivo SQL nuevo sin versionar, etc.).
  *Hecho cuando:* el esquema documental y sus puntos abiertos quedan documentados antes de crear modelos. **Hecho:** ver `design.md` §8.

- [x] **T-11 — Servicio S3/MinIO (`config/aws.js` + `services/s3.js`)**
  Cliente S3-compatible configurable por entorno (`S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`, `S3_USE_SSL`). Funciones: subir, URL firmada, verificar existencia y eliminar.
  *Hecho cuando:* AWS S3 real responde sin errores. **Verificado:** `HeadBucket` devolvió 200 contra AWS `us-east-2`. Para MinIO en el VPS solo se cambia `S3_ENDPOINT` y `S3_FORCE_PATH_STYLE=true`.

## Pendiente de definir

Alimentario (stock, recetas, PuLP) y el resto del documental (carga, OCR, validacion, busqueda) se agregan a este archivo cuando lleguemos a cada uno.
