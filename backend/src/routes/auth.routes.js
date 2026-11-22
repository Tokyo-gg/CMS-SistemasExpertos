import { Router } from 'express';
import { register, login, me, updateMe } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';


const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me);
router.put('/me', authenticate, updateMe);
//ruta de prueba para verificar que el middleware de autorización funciona correctamente
router.get('/admin-test', authenticate, authorize('admin'), (req, res) => {
  res.json({ success: true, message: 'Entraste como admin' });
});

export default router;