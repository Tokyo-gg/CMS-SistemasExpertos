import mongoose from 'mongoose';

export const BLOG_STATUS = { ACTIVE: 'active', INACTIVE: 'inactive' };

const blogSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'El nombre del blog es obligatorio'],
      trim: true,
      minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
      maxlength: [80, 'El nombre no puede superar 80 caracteres'],
    },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logoUrl: { type: String, trim: true, maxlength: 500, default: '' },
    coverUrl: { type: String, trim: true, maxlength: 500, default: '' },
    status: {
      type: String,
      enum: Object.values(BLOG_STATUS),
      default: BLOG_STATUS.ACTIVE,
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
  }
);

export const Blog = mongoose.model('Blog', blogSchema);