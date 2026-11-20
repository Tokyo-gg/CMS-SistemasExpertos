import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { AppError } from './utils/AppError.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/error-test', () => {
  throw new AppError('Prueba de error controlado', 400);
});

app.use(notFound);
app.use(errorHandler);

export default app;