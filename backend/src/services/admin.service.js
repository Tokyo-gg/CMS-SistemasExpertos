import { User, USER_STATUS, USER_ROLES } from "../models/User.js";
import { Post, POST_STATUS } from "../models/Post.js";
import { Category } from "../models/Category.js";
import { STATUS_ALIASES } from "./post.service.js";
import { AppError } from "../utils/AppError.js";
import { toSlug } from "../utils/slug.js";

const audit = (admin, action, target) =>
  console.info(
    `[admin] ${new Date().toISOString()} admin=${admin._id} action=${action} target=${target}`,
  );

const paging = ({ page, limit } = {}) => ({
  p: Math.max(parseInt(page) || 1, 1),
  l: Math.min(Math.max(parseInt(limit) || 20, 1), 50),
});

const result = (items, total, p, l) => ({
  items,
  pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
});

export async function listUsers(query = {}) {
  const { p, l } = paging(query);
  const filter = {};
  if (Object.values(USER_STATUS).includes(query.status))
    filter.status = query.status;
  if (Object.values(USER_ROLES).includes(query.role)) filter.role = query.role;

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((p - 1) * l)
      .limit(l),
    User.countDocuments(filter),
  ]);
  return result(items, total, p, l);
}

export async function setUserStatus(admin, userId, status) {
  if (!Object.values(USER_STATUS).includes(status)) {
    throw new AppError(
      `El estado debe ser: ${Object.values(USER_STATUS).join(", ")}`,
      400,
    );
  }

  const target = await User.findById(userId);
  if (!target) throw new AppError("Usuario no encontrado", 404);
  if (target.role === USER_ROLES.ADMIN) {
    throw new AppError(
      "No se puede cambiar el estado de un administrador",
      403,
    );
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { status },
    { new: true, runValidators: true },
  );
  audit(admin, `user.status=${status}`, userId);
  return user;
}

export async function listAllPosts(query = {}) {
  const { p, l } = paging(query);
  const filter = {};
  const st = STATUS_ALIASES[query.status] ?? query.status;
  if (Object.values(POST_STATUS).includes(st)) filter.status = st;

  const [items, total] = await Promise.all([
    Post.find(filter)
      .select("-content")
      .sort({ updatedAt: -1, _id: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .populate([
        { path: "authorId", select: "name username" },
        { path: "categoryId", select: "name slug" },
      ]),
    Post.countDocuments(filter),
  ]);
  return result(items, total, p, l);
}

export async function setPostStatus(admin, postId, status) {
  const st = STATUS_ALIASES[status] ?? status;
  if (![POST_STATUS.ARCHIVED, POST_STATUS.DRAFT].includes(st)) {
    throw new AppError('El estado debe ser "archived" o "draft"', 400);
  }

  const post = await Post.findByIdAndUpdate(
    postId,
    { status: st },
    { new: true, runValidators: true },
  );
  if (!post) throw new AppError("Publicación no encontrada", 404);
  audit(admin, `post.status=${st}`, postId);
  return post;
}

export async function listAllCategories() {
  return Category.find().sort({ name: 1 });
}

export async function createCategory(admin, data = {}) {
  if (typeof data.name !== "string" || !data.name.trim()) {
    throw new AppError("El nombre de la categoría es obligatorio", 400);
  }
  if (data.description !== undefined && typeof data.description !== "string") {
    throw new AppError("La descripción debe ser texto", 400);
  }
  const slug = toSlug(data.name);
  if (!slug) throw new AppError("Nombre inválido", 400);

  // Un nombre repetido lo rechaza el índice único del slug (409)
  const category = await Category.create({
    name: data.name,
    slug,
    description: data.description,
  });
  audit(admin, "category.create", category._id);
  return category;
}

export async function updateCategory(admin, categoryId, data = {}) {
  const category = await Category.findById(categoryId);
  if (!category) throw new AppError("Categoría no encontrada", 404);

  for (const f of ["name", "description", "status"]) {
    if (data[f] !== undefined) {
      if (typeof data[f] !== "string")
        throw new AppError(`El campo "${f}" debe ser texto`, 400);
      category[f] = data[f];
    }
  }

  await category.save(); // el slug no cambia: las URLs y filtros siguen funcionando
  audit(admin, "category.update", categoryId);
  return category;
}
