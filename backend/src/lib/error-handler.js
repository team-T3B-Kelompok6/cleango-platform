export function notFoundHandler(request, response) {
  response.status(404).json({
    message: `Route ${request.method} ${request.originalUrl} tidak ditemukan`,
  });
}

export function errorHandler(error, _request, response, _next) {
  console.error(error);

  response.status(error.status ?? 500).json({
    message: error.message ?? 'Terjadi kesalahan pada server',
  });
}

