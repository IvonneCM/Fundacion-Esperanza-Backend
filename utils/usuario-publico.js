export const usuarioPublico = (usuario) => ({
  id: usuario.id,
  nombre: usuario.nombre,
  apellido: usuario.apellido,
  email: usuario.email,
  rol: usuario.rol,
  activo: usuario.activo,
  creado_en: usuario.creado_en
});

export default usuarioPublico;
