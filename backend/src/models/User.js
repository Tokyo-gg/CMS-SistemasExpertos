import mongoose from "mongoose";

export const USER_ROLES = { AUTHOR: "author", ADMIN: "admin" };
export const USER_STATUS = { ACTIVE: "active", INACTIVE: "inactive" };

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: [2, "El nombre debe tener al menos 2 caracteres"],
      maxlength: [100, "El nombre no puede superar 100 caracteres"],
    },
    username: {
      type: String,
      required: [true, "El username es obligatorio"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "El username debe tener al menos 3 caracteres"],
      maxlength: [30, "El username no puede superar 30 caracteres"],
      match: [
        /^[a-z0-9_]+$/,
        "El username solo admite letras, números y guion bajo",
      ],
    },
    email: {
      type: String,
      required: [true, "El correo es obligatorio"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "El correo no es válido"],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.AUTHOR,
    },
    bio: { type: String, trim: true, maxlength: 600, default: "" },
    avatarUrl: { type: String, trim: true, maxlength: 2048, default: "" },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const User = mongoose.model("User", userSchema);
