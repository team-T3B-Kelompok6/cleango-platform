import { describe, expect, it } from 'vitest';
import {
  BOOKING_MAX_DAYS_AHEAD,
  addDays,
  isSlotLeadTimePassed,
  isValidSlot,
  slotStartMinutes,
  validateBookingDate,
} from '../src/model/booking.model.js';

function jakartaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

describe('booking slot rules', () => {
  it('accepts only whitelisted slots', () => {
    expect(isValidSlot('08:00')).toBe(true);
    expect(isValidSlot('09:00')).toBe(true);
    expect(isValidSlot('16:00')).toBe(true);
    expect(isValidSlot('09:30')).toBe(false);
    expect(isValidSlot('23:59')).toBe(false);
    expect(isValidSlot(8)).toBe(false);
  });

  it('maps slot text to minutes', () => {
    expect(slotStartMinutes('08:00')).toBe(480);
    expect(slotStartMinutes('16:00')).toBe(960);
  });

  it('rejects malformed and impossible dates', () => {
    expect(validateBookingDate('2026-1-2')?.code).toBe('INVALID_DATE');
    expect(validateBookingDate('2026-02-30')?.code).toBe('INVALID_DATE');
    expect(validateBookingDate('bukan-tanggal')?.code).toBe('INVALID_DATE');
  });

  it('rejects past dates', () => {
    expect(validateBookingDate('2000-01-01')?.code).toBe('PAST_DATE');
  });

  it('rejects dates too far ahead', () => {
    const far = addDays(jakartaToday(), BOOKING_MAX_DAYS_AHEAD + 1);
    expect(validateBookingDate(far)?.code).toBe('TOO_FAR');
  });

  it('accepts today and the boundary day', () => {
    expect(validateBookingDate(jakartaToday())).toBeNull();
    expect(validateBookingDate(addDays(jakartaToday(), 1))).toBeNull();
    expect(validateBookingDate(addDays(jakartaToday(), BOOKING_MAX_DAYS_AHEAD))).toBeNull();
  });

  it('only closes same-day slots for lead time', () => {
    const today = jakartaToday();
    expect(isSlotLeadTimePassed(addDays(today, 1), '08:00')).toBe(false);
    // 23:59 has no slot, but the earliest slot (08:00) must already be closed
    // once the Jakarta clock passes the 60 minute lead window.
    const now = new Date();
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        hour12: false,
      }).format(now),
    );
    const expected = hour * 60 + 60 > 480;
    expect(isSlotLeadTimePassed(today, '08:00')).toBe(expected);
  });
});
