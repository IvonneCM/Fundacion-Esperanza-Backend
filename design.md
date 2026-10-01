# design.md — Backend (Node.js / Express)

Cómo se construye lo definido en `requirements.md`. Este documento crece por módulo: **por ahora cubre solo autenticación, roles/usuarios y la estrategia de pruebas.** El modelo de datos de documentos y alimentación se agrega cuando lleguemos a esos módulos (ver `Fundacion_Nuestra_Esperanza_create.sql` como borrador).

Lo marcado como **(propuesto)** no fue discutido todavía: se puede cambiar antes de implementarlo.

## 1. Requerimientos que cubre

- RF-01 Login diferenciado por rol
- RF-02 Restricción de funcionalidades sensibles según rol
- RF-03	Gestion de usuarios
- NFR-03 Seguridad

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
Fase 1 28/09/2026

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | público | Recibe `email` y `password`, devuelve token con informacion esencial cifrada y datos del usuario |
| GET | `/api/auth/perfil` | cualquier rol autenticado | Devuelve el usuario del token (para que el frontend recupere la sesión) |

Posterior a esta fase porfavor acutalizar este documento con los siguientes pasos crud de auth (Los endpoints de gestión de usuarios (`/api/usuarios`, solo admin) con get, post, put, y delete)

**POST `/api/auth/login`**

- Body: `email` (formato email, obligatorio), `password` (obligatorio).
- 200: `{ ok: true, token, usuario: { id, nombre, apellido, email, rol } }`
- 400: campos inválidos (por `validarCampos`).
- 401: credenciales inválidas. El mismo mensaje para email inexistente y contraseña incorrecta, para no revelar qué cuentas existen.
- 403: usuario desactivado (solo se revela después de validar la contraseña).

**Middlewares (`middlewares/`)**

- `validar-campos.js`: ya existe en tu convención.
- `validar-jwt.js`: lee el token, lo verifica, busca el usuario y comprueba que siga `activo`. Si no, 401.
- `validar-rol.js`: `validarRol('admin', 'archivista')`. Si el rol del usuario no está en la lista, 403.

Los endpoints de gestión de usuarios (`/api/usuarios`, solo admin) se diseñan en la fase siguiente.

## 5. Estrategia de pruebas

- **Herramientas:** Jest + Supertest.
- **Separar la app del arranque:** `app.js` crea y exporta la aplicación Express; `server.js` solo hace `listen`. Así Supertest puede probar rutas sin abrir un puerto.
- **Una sola base de datos, la de Neon, descartable.** Mientras el sistema este en desarrollo no hace falta una base de pruebas aparte: `neondb` esta vacia y se puede perder. La separacion con produccion es una decision de configuracion, no de arquitectura.
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
- **Pruebas manuales:** anotaciones OpenAPI/Swagger (`swagger-jsdoc`) en cada ruta; el `swagger.json` se importa en Postman (NFR-04).

## 6. Frontend (fase posterior)

No se implementa hasta que el login del backend esté probado y exista el `AGENTS.md` del frontend. Valores por defecto (propuesto): Vite + React, React Router, Context API para la sesión, rutas protegidas según el rol del usuario.

## 7. Desiciones a implementar

- El usuario puede cambiar su propia contraseña con recuperación por correo
- Bloqueo por intentos fallidos de login: fuera de alcance por ahora.
