import { Blog, BLOG_STATUS } from "../models/Blog.js";
import { USER_STATUS } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { toSlug } from "../utils/slug.js";

const ALLOWED_FIELDS = ["name", "description", "slug", "logoUrl", "coverUrl"];

export async function createBlog(ownerId, data = {}) {
  if (await Blog.exists({ ownerId })) {
    throw new AppError("Ya tienes un blog creado", 409);
  }

  const fields = {};
  for (const field of ALLOWED_FIELDS) {
    if (data[field] !== undefined) {
      if (typeof data[field] !== "string") {
        throw new AppError(`El campo "${field}" debe ser texto`, 400);
      }
      fields[field] = data[field];
    }
  }

  if (!fields.name)
    throw new AppError("El nombre del blog es obligatorio", 400);

  fields.slug = toSlug(fields.slug || fields.name);
  if (!fields.slug)
    throw new AppError("No se pudo generar un slug válido", 400);

  return Blog.create({ ...fields, ownerId });
}

export async function getPublicBlog(slug) {
  const blog = await Blog.findOne({
    slug: toSlug(slug),
    status: BLOG_STATUS.ACTIVE,
  }).populate({
    path: "ownerId",
    select: "name username bio avatarUrl",
    match: { status: USER_STATUS.ACTIVE },
  });

  if (!blog || !blog.ownerId) throw new AppError("Blog no encontrado", 404);
  const owner = blog.ownerId;
  const result = blog.toJSON();
  delete result.ownerId;
  result.owner = {
    _id: owner._id,
    name: owner.name,
    bio: owner.bio,
    avatarUrl: owner.avatarUrl,
  };
  return result;
}

export async function getMyBlog(ownerId) {
  const blog = await Blog.findOne({ ownerId });
  if (!blog) throw new AppError("Todavía no tienes un blog", 404);
  return blog;
}

export async function updateBlog(blogId, userId, data = {}) {
  const blog = await Blog.findById(blogId);
  if (!blog) throw new AppError('Blog no encontrado', 404);

  // Regla de propiedad: el dueño sale de la BD, el usuario sale del token
  if (!blog.ownerId.equals(userId)) {
    throw new AppError('No tienes permiso para modificar este blog', 403);
  }

  const updates = {};
  for (const field of ALLOWED_FIELDS) {
    if (data[field] !== undefined) {
      if (typeof data[field] !== 'string') {
        throw new AppError(`El campo "${field}" debe ser texto`, 400);
      }
      updates[field] = data[field];
    }
  }

  if (updates.slug !== undefined) {
    updates.slug = toSlug(updates.slug);
    if (!updates.slug) throw new AppError('Slug inválido', 400);
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('No hay campos válidos para actualizar', 400);
  }

  blog.set(updates);
  return blog.save();
}