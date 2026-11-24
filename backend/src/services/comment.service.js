import { Comment, COMMENT_STATUS } from '../models/comment.js';
import { Post } from '../models/Post.js';
import { User, USER_STATUS, USER_ROLES } from '../models/User.js';
import { findPublicPostById } from './post.service.js';
import { AppError } from '../utils/AppError.js';

const AUTHOR_FIELDS = 'name username avatarUrl';

export async function createComment(postId, userId, data = {}) {
  if (typeof data.body !== 'string') throw new AppError('El comentario es obligatorio', 400);
  await findPublicPostById(postId); // solo se comenta en posts públicos
  const comment = await Comment.create({ postId, authorId: userId, body: data.body });
  return comment.populate('authorId', AUTHOR_FIELDS);
}

export async function listComments(postId, { page = 1, limit = 20 } = {}) {
  await findPublicPostById(postId);

  const p = Math.max(parseInt(page) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit) || 20, 1), 50);

  const hiddenUsers = await User.find({ status: { $ne: USER_STATUS.ACTIVE } }).distinct('_id');
  const filter = { postId, status: COMMENT_STATUS.VISIBLE, authorId: { $nin: hiddenUsers } };

  const [items, total] = await Promise.all([
    Comment.find(filter).sort({ createdAt: -1, _id: -1 }).skip((p - 1) * l).limit(l).populate('authorId', AUTHOR_FIELDS),
    Comment.countDocuments(filter),
  ]);

  return { items, pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
}

export async function hideComment(commentId, user) {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new AppError('Comentario no encontrado', 404);

  const post = await Post.findById(comment.postId).select('authorId');
  const allowed =
    user.role === USER_ROLES.ADMIN ||
    comment.authorId.equals(user._id) ||
    post?.authorId.equals(user._id);
  if (!allowed) throw new AppError('No tienes permiso para moderar este comentario', 403);

  if (comment.status !== COMMENT_STATUS.HIDDEN) {
    comment.status = COMMENT_STATUS.HIDDEN; // se conserva, solo deja de mostrarse
    await comment.save();
  }
  return comment;
}