import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import saludRouter from './routes/salud.js';
import authRouter from './routes/auth.js';
import usuariosRouter from './routes/usuarios.js';
import documentosRouter from './routes/documentos.js';
import swaggerDocument from './config/swagger.js';

dotenv.config();

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api', saludRouter);
app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/documentos', documentosRouter);

// Documentacion de la API (NFR-04): Swagger UI en /api-docs, spec en /api/docs/swagger.json
app.get('/api/docs/swagger.json', (req, res) => {
  res.json(swaggerDocument);
});

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'API Fundacion Nuestra Esperanza'
  })
);

export default app;
