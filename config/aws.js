import { S3Client } from '@aws-sdk/client-s3';
import { TextractClient } from '@aws-sdk/client-textract';
import dotenv from 'dotenv';

dotenv.config();

const leerBooleano = (valor, porDefecto) => {
  if (valor === undefined || valor === '') {
    return porDefecto;
  }

  return valor === 'true';
};

const construirEndpoint = () => {
  const endpoint = process.env.S3_ENDPOINT;

  if (!endpoint) {
    return undefined;
  }

  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const protocolo = leerBooleano(process.env.S3_USE_SSL, true) ? 'https' : 'http';

  return `${protocolo}://${endpoint}`;
};

const region = process.env.S3_REGION;
const bucket = process.env.S3_BUCKET;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const endpoint = construirEndpoint();

if (!region) {
  throw new Error('Falta S3_REGION en el .env.');
}

if (!bucket) {
  throw new Error('Falta S3_BUCKET en el .env.');
}

const configuracion = {
  region,
  forcePathStyle: leerBooleano(process.env.S3_FORCE_PATH_STYLE, false)
};

if (endpoint) {
  configuracion.endpoint = endpoint;
}

if (accessKeyId && secretAccessKey) {
  configuracion.credentials = {
    accessKeyId,
    secretAccessKey
  };
}

export const s3 = new S3Client(configuracion);

// Textract no existe en todas las regiones (p. ej. no en sa-east-1), por eso tiene region propia.
// Si no hay credenciales propias se reutilizan las de S3 (mismo usuario IAM).
export const textractRegion = process.env.TEXTRACT_REGION || 'us-east-1';

const textractAccessKeyId = process.env.TEXTRACT_ACCESS_KEY_ID || accessKeyId;
const textractSecretAccessKey = process.env.TEXTRACT_SECRET_ACCESS_KEY || secretAccessKey;

const configuracionTextract = {
  region: textractRegion,
  // Reintentos con backoff exponencial del SDK ante errores de red o limite de tasa.
  maxAttempts: 4
};

if (textractAccessKeyId && textractSecretAccessKey) {
  configuracionTextract.credentials = {
    accessKeyId: textractAccessKeyId,
    secretAccessKey: textractSecretAccessKey
  };
}

export const textract = new TextractClient(configuracionTextract);

export { bucket };

export default s3;
