import 'server-only';
import { request } from './resourceApi';

/**
 * Helper request bertipe untuk kode server.
 *
 * Fungsi di sini hanya memberi nama method dan tipe balikan; seluruh perilaku
 * transport (cookie sesi, timeout, redirect 401, `ApiError`, mode demo) tetap
 * milik `request`/`upstreamRequest`. Karena itu pemanggil cukup menulis:
 *
 * ```ts
 * const session = await post<LoginSession>('/auth/login', credentials, {
 *   anonymous: true,
 * });
 * ```
 *
 * Tipe generik `T` adalah bentuk respons yang diharapkan. Kalau backend
 * membungkusnya (`{ data: T }`), tulis `post<ApiItemEnvelope<Order>>(...)` lalu
 * ambil `.data`, atau pakai `list`/`detail` yang sudah menormalkan bentuk itu.
 */
export type HttpOptions = Omit<RequestInit, 'method' | 'body'> & {
  /** Endpoint publik: jangan redirect ke `/login` saat menerima 401. */
  anonymous?: boolean;
};

/** Badan request: objek/array diserialisasi JSON, body mentah diteruskan apa adanya. */
export type HttpBody = unknown;

function serialize(body: HttpBody): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    (typeof Blob !== 'undefined' && body instanceof Blob)
  ) {
    return body as BodyInit;
  }
  return JSON.stringify(body);
}

async function send<T>(
  method: string,
  path: string,
  body: HttpBody,
  options: HttpOptions,
): Promise<T> {
  const { anonymous = false, ...init } = options;
  return request<T>(
    path,
    { ...init, method, body: serialize(body) },
    anonymous,
  );
}

/** `GET /path` → `Promise<T>`. */
export function get<T>(path: string, options: HttpOptions = {}): Promise<T> {
  return send<T>('GET', path, undefined, options);
}

/** `POST /path` dengan body JSON (default) → `Promise<T>`. */
export function post<T, B = HttpBody>(
  path: string,
  body?: B,
  options: HttpOptions = {},
): Promise<T> {
  return send<T>('POST', path, body, options);
}

/** `PATCH /path` → `Promise<T>`. */
export function patch<T, B = HttpBody>(
  path: string,
  body?: B,
  options: HttpOptions = {},
): Promise<T> {
  return send<T>('PATCH', path, body, options);
}

/** `PUT /path` → `Promise<T>`. */
export function put<T, B = HttpBody>(
  path: string,
  body?: B,
  options: HttpOptions = {},
): Promise<T> {
  return send<T>('PUT', path, body, options);
}

/**
 * `DELETE /path` → `Promise<T>`.
 * Dinamai `del` karena `delete` adalah kata kunci JavaScript.
 */
export function del<T>(path: string, options: HttpOptions = {}): Promise<T> {
  return send<T>('DELETE', path, undefined, options);
}
