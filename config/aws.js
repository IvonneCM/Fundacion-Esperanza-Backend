import { S3Client } from '@aws-sdk/client-s3';
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

export { bucket };

export default s3;
