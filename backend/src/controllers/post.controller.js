import { asyncHandler } from "../utils/asyncHandler.js";
import * as postService from "../services/post.service.js";

export const createPost = asyncHandler(async (req, res) => {
  const post = await postService.createPost(req.user, req.body ?? {});
  res.status(201).json({
    success: true,
    data: { post },
    message: "Borrador creado correctamente",
  });
});

export const listMyPosts = asyncHandler(async (req, res) => {
  const data = await postService.listMyPosts(req.user._id, req.query);
  res.status(200).json({ success: true, data });
});

export const publishPost = asyncHandler(async (req, res) => {
  const published = req.body?.published ?? true;
  const post = await postService.setPublished(
    req.params.id,
    req.user._id,
    published,
  );
  res.status(200).json({
    success: true,
    data: { post },
    message: published ? "Publicación publicada" : "Publicación despublicada",
  });
});

export const listPublicPosts = asyncHandler(async (req, res) => {
  const data = await postService.listPublicPosts(req.query);
  res.status(200).json({ success: true, data });
});

export const getPublicPost = asyncHandler(async (req, res) => {
  const post = await postService.getPublicPost(req.params.slug);
  res.status(200).json({ success: true, data: { post } });
});

export const getMyPost = asyncHandler(async (req, res) => {
  const post = await postService.getMyPost(req.params.id, req.user._id);
  res.status(200).json({ success: true, data: { post } });
});

export const updatePost = asyncHandler(async (req, res) => {
  const post = await postService.updatePost(
    req.params.id,
    req.user._id,
    req.body ?? {},
  );
  res
    .status(200)
    .json({
      success: true,
      data: { post },
      message: "Publicación actualizada correctamente",
    });
});

export const archivePost = asyncHandler(async (req, res) => {
  const post = await postService.archivePost(req.params.id, req.user._id);
  res
    .status(200)
    .json({ success: true, data: { post }, message: "Publicación archivada" });
});
