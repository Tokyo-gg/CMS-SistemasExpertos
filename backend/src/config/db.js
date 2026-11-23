import mongoose from 'mongoose';

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB conectado');
  } catch {
    throw new Error('Error conectando a MongoDB. Revisa la URI, las credenciales y el acceso de red en Atlas.');
  }
}
