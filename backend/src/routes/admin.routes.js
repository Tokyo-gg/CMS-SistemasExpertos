import { Router } from 'express';
import {
  listUsers, updateUserStatus, listPosts, updatePostStatus,
  listCategories, createCategory, updateCategory,
} from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { USER_ROLES } from '../models/User.js';

const router = Router();

// Todo /api/admin exige admin; una ruta nueva no puede quedar sin proteger
router.use(authenticate, authorize(USER_ROLES.ADMIN));

router.get('/users', listUsers);
router.patch('/users/:id/status', updateUserStatus);
router.get('/posts', listPosts);
router.patch('/posts/:id/status', updatePostStatus);
router.get('/categories', listCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);

export default router;