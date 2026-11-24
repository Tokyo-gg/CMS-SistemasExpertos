import { Router } from 'express';
import { listComments, createComment, hideComment } from '../controllers/comment.controller.js';
import { getReactions, addReaction, removeReaction } from '../controllers/reaction.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.get('/posts/:id/comments', listComments);
router.post('/posts/:id/comments', authenticate, createComment);
router.delete('/comments/:id', authenticate, hideComment);

router.get('/posts/:id/reactions', getReactions);
router.put('/posts/:id/reactions', authenticate, addReaction);
router.delete('/posts/:id/reactions/:type', authenticate, removeReaction);

export default router;