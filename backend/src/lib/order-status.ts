export type BookingStatus =
  | 'awaiting_payment'
  | 'confirmed'
  | 'assigned'
  | 'departed'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

// Forward order of the service flow. Payment has its own status and never
// decides whether a booking may move forward.
const RANK: Record<BookingStatus, number> = {
  awaiting_payment: 0,
  confirmed: 1,
  assigned: 2,
  departed: 3,
  en_route: 4,
  in_progress: 5,
  completed: 6,
  cancelled: 6,
  rescheduled: 6,
};

const TERMINAL: BookingStatus[] = ['completed', 'cancelled'];

/** A repeated status is a no-op; a finished order never reopens. */
export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true;
  if (TERMINAL.includes(from)) return false;
  if (to === 'cancelled') return true;
  // Cancellation/reschedule policy (BE-B01) is not approved yet, so an order
  // cannot be parked in `rescheduled` directly.
  if (from === 'rescheduled') return to === 'confirmed';
  if (to === 'rescheduled' || to === 'awaiting_payment') return false;
  return RANK[to] > RANK[from];
}

export class OrderStatusTransitionError extends Error {
  constructor(
    public readonly from: BookingStatus,
    public readonly to: BookingStatus,
  ) {
    super(`ORDER_STATUS_BACKWARDS:${from}->${to}`);
  }
}

/** One label set for customer, admin and cleaner screens. */
export function statusLabel(status: string): string {
  if (status === 'in_progress') return 'Sedang Dikerjakan';
  if (status === 'completed') return 'Selesai';
  if (status === 'cancelled') return 'Batal';
  if (status === 'departed' || status === 'en_route') return 'Menuju Lokasi';
  if (status === 'assigned') return 'Menunggu Lokasi';
  if (status === 'rescheduled') return 'Dijadwalkan Ulang';
  return 'Menunggu Assign';
}
