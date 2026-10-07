import jwt from 'jsonwebtoken';

const DURACION = '8h';

const obtenerSecreto = () => {
  const secreto = process.env.JWT_SECRET;

  if (!secreto || secreto === 'cambiar_esto') {
    throw new Error('JWT_SECRET no esta definido en el .env. Generar con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"');
  }

  return secreto;
};

export const firmarToken = (usuario) =>
  jwt.sign({ uid: usuario.id, rol: usuario.rol }, obtenerSecreto(), { expiresIn: DURACION });

export const verificarToken = (token) => jwt.verify(token, obtenerSecreto());

export default { firmarToken, verificarToken };