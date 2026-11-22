import bcrypt from "bcryptjs";
import { User, USER_ROLES, USER_STATUS } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { signToken } from "../utils/token.js";

const SALT_ROUNDS = 10;

export async function register({ name, username, email, password }) {
  if (!name || !username || !email || !password) {
    throw new AppError(
      "Nombre, username, correo y contraseña son obligatorios",
      400,
    );
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new AppError("La contraseña debe tener al menos 8 caracteres", 400);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    name,
    username,
    email,
    passwordHash,
    role: USER_ROLES.AUTHOR,
  });

  const token = signToken({ id: user._id, role: user.role });
  return { user, token };
}


 // LOGIN


export async function login({ email, password } = {}) {
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    throw new AppError("Correo y contraseña son obligatorios", 400);
  }

  
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
    "+passwordHash",
  );

  // Mismo mensaje si falla el correo o la contraseña
  const invalid = new AppError("Credenciales inválidas", 401);

  if (!user) throw invalid;

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) throw invalid;

  if (user.status !== USER_STATUS.ACTIVE) {
    throw new AppError("Cuenta desactivada", 403);
  }

  const token = signToken({ id: user._id, role: user.role });
  return { user, token };
}

// actualiza el perfil del usuario, solo permite actualizar ciertos campos
const ALLOWED_PROFILE_FIELDS = ['name', 'bio', 'avatarUrl'];

export async function updateProfile(userId, data = {}) {
  const updates = {};

  for (const field of ALLOWED_PROFILE_FIELDS) {
    if (data[field] !== undefined) {
      if (typeof data[field] !== 'string') {
        throw new AppError(`El campo "${field}" debe ser texto`, 400);
      }
      updates[field] = data[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('No hay campos válidos para actualizar', 400);
  }

  return User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
}
