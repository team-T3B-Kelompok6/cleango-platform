import type { CleanerTask } from '@/types/cleaner';

/**
 * Transport halaman tugas petugas.
 *
 * Berbeda dari dashboard admin, halaman ini memakai token tautan tugas (bukan
 * cookie sesi) dan berjalan lewat Route Handler Next `/api/tugas/[token]`.
 * Karena itu helper server `lib/api/http.ts` tidak dipakai di sini.
 *
 * Sengaja tetap memakai `fetch`:
 * - unggah foto mengirim `FormData` apa adanya,
 * - setiap aksi hanya boleh sekali (tanpa retry otomatis),
 * - pemanggil butuh status HTTP untuk menghentikan GPS pada 401/403/404/410.
 */

/** Galat HTTP dari Route Handler tugas; `status` 0 berarti jaringan putus. */
export class CleanerRequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'CleanerRequestError';
  }
}

/** Status yang berarti tautan tugas tidak berlaku lagi. */
export function taskGone(status: number) {
  return [401, 403, 404, 410].includes(status);
}

export function cleanerEndpoint(token: string) {
  return '/api/tugas/' + encodeURIComponent(token);
}

async function payload(response: Response): Promise<CleanerTask> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new CleanerRequestError(
      'Respons layanan tugas tidak valid.',
      response.status,
    );
  }
  if (!response.ok)
    throw new CleanerRequestError(
      typeof (body as { message?: unknown })?.message === 'string'
        ? String((body as { message: string }).message)
        : 'Permintaan gagal diproses.',
      response.status,
    );
  const data = (body as { data?: CleanerTask })?.data;
  if (!data) throw new CleanerRequestError('Data tugas tidak valid.', 502);
  return data;
}

/** `GET /api/tugas/[token]` untuk polling. */
export async function fetchCleanerTask(
  token: string,
  signal?: AbortSignal,
): Promise<CleanerTask> {
  const response = await fetch(cleanerEndpoint(token), {
    cache: 'no-store',
    signal,
  });
  return payload(response);
}

/** `POST` satu event tahap (depart/arrive/complete/…) dengan idempotency key. */
export async function sendCleanerEvent(
  token: string,
  event: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<CleanerTask> {
  const response = await fetch(cleanerEndpoint(token), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
    signal,
  });
  return payload(response);
}

/** `POST` foto bukti kerja sebagai `FormData`. */
export async function uploadCleanerPhoto(
  token: string,
  file: File,
): Promise<CleanerTask> {
  const form = new FormData();
  form.set('file', file);
  const response = await fetch(cleanerEndpoint(token), {
    method: 'POST',
    body: form,
  });
  return payload(response);
}
