export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';

const ALLOWED: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ['paid', 'failed', 'expired'],
  paid: ['refunded'],
  failed: ['pending'],
  expired: ['pending'],
  refunded: [],
};

export function canTransitionPayment(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  return from === to || ALLOWED[from].includes(to);
}

export class PaymentTransitionError extends Error {
  constructor(
    public readonly from: PaymentStatus,
    public readonly to: PaymentStatus,
  ) {
    super(`PAYMENT_TRANSITION:${from}->${to}`);
  }
}
