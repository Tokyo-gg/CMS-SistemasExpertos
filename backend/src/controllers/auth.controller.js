import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body);
  res.status(201).json({
    success: true,
    data: { user, token },
    message: 'Usuario registrado correctamente',
  });
});

export const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body ?? {}); // Se pasa un objeto vacío si req.body es undefined
  res.status(200).json({
    success: true,
    data: { user, token },
    message: 'Inicio de sesión exitoso',
  });
});

export const me = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body ?? {});// se usa req.us
  res.status(200).json({
    success: true,
    data: { user },
    message: 'Perfil actualizado correctamente',
  });
});