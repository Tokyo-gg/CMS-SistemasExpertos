import crypto from "crypto";
import { Post, POST_STATUS } from "../models/Post.js";
import { Blog, BLOG_STATUS } from "../models/Blog.js";
import { User, USER_STATUS } from "../models/User.js";
import { Category, CATEGORY_STATUS } from "../models/Category.js";
import { AppError } from "../utils/AppError.js";
import { toSlug } from "../utils/slug.js";

const MIN_CONTENT_TO_PUBLISH = 50;
const FIELDS = ["title", "excerpt", "content", "coverUrl"];
export const STATUS_ALIASES = { borrador: "draft", publicado: "published", archivado: "archived" };

function normalizeTags(tags) {
  if (tags === undefined) return [];
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== "string")) {
    throw new AppError("Las etiquetas deben ser una lista de textos", 400);
  }
  const clean = [...new Set(tags.map((t) => toSlug(t)).filter(Boolean))];
  if (clean.length > 10) throw new AppError("Máximo 10 etiquetas", 400);
  return clean;
}

export async function createPost(user, data = {}) {
  const blog = await Blog.findOne({ ownerId: user._id });
  if (!blog) throw new AppError("Primero debes crear tu blog", 400);

  const fields = {};
  for (const f of FIELDS) {
    if (data[f] !== undefined) {
      if (typeof data[f] !== "string")
        throw new AppError(`El campo "${f}" debe ser texto`, 400);
      fields[f] = data[f];
    }
  }
  if (!fields.title) throw new AppError("El título es obligatorio", 400);

  if (typeof data.categoryId !== "string") throw new AppError("La categoría es obligatoria", 400);

  const category = await Category.findOne({
    _id: data.categoryId,
    status: CATEGORY_STATUS.ACTIVE,
  });
  if (!category)
    throw new AppError("La categoría no existe o está inactiva", 400);

  // Slug único: título + sufijo aleatorio corto
  const slug = `${toSlug(fields.title) || "articulo"}-${crypto.randomBytes(2).toString("hex")}`;

  return Post.create({
    ...fields,
    slug,
    categoryId: category._id,
    tags: normalizeTags(data.tags),
    blogId: blog._id,
    authorId: user._id,
    status: POST_STATUS.DRAFT, // siempre nace como borrador
  });
}

