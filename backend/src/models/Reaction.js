import mongoose from "mongoose";

export const REACTION_TYPES = ["like"];

const reactionSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, enum: REACTION_TYPES, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// La base de datos rechaza duplicados, aunque lleguen dos peticiones a la vez
reactionSchema.index({ postId: 1, userId: 1, type: 1 }, { unique: true });

export const Reaction = mongoose.model("Reaction", reactionSchema);
