import mongoose from "mongoose";

export const COMMENT_STATUS = { VISIBLE: "visible", HIDDEN: "hidden" };

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      required: [true, "El comentario no puede estar vacío"],
      trim: true,
      maxlength: [1000, "El comentario no puede superar 1000 caracteres"],
    },
    status: {
      type: String,
      enum: Object.values(COMMENT_STATUS),
      default: COMMENT_STATUS.VISIBLE,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

commentSchema.index({ postId: 1, status: 1, createdAt: -1 });

export const Comment = mongoose.model("Comment", commentSchema);
