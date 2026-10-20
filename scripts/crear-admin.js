import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js';
import Usuario from '../models/Usuario.js';

dotenv.config();

const COSTO_BCRYPT = 10;
const LONGITUD_MINIMA = 8;

const arg = (indice) => process.argv[indice];

const nombre = process.env.ADMIN_NOMBRE || arg(2);
const apellido = process.env.ADMIN_APELLIDO || arg(3);
const email = process.env.ADMIN_EMAIL || arg(4);
const password = process.env.ADMIN_PASSWORD || arg(5);

if (!nombre || !apellido || !email || !password) {
  console.log('');
  console.log('FALTA: se necesita nombre, apellido, email y contrasena.');
  console.log('');
  console.log('Opcion 1 — argumentos:');
  console.log('  node scripts/crear-admin.js <nombre> <apellido> <email> <contrasena>');
  console.log('');
  console.log('Opcion 2 — variables de entorno (la contrasena no queda en el historial):');
  console.log('  $env:ADMIN_NOMBRE="Anita"');
  console.log('  $env:ADMIN_APELLIDO="Perez"');
  console.log('  $env:ADMIN_EMAIL="anita@fundacion.org"');
  console.log('  $env:ADMIN_PASSWORD="anita0709"');
  console.log('  node scripts/crear-admin.js');
  console.log('');
  process.exit(1);
}

if (password.length < LONGITUD_MINIMA) {
  console.log(`FALLA: la contrasena debe tener al menos ${LONGITUD_MINIMA} caracteres.`);
  process.exit(1);
}

const emailNormalizado = String(email).trim().toLowerCase();

try {
  const existente = await Usuario.findOne({ where: { email: emailNormalizado } });

  if (existente) {
    console.log('');
    console.log(`Ya existe un usuario con el email ${emailNormalizado} (id ${existente.id}, rol ${existente.rol}).`);
    console.log('No se creo nada. Para cambiar su rol o reiniciar su contrasena, editar la fila con SQL.');
    await sequelize.close();
    process.exit(0);
  }

  const password_hash = await bcrypt.hash(password, COSTO_BCRYPT);

  const admin = await Usuario.create({
    nombre,
    apellido,
    email: emailNormalizado,
    password_hash,
    rol: 'admin',
    activo: true
  });

  console.log('');
  console.log('Admin creado.');
  console.log(`  id:    ${admin.id}`);
  console.log(`  email: ${admin.email}`);
  console.log(`  rol:   ${admin.rol}`);
  console.log('');
  console.log('La contrasena no se muestra y no queda guardada en ningun archivo.');

  await sequelize.close();
  process.exit(0);
} catch (error) {
  console.log('');
  console.log(`FALLA al crear el admin: ${error.message}`);
  await sequelize.close().catch(() => {});
  process.exit(1);
}