import { asyncHandler } from '../utils/asyncHandler.js';
import * as adminService from '../services/admin.service.js';

export const listUsers = asyncHandler(async (req, res) => {
  const data = await adminService.listUsers(req.query);
  res.status(200).json({ success: true, data });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await adminService.setUserStatus(req.user, req.params.id, req.body?.status);
  res.status(200).json({ success: true, data: { user }, message: 'Estado del usuario actualizado' });
});

export const listPosts = asyncHandler(async (req, res) => {
  const data = await adminService.listAllPosts(req.query);
  res.status(200).json({ success: true, data });
});

export const updatePostStatus = asyncHandler(async (req, res) => {
  const post = await adminService.setPostStatus(req.user, req.params.id, req.body?.status);
  res.status(200).json({ success: true, data: { post }, message: 'Estado de la publicación actualizado' });
});

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await adminService.listAllCategories();
  res.status(200).json({ success: true, data: { categories } });
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await adminService.createCategory(req.user, req.body ?? {});
  res.status(201).json({ success: true, data: { category }, message: 'Categoría creada' });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await adminService.updateCategory(req.user, req.params.id, req.body ?? {});
  res.status(200).json({ success: true, data: { category }, message: 'Categoría actualizada' });
});