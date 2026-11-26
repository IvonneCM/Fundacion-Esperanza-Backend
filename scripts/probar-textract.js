import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';

dotenv.config();

// Prueba de solo lectura: manda UNA imagen a Textract y muestra lo que reconoce.
// No toca la base de datos ni S3. Uso: npm run textract:probar -- ruta/a/imagen.jpg
const ruta = process.argv[2];

if (!ruta) {
  console.log('Uso: npm run textract:probar -- ruta/a/imagen.jpg');
  process.exit(1);
}

const { textractRegion } = await import('../config/aws.js');
const { analizarDocumento } = await import('../services/textract.js');

console.log('--- Prueba de Textract ---');
console.log(`Region:   ${textractRegion}`);
console.log(`Archivo:  ${ruta}`);

try {
  const bytes = await readFile(ruta);
  console.log(`Tamano:   ${(bytes.length / 1024).toFixed(0)} KB`);

  const resultado = await analizarDocumento(bytes);

  console.log(`Lineas de texto: ${resultado.texto ? resultado.texto.split('\n').length : 0}`);
  console.log(`Tablas:          ${resultado.tablas.length}`);
  console.log('');
  console.log('--- Texto crudo ---');
  console.log(resultado.texto || '(vacio)');

  resultado.tablas.forEach((tabla, numero) => {
    console.log('');
    console.log(`--- Tabla ${numero + 1} (${tabla.length} filas) ---`);

    for (const fila of tabla) {
      console.log(fila.map((celda) => (celda ? celda.texto : '')).join(' | '));
    }
  });
} catch (error) {
  console.log('');
  console.log(`FALLA: ${error.name}: ${error.message}`);
  process.exit(1);
}
