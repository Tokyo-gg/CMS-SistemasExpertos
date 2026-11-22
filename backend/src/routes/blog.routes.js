import { Router } from 'express';
import { createBlog, getBlog } from '../controllers/blog.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { USER_ROLES } from '../models/User.js';

const router = Router();

router.get('/:slug', getBlog);
router.post('/', authenticate, authorize(USER_ROLES.AUTHOR), createBlog);

export default router;