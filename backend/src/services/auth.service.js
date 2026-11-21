import bcrypt from "bcryptjs";
import { User, USER_ROLES } from "../models/User.js";
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
