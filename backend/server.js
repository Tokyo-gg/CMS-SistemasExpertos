import 'dotenv/config';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('Configura MONGODB_URI y JWT_SECRET (mínimo 32 caracteres) en backend/.env');
  }
  await connectDB();
  app.listen(PORT, () => console.log(`API en http://localhost:${PORT}`));
}

iniciarServidor().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
