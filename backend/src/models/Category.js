import mongoose from 'mongoose';

export const CATEGORY_STATUS = { ACTIVE: 'active', INACTIVE: 'inactive' };

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [50, 'El nombre no puede superar 50 caracteres'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, trim: true, maxlength: 200, default: '' },
    status: {
      type: String,
      enum: Object.values(CATEGORY_STATUS),
      default: CATEGORY_STATUS.ACTIVE,
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

export const Category = mongoose.model('Category', categorySchema);