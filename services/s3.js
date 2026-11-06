import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { bucket, s3 } from '../config/aws.js';

const EXPIRACION_URL_SEGUNDOS = 3600;

export const subirArchivo = async ({ clave, contenido, tipoContenido }) => {
  const comando = new PutObjectCommand({
    Bucket: bucket,
    Key: clave,
    Body: contenido,
    ContentType: tipoContenido
  });

  await s3.send(comando);

  return clave;
};

export const obtenerUrlFirmada = async (
  clave,
  expiraEn = EXPIRACION_URL_SEGUNDOS
) => {
  const comando = new GetObjectCommand({
    Bucket: bucket,
    Key: clave
  });

  return getSignedUrl(s3, comando, { expiresIn: expiraEn });
};

export const existeArchivo = async (clave) => {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: clave
      })
    );

    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }

    throw error;
  }
};

export const eliminarArchivo = async (clave) => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: clave
    })
  );
};
