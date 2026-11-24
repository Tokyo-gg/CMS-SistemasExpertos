import { asyncHandler } from "../utils/asyncHandler.js";
import * as reactionService from "../services/reaction.service.js";

export const getReactions = asyncHandler(async (req, res) => {
  const data = await reactionService.getReactions(req.params.id);
  res.status(200).json({ success: true, data });
});

export const addReaction = asyncHandler(async (req, res) => {
  const data = await reactionService.addReaction(
    req.params.id,
    req.user._id,
    req.body?.type,
  );
  res.status(200).json({ success: true, data });
});

export const removeReaction = asyncHandler(async (req, res) => {
  const data = await reactionService.removeReaction(
    req.params.id,
    req.user._id,
    req.params.type,
  );
  res.status(200).json({ success: true, data });
});
