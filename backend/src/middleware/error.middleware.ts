import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../lib/AppError.js';

interface DatabaseError {
  code?: string;
}

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({ message: 'Endpoint tidak ditemukan' });
};

export const globalErrorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ message: error.message, code: error.code });
    return;
  }

  const databaseError = error as DatabaseError;
  if (databaseError.code === 'ER_DUP_ENTRY') {
    response.status(400).json({ message: 'Data dengan nilai tersebut sudah tersedia' });
    return;
  }
  if (databaseError.code === 'ER_NO_REFERENCED_ROW_2') {
    response.status(400).json({ message: 'Data referensi tidak ditemukan' });
    return;
  }
  if (databaseError.code === 'ER_ROW_IS_REFERENCED_2') {
    response.status(409).json({ message: 'Data masih digunakan dan tidak dapat dihapus' });
    return;
  }

  console.error(error);
  response.status(500).json({ message: 'Terjadi kesalahan pada server' });
};
