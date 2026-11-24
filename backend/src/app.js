import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import blogRoutes from "./routes/blog.routes.js";
import { getMyBlog } from "./controllers/blog.controller.js";
import { authenticate } from "./middlewares/auth.js";
import { postRouter, meRouter } from "./routes/post.routes.js";
import interactionRoutes from "./routes/interaction.routes.js";
import adminRoutes from './routes/admin.routes.js';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net", "data:"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: null,
      },
    },
  }),
);
if (process.env.CLIENT_URL) app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res
    .status(connected ? 200 : 503)
    .json({ status: connected ? "ok" : "database_unavailable" });
});

app.use("/api/auth", authRoutes);
app.get("/api/me/blog", authenticate, getMyBlog);
app.use("/api/blogs", blogRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/posts", postRouter);
app.use("/api/me", meRouter);
app.use("/api/interactions", interactionRoutes);
app.use("/api/admin", adminRoutes);
app.use(
  express.static(fileURLToPath(new URL("../../Frontend/", import.meta.url)), {
    dotfiles: "deny",
  }),
);

app.use(notFound);
app.use(errorHandler);

export default app;
