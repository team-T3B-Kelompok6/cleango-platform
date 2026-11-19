import type { AdminCleanerTask, TaskBoard } from '@/types/cleaner';
import type { RiskSnapshot } from '@/types/tracking';

/**
 * Transport panel Pantau Petugas.
 *
 * Ini komponen bersama (dipakai daftar pesanan dan daftar petugas), bukan fitur
 * tunggal, jadi modulnya ikut di `components/tracking/` dan tidak memakai
 * `lib/api` server (panel berjalan di browser).
 */

class TrackingRequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'TrackingRequestError';
  }
}

async function payload<T>(response: Response, fallback: string): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new TrackingRequestError('Respons layanan tugas tidak valid.', 502);
  }
  if (!response.ok)
    throw new TrackingRequestError(
      typeof (body as { message?: unknown })?.message === 'string'
        ? String((body as { message: string }).message)
        : fallback,
      response.status,
    );
  return body as T;
}

/** `GET /api/admin/cleaner-tasks` — papan penugasan + lokasi terakhir. */
export async function fetchTaskBoard(): Promise<TaskBoard> {
  const response = await fetch('/api/admin/cleaner-tasks', {
    cache: 'no-store',
  });
  const result = await payload<{ data?: TaskBoard }>(
    response,
    'Data tugas belum dapat dimuat.',
  );
  if (!result.data)
    throw new TrackingRequestError('Data tugas tidak valid.', 502);
  return result.data;
}

/** `POST /api/admin/cleaner-tasks` dengan `intent: 'resend'`. */
export async function resendTaskLink(item: {
  orderId: string;
  staffName: string;
}): Promise<TaskBoard> {
  const response = await fetch('/api/admin/cleaner-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'resend',
      orderId: item.orderId,
      staffName: item.staffName,
    }),
  });
  const result = await payload<{ data?: TaskBoard }>(
    response,
    'Pengiriman belum berhasil.',
  );
  if (!result.data)
    throw new TrackingRequestError('Data tugas tidak valid.', 502);
  return result.data;
}

/** `POST /api/tracking/risk` — prediksi ETA/risiko untuk satu penugasan. */
export async function requestRisk(
  input: Record<string, unknown>,
  signal: AbortSignal,
): Promise<RiskSnapshot> {
  const response = await fetch('/api/tracking/risk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });
  const result = await payload<{ data?: RiskSnapshot }>(
    response,
    'Prediksi belum tersedia.',
  );
  if (!result.data)
    throw new TrackingRequestError('Prediksi belum tersedia.', 502);
  return result.data;
}

export type { AdminCleanerTask };
