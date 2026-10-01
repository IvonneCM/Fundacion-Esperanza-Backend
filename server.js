import app from './app.js';
import { conectar } from './config/database.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});

conectar().catch(() => {
  console.log('Sin base de datos por ahora. /api/health sigue respondiendo.');
});
