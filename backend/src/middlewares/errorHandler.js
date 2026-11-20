import { AppError } from "../utils/AppError.js";

export function errorHandler(err, req, res, next) {
  let error = err;

  // Errores conocidos de Mongoose y Express
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    error = new AppError(message, 400);
  } else if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    error = new AppError(`El valor de "${field}" ya está en uso`, 409);
  } else if (err.name === "CastError") {
    error = new AppError("Identificador inválido", 400);
  } else if (err.type === "entity.parse.failed") {
    error = new AppError("JSON inválido en el cuerpo de la petición", 400);
  }

  if (!error.isOperational) console.error(err);

  const statusCode = error.isOperational ? error.statusCode : 500;
  const message = error.isOperational
    ? error.message
    : "Error interno del servidor";

  res.status(statusCode).json({ success: false, message });
}
