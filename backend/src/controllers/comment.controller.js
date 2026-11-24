import { asyncHandler } from "../utils/asyncHandler.js";
import * as commentService from "../services/comment.service.js";

export const listComments = asyncHandler(async (req, res) => {
  const data = await commentService.listComments(req.params.id, req.query);
  res.status(200).json({ success: true, data });
});

export const createComment = asyncHandler(async (req, res) => {
  const comment = await commentService.createComment(
    req.params.id,
    req.user._id,
    req.body ?? {},
  );
  res
    .status(201)
    .json({
      success: true,
      data: { comment },
      message: "Comentario publicado",
    });
});

export const hideComment = asyncHandler(async (req, res) => {
  const comment = await commentService.hideComment(req.params.id, req.user);
  res
    .status(200)
    .json({ success: true, data: { comment }, message: "Comentario ocultado" });
});
