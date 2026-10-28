import { describe, expect, it } from 'vitest';
import { canTransition } from '../src/lib/order-status.js';

describe('booking status transitions', () => {
  it('allows the forward service flow', () => {
    expect(canTransition('confirmed', 'assigned')).toBe(true);
    expect(canTransition('assigned', 'en_route')).toBe(true);
    expect(canTransition('en_route', 'in_progress')).toBe(true);
    expect(canTransition('in_progress', 'completed')).toBe(true);
  });

  it('treats a repeated status as a safe no-op', () => {
    expect(canTransition('assigned', 'assigned')).toBe(true);
  });

  it('never moves a status backwards', () => {
    expect(canTransition('in_progress', 'assigned')).toBe(false);
    expect(canTransition('completed', 'in_progress')).toBe(false);
    expect(canTransition('cancelled', 'confirmed')).toBe(false);
  });

  it('allows cancel from any active stage but no parking in reschedule', () => {
    expect(canTransition('confirmed', 'cancelled')).toBe(true);
    expect(canTransition('in_progress', 'cancelled')).toBe(true);
    expect(canTransition('confirmed', 'rescheduled')).toBe(false);
    expect(canTransition('confirmed', 'awaiting_payment')).toBe(false);
  });
});
