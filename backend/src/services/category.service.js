import { Category, CATEGORY_STATUS } from "../models/Category.js";

export async function listActiveCategories() {
  return Category.find({ status: CATEGORY_STATUS.ACTIVE }).sort({ name: 1 });
}
