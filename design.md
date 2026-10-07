# design.md — Backend (Node.js / Express)

Cómo se construye lo definido en `requirements.md`. Este documento crece por módulo: **por ahora cubre solo autenticación, roles/usuarios y la estrategia de pruebas.** El modelo de datos de documentos y alimentación se agrega cuando lleguemos a esos módulos (ver `Fundacion_Nuestra_Esperanza_create.sql` como borrador).

Lo marcado como **(propuesto)** no fue discutido todavía: se puede cambiar antes de implementarlo.

## 1. Requerimientos que cubre

- RF-01 Login diferenciado por rol
- RF-02 Restricción de funcionalidades sensibles según rol
- RF-03	Gestion de usuarios
- NFR-03 Seguridad
- NFR-04 Documentacion de la API

Estado de avance: la Fase 1 (T-01 a T-05 y T-07) esta implementada y verificada. Las pruebas automatizadas (T-06) quedaron diferidas; T-08 es lo que sigue. Ver `CONTEXT.md`.

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
| GET | `/api/usuarios` | Listar usuarios. Admite `?rol=` y `?activo=` como filtros opcionales. |
| GET | `/api/usuarios/:id` | Obtener uno. |
| POST | `/api/usuarios` | Crear. |
| PUT | `/api/usuarios/:id` | Editar datos y rol. |
| PATCH | `/api/usuarios/:id/estado` | Activar o desactivar (`{ activo: false }`). |

**Respuestas**

- `GET /api/usuarios`: 200 `{ ok, msg, total, usuarios: [...] }`.
- `GET /api/usuarios/:id`: 200 con el usuario; 404 si el `id` no existe.
- `POST`: 201 con el usuario creado; 400 campos inválidos; 409 si el `email` ya existe.
- `PUT`: 200 con el usuario actualizado; 400; 404; 409 si el `email` cambia a uno ya usado.
- `PATCH /:id/estado`: 200 con el usuario; 404.

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
