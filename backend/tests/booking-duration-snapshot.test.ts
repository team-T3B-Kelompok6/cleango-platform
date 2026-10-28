import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(new URL('../database.sql', import.meta.url), 'utf8');
const bookingModel = readFileSync(
  new URL('../src/model/booking.model.ts', import.meta.url),
  'utf8',
);
const migration = readFileSync(
  new URL('../scripts/apply-database.mjs', import.meta.url),
  'utf8',
);

describe('booking SOP duration snapshot', () => {
  it('stores the SOP duration on the booking row', () => {
    const bookings = schema.slice(
      schema.indexOf('CREATE TABLE IF NOT EXISTS bookings'),
      schema.indexOf('CREATE TABLE IF NOT EXISTS cleaner_assignments'),
    );
    expect(bookings).toMatch(/service_duration_minutes SMALLINT UNSIGNED NOT NULL/);
  });

  it('adds the column to existing databases', () => {
    expect(migration).toContain("'service_duration_minutes'");
  });

  it('copies the catalog duration into the booking at insert time', () => {
    expect(bookingModel).toMatch(/SELECT price, duration_minutes FROM services/);
    expect(bookingModel).toMatch(/service_duration_minutes/);
  });

  it('reads the snapshot instead of the live catalog value', () => {
    expect(bookingModel).toMatch(
      /COALESCE\(b\.service_duration_minutes, s\.duration_minutes\) AS serviceDurationMinutes/,
    );
    expect(bookingModel).not.toMatch(/s\.duration_minutes AS serviceDurationMinutes/);
  });
});
