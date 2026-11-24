import { Router } from "express";
import {
  createPost,
  listMyPosts,
  publishPost,
  listPublicPosts,
  getPublicPost,
  updatePost,
  archivePost,
  getMyPost,
} from "../controllers/post.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { USER_ROLES } from "../models/User.js";

const author = [authenticate, authorize(USER_ROLES.AUTHOR)];

export const postRouter = Router();
postRouter.post("/", ...author, createPost);
postRouter.patch("/:id/publish", ...author, publishPost);
postRouter.get("/", listPublicPosts);
postRouter.get("/:slug", getPublicPost);
postRouter.put("/:id", ...author, updatePost);
postRouter.delete("/:id", ...author, archivePost);

export const meRouter = Router();
meRouter.get("/posts", ...author, listMyPosts);
meRouter.get("/posts/:id", ...author, getMyPost);
