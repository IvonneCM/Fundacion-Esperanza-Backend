import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Ruta de prueba (Health Check)
app.get('/api/health', (req, res) => {
  try {
    res.json({ ok: true, msg: 'Servidor de la Fundación Nuestra Esperanza funcionando correctamente' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: 'Error en el servidor', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});