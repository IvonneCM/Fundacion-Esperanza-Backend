import multer from 'multer';

const LIMITE_BYTES = 25 * 1024 * 1024;

const TIPOS_PERMITIDOS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf'
};

const almacenamiento = multer.memoryStorage();

const filtrarArchivo = (req, file, cb) => {
  if (!TIPOS_PERMITIDOS[file.mimetype]) {
    return cb(new Error('Solo se aceptan archivos jpg, jpeg, png o pdf'));
  }

  cb(null, true);
};

const subida = multer({
  storage: almacenamiento,
  limits: {
    fileSize: LIMITE_BYTES
  },
  fileFilter: filtrarArchivo
}).single('archivo');

export const procesarArchivo = (req, res, next) => {
  subida(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ ok: false, msg: 'El archivo supera el limite de 25 MB' });
    }

    return res.status(400).json({ ok: false, msg: error.message });
  });
};

export { TIPOS_PERMITIDOS };

export default procesarArchivo;
