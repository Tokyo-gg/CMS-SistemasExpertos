import { User, USER_STATUS } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { verifyToken } from '../utils/token.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Debes iniciar sesión', 401);
  }

  const token = header.split(' ')[1];

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError('Token inválido o expirado', 401);
  }

  // Consultamos la BD en cada petición: así una cuenta desactivada pierde acceso al instante
  const user = await User.findById(payload.id);
  if (!user || user.status !== USER_STATUS.ACTIVE) {
    throw new AppError('Debes iniciar sesión', 401);
  }

  req.user = user;
  next();
});