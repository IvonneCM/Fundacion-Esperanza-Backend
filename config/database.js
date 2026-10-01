import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const esPruebas = process.env.NODE_ENV === 'test';
const pruebasPermitidas = process.env.DB_PERMITIR_TEST === 'true';

const desdeUrl = (url) => {
  const partes = new URL(url);

  return {
    host: partes.hostname,
    port: Number(partes.port) || 5432,
    database: decodeURIComponent(partes.pathname.replace(/^\//, '')),
    username: decodeURIComponent(partes.username),
    password: decodeURIComponent(partes.password),
    ssl: partes.searchParams.get('sslmode') === 'require'
  };
};

const desdeVariables = () => ({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true'
});

const credenciales = process.env.DATABASE_URL
  ? desdeUrl(process.env.DATABASE_URL)
  : desdeVariables();

if (!credenciales.host || !credenciales.database || !credenciales.username) {
  throw new Error(
    'Falta la configuración de la base de datos. Defina DATABASE_URL (Neon) o DB_HOST, DB_DATABASE y DB_USERNAME (VPS).'
  );
}

if (esPruebas && !pruebasPermitidas && !credenciales.database.includes('test')) {
  throw new Error(
    `NODE_ENV=test contra la base "${credenciales.database}". ` +
      'Defina DB_PERMITIR_TEST=true si esa base es desechable y sus datos se pueden perder.'
  );
}

export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: credenciales.host,
  port: credenciales.port,
  database: credenciales.database,
  username: credenciales.username,
  password: credenciales.password,
  dialectOptions: credenciales.ssl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    : {},
  logging: process.env.DB_LOGGING === 'true' ? console.log : false
});

export const conectar = async () => {
  try {
    await sequelize.authenticate();
    console.log(`Base de datos conectada: ${credenciales.database}`);
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export default sequelize;
