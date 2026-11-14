import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ execute: vi.fn(), getConnection: vi.fn() }));
vi.mock('../src/lib/db.js', () => ({ pool: db }));
import {
  addDays,
  BookingConflictError,
  createBooking,
  listAvailability,
  rescheduleCustomerBooking,
} from '../src/model/booking.model.js';

const date = addDays(
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(
    new Date(),
  ),
  1,
);
const input = {
  customerId: 10,
  serviceId: 2,
  addressId: 5,
  date,
  time: '10:00' as const,
  notes: '',
};
type Reservation = {
  id: number;
  customerId: number;
  serviceId: number;
  date: string;
  start: number;
  duration: number;
};

function intervalsFor(args: unknown[]) {
  const [requestedDate, excluded, latestEnd] = args;
  return bookings
    .filter((b) => b.id !== excluded)
    .map((b) => ({
      ...b,
      start:
        (Date.parse(b.date) - Date.parse(String(requestedDate))) / 60000 +
        b.start,
    }))
    .filter((b) => b.start < Number(latestEnd) && b.start + b.duration > 0);
}
let bookings: Reservation[];
let capacity: number;
let unlock: (() => void) | undefined;
let tail: Promise<void>;
let connections: ReturnType<typeof connection>[];

// In-memory SQL boundary: no server connection or database writes.
function connection() {
  let releaseLock: (() => void) | undefined;
  let active = false;
  const conn = {
    beginTransaction: vi.fn(async () => {
      active = true;
    }),
    commit: vi.fn(async () => {
      active = false;
    }),
    rollback: vi.fn(async () => {
      active = false;
    }),
    release: vi.fn(),
    destroy: vi.fn(() => releaseLock?.()),
    execute: vi.fn(
      async (sql: string, args: unknown[] = []): Promise<unknown[]> => {
        if (sql.includes('GET_LOCK')) {
          expect(args).toEqual(['cleango_booking_capacity']);
          const previous = tail;
          tail = new Promise<void>((resolve) => {
            releaseLock = resolve;
          });
          await previous;
          unlock = releaseLock;
          return [[{ ok: 1 }]];
        }
        if (sql.includes('RELEASE_LOCK')) {
          expect(active).toBe(false);
          releaseLock?.();
          return [[{ ok: 1 }]];
        }
        expect(active).toBe(true);
        if (sql.includes('LEFT JOIN cleaner_assignments'))
          return [
            [
              {
                status: 'confirmed',
                serviceId: 2,
                duration: 120,
                date,
                time: '08:00',
                assignmentId: null,
              },
            ],
          ];
        if (sql.includes('FROM bookings') && sql.includes('customer_id = ?')) {
          expect(sql).toContain('service_id = ?');
          const [customerId, serviceId, requestedDate, time, excluded] = args;
          const start = Number(String(time).slice(0, 2)) * 60;
          return [
            bookings.filter(
              (b) =>
                b.customerId === customerId &&
                b.serviceId === serviceId &&
                b.date === requestedDate &&
                b.start === start &&
                b.id !== excluded,
            ),
          ];
        }
        if (sql.includes('FROM services'))
          return [[{ id: 2, price: 100000, duration_minutes: 120 }]];
        if (sql.includes('FROM cleaners')) return [[{ total: capacity }]];
        if (sql.includes('TIMESTAMPDIFF(MINUTE')) {
          expect(sql).toContain("status NOT IN ('cancelled', 'rescheduled')");
          expect(sql).not.toContain('hold_until');
          expect(args).toEqual([args[0], args[1], 1080, args[0], args[0]]);
          return [intervalsFor(args)];
        }
        if (sql.includes('FROM addresses')) return [[{ id: 5 }]];
        if (sql.includes('INSERT INTO bookings')) {
          expect(sql).toContain("'awaiting_payment'");
          const id = bookings.length + 1;
          bookings.push({
            id,
            customerId: Number(args[1]),
            serviceId: Number(args[2]),
            date: String(args[5]),
            start: Number(String(args[6]).slice(0, 2)) * 60,
            duration: Number(args[9]),
          });
          return [{ insertId: id }];
        }
        return [[]];
      },
    ),
  };
  return conn;
}

