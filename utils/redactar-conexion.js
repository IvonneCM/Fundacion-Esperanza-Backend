const desdeUrl = (url) => {
  const partes = new URL(url);

  return {
    origen: 'DATABASE_URL',
    host: partes.hostname,
    port: Number(partes.port) || 5432,
    database: decodeURIComponent(partes.pathname.replace(/^\//, '')),
    username: decodeURIComponent(partes.username),
    passwordOculta: partes.password ? 'SET' : 'VACIO',
    ssl: partes.searchParams.get('sslmode') === 'require',
    urlRedactada: partes.toString().replace(/\/\/[^@]*@/, '//USUARIO:CLAVE@')
  };
};

const desdeVariables = () => ({
  origen: 'DB_HOST / DB_DATABASE',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  passwordOculta: process.env.DB_PASSWORD ? 'SET' : 'VACIO',
  ssl: process.env.DB_SSL === 'true',
  urlRedactada: '(no aplica: se configura por variables separadas)'
});

export const redactarConexion = () => {
  if (process.env.DATABASE_URL) {
    try {
      return desdeUrl(process.env.DATABASE_URL);
    } catch (error) {
      return {
        origen: 'DATABASE_URL',
        host: '(ilegible)',
        port: null,
        database: '(ilegible)',
        username: '(ilegible)',
        passwordOculta: 'SET',
        ssl: null,
        urlRedactada: '(DATABASE_URL no es una URL valida)',
        error: error.message
      };
    }
  }

  return desdeVariables();
};

export const esBaseDePruebas = (database) =>
  typeof database === 'string' && database.includes('test');

export default redactarConexion;
