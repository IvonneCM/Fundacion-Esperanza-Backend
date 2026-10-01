import dotenv from 'dotenv';
import { QueryTypes } from 'sequelize';
import { redactarConexion, esBaseDePruebas } from '../utils/redactar-conexion.js';

dotenv.config();

const conexion = redactarConexion();

console.log('--- Configuracion de la base de datos ---');
console.log(`Origen:      ${conexion.origen}`);
console.log(`Host:        ${conexion.host}`);
console.log(`Puerto:      ${conexion.port}`);
console.log(`Base:        ${conexion.database}`);
console.log(`Usuario:     ${conexion.username}`);
console.log(`Password:    ${conexion.passwordOculta} (oculta a proposito)`);
console.log(`SSL:         ${conexion.ssl}`);
console.log(`URL:         ${conexion.urlRedactada}`);
console.log(`NODE_ENV:    ${process.env.NODE_ENV || '(sin definir)'}`);

if (conexion.error) {
  console.log(`Error:       ${conexion.error}`);
}

if (!conexion.host || !conexion.database || !conexion.username) {
  console.log('');
  console.log('FALLA: falta configuracion. Defina DATABASE_URL, o DB_HOST + DB_DATABASE + DB_USERNAME.');
  process.exit(1);
}

const esPruebas = process.env.NODE_ENV === 'test';
const pruebasPermitidas = process.env.DB_PERMITIR_TEST === 'true';

if (esPruebas) {
  console.log('');
  console.log('=========================================================');
  console.log(' MODO PRUEBAS: las pruebas automaticas van a correr');
  console.log(` contra la base "${conexion.database}" en ${conexion.host}`);
  console.log(
    esBaseDePruebas(conexion.database)
      ? ' El nombre indica que es una base de pruebas.'
      : ' OJO: el nombre NO indica que sea una base de pruebas.'
  );
  console.log(
    pruebasPermitidas
      ? ' DB_PERMITIR_TEST=true, asi que el guard no la detuvo.'
      : ' Se permitsio porque el nombre contiene "test".'
  );
  console.log(' Si NO es la base correcta, cambie DATABASE_URL antes de');
  console.log(' ejecutar npm test. Los datos de esa base se pueden perder.');
  console.log('=========================================================');
} else {
  console.log('');
  console.log('Nota: estas mirando una base que no es de pruebas. Es normal en desarrollo.');
  console.log('      Para correr Jest, ponga NODE_ENV=test.');
}

let sequelize;

try {
  ({ sequelize } = await import('../config/database.js'));
} catch (error) {
  console.log('');
  console.log(`FALLA al cargar config/database.js: ${error.message}`);
  process.exit(1);
}

console.log('');
console.log('--- Probando conexion ---');

const consultar = async (sql) => sequelize.query(sql, { type: QueryTypes.SELECT });

try {
  await sequelize.authenticate();
  console.log('Conexion exitosa.');

  const [version] = await consultar('SELECT version() AS version');
  console.log(`PostgreSQL: ${String(version.version).split(' ').slice(0, 2).join(' ')}`);

  const [base] = await consultar(
    'SELECT current_database() AS base, current_user AS usuario, current_schema() AS esquema'
  );
  console.log(`Conectado a "${base.base}" como "${base.usuario}"`);
  console.log(`Esquema por defecto: ${base.esquema}`);

  const [ajustes] = await consultar('SELECT current_setting(\'server_version\') AS version');
  console.log(`Version del servidor: ${ajustes.version}`);

  const tablas = await consultar(
    "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log('');
  console.log(`Objetos en el schema public: ${tablas.length === 0 ? '(ninguno)' : ''}`);

  for (const tabla of tablas) {
    console.log(`  ${tabla.table_name} (${tabla.table_type})`);
  }

  const [registro] = await consultar("SELECT to_regclass('public.usuarios') AS tabla");
  console.log('');

  if (registro.tabla) {
    console.log('Tabla usuarios: EXISTE.');

    const [conteo] = await consultar('SELECT count(*)::int AS total FROM usuarios');
    console.log(`  Filas: ${conteo.total}`);

    const columnas = await consultar(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'usuarios'
       ORDER BY ordinal_position`
    );

    console.log('  Columnas:');
    for (const columna of columnas) {
      const obligatoria = columna.is_nullable === 'NO' ? 'obligatoria' : 'opcional';
      console.log(`    ${String(columna.column_name).padEnd(15)} ${columna.data_type.padEnd(25)} ${obligatoria}`);
    }

    const restricciones = await consultar(`
      SELECT conname AS nombre, pg_get_constraintdef(oid) AS definicion
      FROM pg_constraint
      WHERE conrelid = 'public.usuarios'::regclass
      ORDER BY conname
    `);

    console.log('  Restricciones:');
    for (const restriccion of restricciones) {
      console.log(`    ${restriccion.nombre}: ${restriccion.definicion}`);
    }
  } else {
    console.log('Tabla usuarios: NO existe. Ejecute "npm run db:inicializar".');
  }

  console.log('');
  console.log('DIAGNOSTICO OK');
  await sequelize.close();
  process.exit(0);
} catch (error) {
  console.log(`FALLA la conexion: ${error.message}`);
  console.log('');

  if (conexion.origen === 'DATABASE_URL') {
    console.log('Cosas para revisar:');
    console.log('  - La URL de Neon sigue vigente o el branch fue eliminado?');
    console.log('  - La region del hostname coincide con la de la URL?');
    console.log('  - sslmode=require sigue presente en la URL?');
    console.log('  - La IP del equipo esta en la lista de IPs permitidas del branch?');
  } else {
    console.log('Cosas para revisar:');
    console.log('  - Si el host es un nombre de servicio de Docker, hace falta levantar el compose.');
    console.log('  - Si es un Postgres local, el host deberia ser localhost, no un nombre de servicio.');
    console.log('  - Alternativa recomendada: definir DATABASE_URL y apuntar a Neon.');
  }

  await sequelize.close().catch(() => {});
  process.exit(1);
}