export async function listMyPosts(
  userId,
  { status, page = 1, limit = 10 } = {},
) {
  const filter = { authorId: userId };

  // Acepta los estados en inglés o los del front en español
  const st = STATUS_ALIASES[status] ?? status;
  if (Object.values(POST_STATUS).includes(st)) filter.status = st;

  const p = Math.max(parseInt(page) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

  const [items, total] = await Promise.all([
    Post.find(filter)
      .sort({ updatedAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .populate("categoryId", "name slug"),
    Post.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
  };
}

export async function setPublished(postId, userId, published = true) {
  if (typeof published !== "boolean")
    throw new AppError('"published" debe ser true o false', 400);

  const post = await Post.findById(postId);
  if (!post) throw new AppError("Publicación no encontrada", 404);
  if (!post.authorId.equals(userId))
    throw new AppError(
      "No tienes permiso para modificar esta publicación",
      403,
    );

  if (published) {
    if (!post.title || post.content.length < MIN_CONTENT_TO_PUBLISH) {
      throw new AppError(
        `Para publicar necesitas título y al menos ${MIN_CONTENT_TO_PUBLISH} caracteres de contenido`,
        400,
      );
    }
    post.status = POST_STATUS.PUBLISHED;
    if (!post.publishedAt) post.publishedAt = new Date(); // la fecha original no se pisa
  } else {
    post.status = POST_STATUS.DRAFT;
  }
  return post.save();
}

const param = (v, name) => {
  if (v === undefined || v === "") return undefined;
  if (typeof v !== "string")
    throw new AppError(`El parámetro "${name}" no es válido`, 400);
  return v.trim();
};

const PUBLIC_POPULATE = [
  {
    path: "authorId",
    select: "name username bio avatarUrl",
    match: { status: USER_STATUS.ACTIVE },
  },
  {
    path: "blogId",
    select: "name slug",
    match: { status: BLOG_STATUS.ACTIVE },
  },
  {
    path: "categoryId",
    select: "name slug",
    match: { status: CATEGORY_STATUS.ACTIVE },
  },
];

export async function listPublicPosts(query = {}) {
  const q = param(query.q, "q");
  const category = param(query.category, "category");
  const tag = param(query.tag, "tag");
  const author = param(query.author, "author");
  const p = Math.max(parseInt(query.page) || 1, 1);
  const l = Math.min(Math.max(parseInt(query.limit) || 9, 1), 50);

  const empty = {
    items: [],
    pagination: { page: p, limit: l, total: 0, totalPages: 0 },
  };

  // El servidor fija la visibilidad; el cliente nunca elige el estado
  const filter = { status: POST_STATUS.PUBLISHED };

  // Los inactivos son pocos: se excluyen por id
  const [hiddenUsers, hiddenBlogs, hiddenCats] = await Promise.all([
    User.find({ status: { $ne: USER_STATUS.ACTIVE } }).distinct("_id"),
    Blog.find({ status: { $ne: BLOG_STATUS.ACTIVE } }).distinct("_id"),
    Category.find({ status: { $ne: CATEGORY_STATUS.ACTIVE } }).distinct("_id"),
  ]);
  filter.blogId = { $nin: hiddenBlogs };

  if (category) {
    const cat = await Category.findOne({
      slug: toSlug(category),
      status: CATEGORY_STATUS.ACTIVE,
    });
    if (!cat) return empty;
    filter.categoryId = cat._id;
  } else {
    filter.categoryId = { $nin: hiddenCats };
  }

  if (author) {
    const user = await User.findOne({
      username: author.toLowerCase(),
      status: USER_STATUS.ACTIVE,
    });
    if (!user) return empty;
    filter.authorId = user._id;
  } else {
    filter.authorId = { $nin: hiddenUsers };
  }

  if (tag) filter.tags = toSlug(tag);
  if (q) filter.$text = { $search: q };

  const [items, total] = await Promise.all([
    Post.find(filter)
      .select("-content") // el listado no lleva el artículo completo
      .sort({ publishedAt: -1, _id: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .populate(PUBLIC_POPULATE),
    Post.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
  };
}

export async function getPublicPost(slug) {
  const post = await Post.findOne({
    slug: toSlug(slug),
    status: POST_STATUS.PUBLISHED,
  }).populate(PUBLIC_POPULATE);

  // Mismo 404 si no existe, es borrador/archivado o su autor, blog o categoría están inactivos
  if (!post || !post.authorId || !post.blogId || !post.categoryId) {
    throw new AppError("Publicación no encontrada", 404);
  }
  return post;
}

async function findOwnedPost(postId, userId) {
  const post = await Post.findById(postId);
  if (!post) throw new AppError("Publicación no encontrada", 404);
  if (!post.authorId.equals(userId))
    throw new AppError(
      "No tienes permiso para modificar esta publicación",
      403,
    );
  return post;
}

export async function getMyPost(postId, userId) {
  // La propiedad se aplica en la consulta: un post ajeno responde 404
  const post = await Post.findOne({ _id: postId, authorId: userId }).populate(
    "categoryId",
    "name slug",
  );
  if (!post) throw new AppError("Publicación no encontrada", 404);
  return post;
}

export async function updatePost(postId, userId, data = {}) {
  const post = await findOwnedPost(postId, userId);
  if (post.status === POST_STATUS.ARCHIVED)
    throw new AppError("Una publicación archivada no se puede editar", 409);

  for (const f of FIELDS) {
    if (data[f] !== undefined) {
      if (typeof data[f] !== "string")
        throw new AppError(`El campo "${f}" debe ser texto`, 400);
      post[f] = data[f];
    }
  }

  if (data.categoryId !== undefined) {
    if (typeof data.categoryId !== "string")
      throw new AppError("Categoría inválida", 400);
    const category = await Category.findOne({
      _id: data.categoryId,
      status: CATEGORY_STATUS.ACTIVE,
    });
    if (!category)
      throw new AppError("La categoría no existe o está inactiva", 400);
    post.categoryId = category._id;
  }

  if (data.tags !== undefined) post.tags = normalizeTags(data.tags);

  if (
    post.status === POST_STATUS.PUBLISHED &&
    post.content.length < MIN_CONTENT_TO_PUBLISH
  )
    throw new AppError(
      `Una publicación publicada necesita al menos ${MIN_CONTENT_TO_PUBLISH} caracteres de contenido`,
      400,
    );

  return post.save();
}

export async function archivePost(postId, userId) {
  const post = await findOwnedPost(postId, userId);
  if (post.status !== POST_STATUS.ARCHIVED) {
    post.status = POST_STATUS.ARCHIVED; // borrado lógico: el documento se conserva
    await post.save();
  }
  return post;
}

export async function findPublicPostById(postId) {
  const post = await Post.findOne({ _id: postId, status: POST_STATUS.PUBLISHED }).populate(PUBLIC_POPULATE);
  if (!post || !post.authorId || !post.blogId || !post.categoryId) {
    throw new AppError('Publicación no encontrada', 404);
  }
  return post;
}
