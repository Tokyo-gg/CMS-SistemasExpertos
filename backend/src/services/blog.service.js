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
  return blog;
}
