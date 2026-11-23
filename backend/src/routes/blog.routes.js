import { Router } from 'express';
import { createBlog, getBlog, updateBlog } from '../controllers/blog.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { USER_ROLES } from '../models/User.js';

const router = Router();

router.get('/:slug', getBlog);
router.post('/', authenticate, authorize(USER_ROLES.AUTHOR), createBlog);
router.put('/:id', authenticate, authorize(USER_ROLES.AUTHOR), updateBlog);

export default router;
