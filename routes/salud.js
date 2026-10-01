import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  try {
    res.json({ ok: true, msg: 'Servidor de la Fundación Nuestra Esperanza funcionando correctamente' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: 'Error en el servidor', error: error.message });
  }
});

export default router;
