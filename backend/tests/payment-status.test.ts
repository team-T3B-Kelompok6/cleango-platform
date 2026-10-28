import { describe, expect, it } from 'vitest';
import { canTransitionPayment } from '../src/lib/payment-status.js';

describe('payment status transitions', () => {
  it('allows pending to settle once', () => {
    expect(canTransitionPayment('pending', 'paid')).toBe(true);
    expect(canTransitionPayment('pending', 'failed')).toBe(true);
    expect(canTransitionPayment('pending', 'expired')).toBe(true);
  });

  it('keeps a repeated status idempotent', () => {
    expect(canTransitionPayment('paid', 'paid')).toBe(true);
  });

  it('reopens a failed or expired payment for a retry', () => {
    expect(canTransitionPayment('failed', 'pending')).toBe(true);
    expect(canTransitionPayment('expired', 'pending')).toBe(true);
  });

  it('never marks a paid payment as failed or expired', () => {
    expect(canTransitionPayment('paid', 'failed')).toBe(false);
    expect(canTransitionPayment('paid', 'expired')).toBe(false);
    expect(canTransitionPayment('refunded', 'paid')).toBe(false);
  });
});
