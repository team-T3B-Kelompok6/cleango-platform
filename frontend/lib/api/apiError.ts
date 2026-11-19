/**
 * Galat transport API yang membawa status HTTP dan galat per field.
 * Dipakai server dan client; jangan menaruh pesan khusus satu halaman di sini.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string>,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
