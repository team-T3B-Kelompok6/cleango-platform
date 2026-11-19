/**
 * Bentuk respons backend Express yang dianggap kontrak.
 * Kontrak aktual backend belum seragam; normalisasi dilakukan di lapisan api,
 * bukan di komponen.
 */

/** Respons daftar: `{ data: T[] }`. */
export interface ApiListEnvelope<T> {
  data: T[];
}

/** Respons detail/tunggal: `{ data: T }`. */
export interface ApiItemEnvelope<T> {
  data: T;
}

/** Badan galat dari `error.middleware.ts`. `code` tidak selalu dikirim. */
export interface ApiErrorBody {
  message?: string;
  code?: string;
  errors?: Record<string, string>;
}
