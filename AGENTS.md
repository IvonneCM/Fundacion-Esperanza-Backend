# AGENTS.md — Backend (Node.js / Express)

Este archivo define cómo debe trabajar cualquier agente de código (opencode u otro) en este repositorio. Es un documento vivo: se actualiza a medida que se toman nuevas decisiones en `design.md`.

## Contexto del proyecto

Sistema de gestión para Fundación Nuestra Esperanza (La Paz, Bolivia), un hogar de acogida para familias de niños en tratamiento oncológico. Dos módulos:

- **Documental**: catalogación de documentos ya digitalizados, con extracción OCR (AWS Textract) y validación humana.
- **Alimentario**: control de stock de insumos, recetas, y sugerencia de menús mediante programación lineal (microservicio Python con PuLP).

Stack: Node.js/Express, PostgreSQL (Sequelize), AWS S3 + Textract, microservicio Python (FastAPI + PuLP), Docker Compose, despliegue en VPS Ubuntu 24.04.

## Reglas no negociables

1. No crear archivos, tablas, ni tomar decisiones de arquitectura que no estén ya definidas en `design.md`. Si hace falta una decisión que no está ahí, preguntar antes de asumir.
2. No instalar dependencias nuevas sin confirmar con la persona a cargo.
3. No modificar el esquema de base de datos sin reflejarlo primero en `design.md`.

## Secretos

- **Nunca leer, imprimir ni copiar el `.env`.** Es la única fuente de los valores reales. `.env.example` es la plantilla documentada y no tiene secretos.
- Para verificar la conexión usar `npm run db:probar`, que imprime host, puerto, base, usuario y resultado, y redacta la contraseña. Si hace falta depurar, se cambia el script — no se lee el `.env`.
- La conexión se define en un único `.env` mediante `DATABASE_URL`. Para cambiar de ambiente se edita esa URL a mano (dev, pruebas o producción); no hay un `.env.test`.
- `config/database.js` detiene las pruebas cuando `NODE_ENV=test` apunta a una base cuyo nombre no contiene `test`, salvo que `DB_PERMITIR_TEST=true`. Ese flag declara que la base es desechable y sus datos se pueden perder. **En producción debe ser `false`.**
- Las pruebas corren contra la base a la que apunte `DATABASE_URL`. Antes de `npm test`, correr `npm run db:probar` y confirmar en el aviso qué base va a usarse.

## Cambios en la base de datos

- **El agente nunca escribe en la base de datos.** Todo cambio de esquema, dato o migración lo aplica la persona a cargo, a mano, con el SQL.
- `Fundacion_Nuestra_Esperanza_create.sql` es la **única fuente de verdad del esquema**. Si el agente necesita saber cómo es una tabla, la lee ahí. No mantener una segunda copia en un script: se desincroniza en silencio.
- **No crear scripts que hagan `CREATE`, `ALTER`, `DROP`, `INSERT`, `UPDATE` ni `DELETE`** sobre la base. Se eliminó `scripts/inicializar-base.js` por este motivo: duplicaba el SQL, cubría solo 1 de las 14 tablas y abría una vía de escritura innecesaria sobre datos de salud de menores.
- `npm run db:probar` (`scripts/probar-conexion.js`) sí se puede usar: hace únicamente `SELECT`, nunca escribe.
- Para hablar con una base remota que no expone su puerto, el agente propone el túnel SSH o el comando de Docker, pero no los ejecuta: los corre la persona a cargo.


## Estructura de carpetas

```
config/         → database.js, aws.js
controllers/    → un archivo por módulo (documental, alimentario, auth)
middlewares/    → validar-jwt.js, validar-campos.js, validar-rol.js
models/         → un archivo por entidad, incluidas las tablas de extensión de documentos
routes/
services/       → toda integración externa (S3, Textract, microservicio PuLP) vive aquí
scripts/
tests/
uploads/        → staging local antes del respaldo en la nube
utils/
```

Nota: no existe una carpeta `helpers/` separada — todo utilitario va en `utils/` hasta que se justifique lo contrario.

## Convenciones de nomenclatura

- Sustantivos de dominio (modelos, tablas, entidades) en **español**: `Documento`, `Insumo`, `Receta`, `FichaSocialDatos`.
- Verbos CRUD en **inglés**: `get`, `create`, `update`, `delete` (ej. `getDocumentos`, `crearReceta`, `actualizarInsumo`).
- Columnas de base de datos en `snake_case`; variables y funciones JS en `camelCase`.

## Estilo de código

- **Un campo o validación por línea, siempre.** Nunca condensar varios campos de un modelo, varias validaciones de un router, o varios atributos de un objeto de respuesta en una sola línea.
- Los controllers **nunca** llaman directo a `axios`, al SDK de AWS, ni a ninguna librería de integración externa — siempre pasan por `services/`.
- Todo controller async lleva `try/catch`, con log de error en consola y una respuesta JSON consistente: `{ ok, msg, error? }` (el campo `error` solo se expone en desarrollo).

## Base de datos

- **UUID** (`DataTypes.UUID`, `defaultValue: DataTypes.UUIDV4`) como llave primaria en todas las tablas — nunca autoincremental.
- Documentos: tabla común `documentos` (campos compartidos: tipo, ruta de archivo, estado OCR, estado de validación, texto extraído) + una tabla de extensión 1:1 por tipo de documento (`ficha_social_datos`, `almuerzo_datos`, `salida_entrada_datos`, `referencia_social_datos`).
- `timestamps: false` salvo que el modelo lo necesite explícitamente — confirmar caso por caso, no asumir.

## Integraciones externas

- Comunicación con el microservicio de PuLP: **HTTP síncrono**, con timeout definido (valor exacto pendiente en `design.md`). No usar colas ni brokers de mensajería.
- Subida de archivos (Textract/S3): reintentos con backoff, progreso visible en el frontend, y nunca bloquear otras operaciones del usuario mientras un archivo pesado se sube — la conectividad en el sitio es lenta, no intermitente, así que el foco es resiliencia de red, no modo offline.

## Autenticación y permisos

- JWT vía middleware `validarJWT`.
- Autorización por rol vía middleware `validarRol('admin', 'archivista')`.
- Tres roles: `admin` (todo), `archivista` (documental: subir, validar OCR, buscar, ver; sin acceso al alimentario ni a usuarios) y `visitante` (lectura, y solo documentos validados). El mapa completo está en `design.md` §2 y es la fuente de verdad.


## Testing

- Jest para el backend.
- Cobertura mínima obligatoria: pendiente de definir — no asumir un umbral.

## Qué NO hacer sin preguntar

- No generar migraciones de base de datos antes de que `design.md` esté cerrado.
- No decidir el modelo de datos de una entidad nueva sin proponerlo primero y esperar confirmación.
- No crear una carpeta `helpers/` ni mover archivos de `utils/` sin que se indique explícitamente.
