import { asyncHandler } from "../utils/asyncHandler.js";
import * as categoryService from "../services/category.service.js";

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.listActiveCategories();
  res.status(200).json({ success: true, data: categories });
});
