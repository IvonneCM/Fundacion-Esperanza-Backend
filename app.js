import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import saludRouter from './routes/salud.js';

dotenv.config();

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api', saludRouter);

export default app;
