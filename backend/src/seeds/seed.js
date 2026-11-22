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
  await connectDB();
  await seedAdmin();
  await seedCategories();
  await mongoose.disconnect();
}

run();
