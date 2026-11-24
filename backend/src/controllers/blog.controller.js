import { asyncHandler } from "../utils/asyncHandler.js";
import * as blogService from "../services/blog.service.js";

export const createBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.createBlog(req.user._id, req.body ?? {});
  res.status(201).json({
    success: true,
    data: blog,
    message: "Blog creado correctamente",
  });
});

export const getBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.getPublicBlog(req.params.slug);
  res.status(200).json({ success: true, data: blog });
});

export const getMyBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.getMyBlog(req.user._id);
  res.status(200).json({ success: true, data: blog });
});

export const updateBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.updateBlog(req.params.id, req.user._id, req.body ?? {});
  res.status(200).json({
    success: true,
    data: { blog },
    message: 'Blog actualizado correctamente',
  });
});