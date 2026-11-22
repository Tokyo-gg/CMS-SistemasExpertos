import { AppError } from '../utils/AppError.js';

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('No tienes permiso para realizar esta acción', 403));
  }
  next();
};