beforeEach(() => {
  bookings = [];
  capacity = 2;
  tail = Promise.resolve();
  unlock = undefined;
  connections = [];
  db.getConnection.mockReset().mockImplementation(async () => {
    const conn = connection();
    connections.push(conn);
    return conn;
  });
  db.execute
    .mockReset()
    .mockImplementation(async (sql: string, args: unknown[] = []) => {
      if (sql.includes('FROM services'))
        return [[{ is_active: 1, duration_minutes: 120 }]];
      if (sql.includes('FROM cleaners')) return [[{ total: capacity }]];
      if (sql.includes('TIME_FORMAT(scheduled_start_time')) {
        expect(sql).toContain("status NOT IN ('cancelled', 'rescheduled')");
        expect(sql).not.toContain('hold_until');
        expect(sql).toContain('scheduled_date = ?');
        return [
          bookings
            .filter(
              (b) =>
                b.customerId === args[0] &&
                b.serviceId === args[1] &&
                b.date === args[2],
            )
            .map((b) => ({
              slot: `${String(b.start / 60).padStart(2, '0')}:00`,
            })),
        ];
      }
      if (sql.includes('TIMESTAMPDIFF(MINUTE')) {
        expect(args).toEqual([args[0], 0, 1080, args[0], args[0]]);
        expect(sql).toContain(
          'TIMESTAMP(scheduled_date, scheduled_start_time)',
        );
        return [intervalsFor(args)];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
});

function reserve(
  start: number,
  duration: number,
  serviceId = 1,
  customerId = 10,
  bookingDate = date,
) {
  bookings.push({
    id: bookings.length + 1,
    customerId,
    serviceId,
    date: bookingDate,
    start,
    duration,
  });
}

describe('booking duration capacity', () => {
  it('reserves 11:00 on one future date and keeps the next date independent', async () => {
    capacity = 1;
    const date13 = addDays(date, 1);
    const date14 = addDays(date, 2);
    reserve(660, 120, 2, 10, date13);
    const day13 = await listAvailability(date13, 2, 10);
    expect(day13.slots.find((s) => s.time === '11:00')).toMatchObject({
      available: false,
      reason: 'Anda sudah memesan layanan pada slot ini.',
    });
    const day14 = await listAvailability(date14, 2, 10);
    expect(day14.slots.find((s) => s.time === '11:00')).toMatchObject({
      available: true,
    });
    await expect(
      createBooking({ ...input, date: date14, time: '11:00' }),
    ).resolves.toHaveProperty('id');
  });

  it('allows different services for the same customer/date/time, rejects same-service duplicates', async () => {
    reserve(600, 120);
    await expect(createBooking(input)).resolves.toHaveProperty('id');
    await expect(createBooking(input)).rejects.toMatchObject({
      reason: 'DUPLICATE',
    });
    expect(bookings).toHaveLength(2);
  });

  it('hides only the signed-in customer same-service start while capacity remains', async () => {
    capacity = 3;
    reserve(600, 120, 2);
    const own = await listAvailability(date, 2, 10);
    expect(own.slots.find((s) => s.time === '10:00')).toMatchObject({
      available: false,
      reason: 'Anda sudah memesan layanan pada slot ini.',
    });
    expect(own.slots.find((s) => s.time === '11:00')?.available).toBe(true);
    expect(
      (await listAvailability(date, 1, 10)).slots.find(
        (s) => s.time === '10:00',
      )?.available,
    ).toBe(true);
    expect(
      (await listAvailability(date, 2, 11)).slots.find(
        (s) => s.time === '10:00',
      )?.available,
    ).toBe(true);
    expect(
      (await listAvailability(date, 2)).slots.find((s) => s.time === '10:00')
        ?.available,
    ).toBe(true);
  });

  it('still rejects different-service requests when overlapping duration exhausts cleaners', async () => {
    capacity = 1;
    reserve(660, 120, 1);
    expect(
      (await listAvailability(date, 2, 10)).slots.find(
        (s) => s.time === '10:00',
      ),
    ).toMatchObject({
      available: false,
      reason: 'Slot sudah penuh.',
    });
    await expect(createBooking(input)).rejects.toMatchObject({
      reason: 'SLOT_FULL',
    });
    expect(bookings).toHaveLength(1);
  });

  it('serializes different start slots so overlapping parallel requests cannot exceed capacity', async () => {
    capacity = 1;
    const results = await Promise.allSettled([
      createBooking(input),
      createBooking({ ...input, time: '11:00', serviceId: 3 }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r) => r.status === 'rejected');
    expect(failed?.status === 'rejected' && failed.reason).toBeInstanceOf(
      BookingConflictError,
    );
    expect(failed?.status === 'rejected' && failed.reason.reason).toBe(
      'SLOT_FULL',
    );
    for (const conn of connections) expect(conn.release).toHaveBeenCalledOnce();
  });

  it('checks peak simultaneous usage, not the count of all intersecting bookings', async () => {
    reserve(600, 60);
    reserve(660, 60);
    await expect(createBooking(input)).resolves.toHaveProperty('id');
  });

  it('uses duration for every displayed start slot and permits touching endpoints', async () => {
    capacity = 1;
    reserve(660, 120);
    const board = await listAvailability(date, 2);
    expect(board.slots.find((s) => s.time === '09:00')?.available).toBe(true);
    expect(board.slots.find((s) => s.time === '10:00')?.available).toBe(false);
    expect(board.slots.find((s) => s.time === '12:00')?.available).toBe(false);
    expect(board.slots.find((s) => s.time === '13:00')?.available).toBe(true);
  });

  it('includes previous-day intervals returned by SQL and fails closed with zero cleaners', async () => {
    capacity = 1;
    reserve(-480, 1080);
    expect((await listAvailability(date, 2)).slots[0]?.available).toBe(false);
    capacity = 0;
    bookings = [];
    expect(
      (await listAvailability(date, 2)).slots.every((s) => !s.available),
    ).toBe(true);
    await expect(createBooking(input)).rejects.toMatchObject({
      reason: 'SLOT_FULL',
    });
    expect(connections[0]?.rollback).toHaveBeenCalled();
  });

  it('reschedules different services together but checks duration and excludes its own reservation', async () => {
    reserve(480, 120, 2);
    reserve(600, 120, 1);
    await expect(
      rescheduleCustomerBooking(10, 1, date, '10:00'),
    ).resolves.toEqual({ ok: true });
    reserve(660, 120, 3, 11);
    await expect(
      rescheduleCustomerBooking(10, 1, date, '10:00'),
    ).resolves.toEqual({ ok: false, reason: 'SLOT_FULL' });
    reserve(600, 60, 2);
    await expect(
      rescheduleCustomerBooking(10, 1, date, '10:00'),
    ).resolves.toEqual({ ok: false, reason: 'DUPLICATE' });
  });

  it('destroys rather than pools a session when releasing its named lock fails', async () => {
    const conn = connection();
    const execute = conn.execute.getMockImplementation()!;
    conn.execute.mockImplementation(async (sql, args) => {
      if (sql.includes('RELEASE_LOCK')) throw new Error('connection lost');
      return execute(sql, args);
    });
    db.getConnection.mockResolvedValue(conn);
    await createBooking(input);
    expect(conn.destroy).toHaveBeenCalledOnce();
    expect(conn.release).not.toHaveBeenCalled();
    unlock?.();
  });
});
