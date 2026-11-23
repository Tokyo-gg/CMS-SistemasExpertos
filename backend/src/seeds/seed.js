import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User, USER_ROLES } from "../models/User.js";
import { Category } from "../models/Category.js";
import { toSlug } from "../utils/slug.js";

const CATEGORIES = [
  "Tecnología",
  "Programación",
  "Diseño",
  "Educación",
  "Estilo de vida",
];

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL.toLowerCase();
  const exists = await User.findOne({ email });
  if (exists) return console.log("Admin ya existe, se omite");

  await User.create({
    name: process.env.ADMIN_NAME,
    username: process.env.ADMIN_USERNAME,
    email,
    passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10),
    role: USER_ROLES.ADMIN,
  });
  console.log("Admin creado");
}

async function seedCategories() {
  for (const name of CATEGORIES) {
    const slug = toSlug(name);
    await Category.updateOne(
      { slug },
      { $setOnInsert: { name, slug } },
      { upsert: true },
    );
  }
  console.log("Categorías listas");
}

async function run() {
  for (const key of ['MONGODB_URI', 'ADMIN_EMAIL', 'ADMIN_NAME', 'ADMIN_USERNAME', 'ADMIN_PASSWORD']) {
    if (!process.env[key]) throw new Error(`Falta ${key} en backend/.env`);
  }
  if (process.env.ADMIN_PASSWORD.length < 12) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 12 caracteres');
  }
  try {
    await connectDB();
    await seedAdmin();
    await seedCategories();
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(error => {
  console.error('No se pudo completar el seed:', error.message);
  process.exitCode = 1;
});
