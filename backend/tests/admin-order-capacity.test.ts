import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn(), getConnection: vi.fn() }));
vi.mock('../src/lib/db.js', () => ({ pool: db }));
import { addDays, createBooking } from '../src/model/booking.model.js';
import { insertBooking, updateBookingById } from '../src/model/order.model.js';

const date = addDays(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()), 1);
const input = { customerId: 10, customerName: 'Budi', serviceName: 'Deep', date, time: '10:00', price: 100000, status: 'Menunggu Assign', notes: '' };
let current: Record<string, unknown>;
let reservations: { id: number; start: number; duration: number }[];
let capacity: number;
let serviceDuration: number;
let tail: Promise<void>;
let connections: ReturnType<typeof connection>[];

// SQL boundary only: no server connection, migrations, or persistent writes.
function connection() {
  let unlock: (() => void) | undefined;
  let active = false;
  const conn = {
    beginTransaction: vi.fn(async () => { active = true; }),
    commit: vi.fn(async () => { active = false; }),
    rollback: vi.fn(async () => { active = false; }),
    release: vi.fn(),
    destroy: vi.fn(() => unlock?.()),
    execute: vi.fn(async (sql: string, args: unknown[] = []): Promise<unknown[]> => {
      if (sql.includes('GET_LOCK')) {
        expect(active).toBe(false);
        expect(args).toEqual(['cleango_booking_capacity']);
        const previous = tail;
        tail = new Promise<void>((resolve) => { unlock = resolve; });
        await previous;
        return [[{ ok: 1 }]];
      }
      if (sql.includes('RELEASE_LOCK')) {
        expect(active).toBe(false);
        expect(args).toEqual(['cleango_booking_capacity']);
        unlock?.();
        return [[{ ok: 1 }]];
      }
      expect(active).toBe(true);
      if (sql.includes('FROM payments')) return [[]];
      if (sql.includes('FOR UPDATE')) return [[current]];
      if (sql.includes('FROM services')) return [[{ id: 2, price: 100000, duration_minutes: serviceDuration }]];
      if (sql.includes('FROM cleaners')) return [[{ total: capacity }]];
      if (sql.includes('TIMESTAMPDIFF(MINUTE')) {
        expect(sql).toContain("status NOT IN ('cancelled', 'rescheduled')");
        expect(sql).not.toMatch(/payments|hold_until/);
        return [reservations.filter((row) => row.id !== args[1])];
      }
      if (sql.includes('SELECT id FROM bookings')) return [[]];
      if (sql.includes('FROM addresses')) return [[{ id: 5 }]];
      if (sql.includes('INSERT INTO bookings')) {
        const customerWrite = sql.includes('promo_id');
        const duration = Number(args[customerWrite ? 9 : 8]);
        expect(sql).toContain('service_duration_minutes');
        expect(duration).toBeGreaterThan(0);
        reservations.push({ id: 20, start: Number(String(args[customerWrite ? 6 : 5]).slice(0, 2)) * 60, duration });
        return [{ insertId: 20 }];
      }
      return [[]];
    }),
  };
  return conn;
}

beforeEach(() => {
  capacity = 1;
  serviceDuration = 120;
  reservations = [];
  current = { status: 'confirmed', customerId: 10, addressId: 5, serviceId: 1, duration: 120, date, time: '08:00', onHold: 0 };
  tail = Promise.resolve();
  connections = [];
  db.getConnection.mockReset().mockImplementation(async () => {
    const conn = connection();
    connections.push(conn);
    return conn;
  });
  db.query.mockReset().mockImplementation(async (sql: string) => sql.includes('FROM addresses')
    ? [[{ id: 5 }]]
    : [[{ id: 20, customerId: 10, customer: 'Budi', staffNames: '', databaseStatus: 'confirmed' }]]);
  db.execute.mockReset();
});

function writes(conn = connections[0]!) {
  return conn.execute.mock.calls.filter(([sql]) => /^(INSERT|UPDATE)/.test(sql.trim()));
}

function released(conn = connections[0]!) {
  expect(conn.execute.mock.calls.filter(([sql]) => sql.includes('RELEASE_LOCK'))).toHaveLength(1);
  expect(conn.release).toHaveBeenCalledOnce();
}

describe('admin capacity writes', () => {
  it('rejects create overlapping a full slot, rolls back and releases shared lock', async () => {
    reservations = [{ id: 7, start: 660, duration: 120 }];
    await expect(insertBooking(input)).rejects.toMatchObject({ statusCode: 409, code: 'SLOT_FULL' });
    expect(writes()).toEqual([]);
    expect(connections[0]!.rollback).toHaveBeenCalled();
    released();
  });

  it('stores positive service duration, preserving admin price and zero fee semantics', async () => {
    await insertBooking(input);
    const [sql, args] = writes()[0]!;
    expect(sql).toContain('?, 0, 0, ?, ?)');
    expect(args).toEqual([expect.any(String), 10, 2, 5, date, '10:00:00', null, 100000, 120, 100000, 'confirmed']);
    expect(connections[0]!.commit).toHaveBeenCalledOnce();
    expect(connections[0]!.execute.mock.calls.some(([query]) => /payments|payment_sessions/.test(query))).toBe(false);
    released();
  });

  it.each([0, -1, NaN, 1.5])('rejects invalid create duration %s without insert', async (duration) => {
    serviceDuration = duration;
    await expect(insertBooking(input)).rejects.toMatchObject({ code: 'INVALID_DURATION' });
    expect(writes()).toEqual([]);
    released();
  });

  it.each([{ time: '10:00' }, { date: addDays(date, 1) }, { serviceName: 'Deep' }])('checks full capacity for update %j', async (change) => {
    reservations = [{ id: 7, start: 480, duration: 480 }];
    await expect(updateBookingById(1, change)).rejects.toMatchObject({ code: 'SLOT_FULL' });
    expect(writes()).toEqual([]);
    expect(connections[0]!.rollback).toHaveBeenCalled();
    released();
  });

  it('releases lock and rolls back when update target disappeared', async () => {
    const conn = connection();
    const execute = conn.execute.getMockImplementation()!;
    conn.execute.mockImplementation(async (sql, args) => sql.includes('FOR UPDATE') ? [[]] : execute(sql, args));
    db.getConnection.mockResolvedValue(conn);
    await expect(updateBookingById(1, { time: '09:00' })).resolves.toBeNull();
    expect(conn.execute.mock.calls[0]?.[0]).toContain('GET_LOCK');
    expect(conn.execute.mock.calls[1]?.[0]).toContain('FOR UPDATE');
    expect(conn.rollback).toHaveBeenCalledOnce();
    released(conn);
  });

  it('excludes own booking, retains snapshot on time edit and refreshes on service change', async () => {
    reservations = [{ id: 1, start: 480, duration: 120 }];
    serviceDuration = 240;
    await updateBookingById(1, { time: '09:00' });
    expect(writes()[0]![0]).not.toContain('service_duration_minutes = ?');
    expect(connections[0]!.execute.mock.calls.find(([sql]) => sql.includes('TIMESTAMPDIFF'))?.[1]).toEqual([date, 1, 1080, date, date]);
    await updateBookingById(1, { serviceName: 'Deep' });
    expect(writes(connections[1])[0]).toEqual([expect.stringContaining('service_duration_minutes = ?'), [2, 240, '08:00:00', 1]]);
    released(connections[1]);
  });

  it('rejects zero snapshot on schedule update and zero duration on service change', async () => {
    current.duration = 0;
    await expect(updateBookingById(1, { time: '09:00' })).rejects.toMatchObject({ code: 'INVALID_DURATION' });
    serviceDuration = 0;
    await expect(updateBookingById(1, { serviceName: 'Deep' })).rejects.toMatchObject({ code: 'INVALID_DURATION' });
    for (const conn of connections) {
      expect(writes(conn)).toEqual([]);
      released(conn);
    }
  });

  it('checks rescheduled-to-confirmed reopening, not unrelated status/notes edits', async () => {
    reservations = [{ id: 7, start: 480, duration: 480 }];
    current.status = 'rescheduled';
    await expect(updateBookingById(1, { status: 'Menunggu Assign' })).rejects.toMatchObject({ code: 'SLOT_FULL' });
    released();
    current.status = 'assigned';
    current.date = '2020-01-01';
    current.duration = 0;
    await expect(updateBookingById(1, { status: 'Selesai', notes: 'done' })).resolves.toBeTruthy();
    expect(connections[1]!.execute.mock.calls.some(([sql]) => /GET_LOCK|TIMESTAMPDIFF/.test(sql))).toBe(false);
    expect(writes(connections[1])[0]?.[1]).toEqual(['done', 'completed', 1]);
    expect(connections[1]!.release).toHaveBeenCalledOnce();
  });

  it('allows unchanged schedule/service in status form without replacing historical snapshot', async () => {
    current.serviceId = 2;
    current.date = '2020-01-01';
    await updateBookingById(1, { date: '2020-01-01', time: '08:00', serviceName: 'Deep', status: 'Menunggu Lokasi' });
    expect(writes()[0]?.[0]).not.toContain('service_duration_minutes = ?');
    expect(connections[0]!.execute.mock.calls.find(([sql]) => sql.includes('FROM services'))).toEqual([
      expect.stringContaining('(is_active = TRUE OR id = ?)'), ['Deep', 2],
    ]);
    expect(connections[0]!.execute.mock.calls.some(([sql]) => sql.includes('TIMESTAMPDIFF'))).toBe(false);
    released();
  });

  it.each([{ date: '2026-02-30' }, { time: '10:30' }])('validates changed schedule %j before writes', async (change) => {
    await expect(updateBookingById(1, change)).rejects.toMatchObject({ statusCode: 400 });
    expect(writes()).toEqual([]);
    released();
  });

  it('serializes admin and customer overlapping writes with same named lock', async () => {
    const results = await Promise.allSettled([
      insertBooking(input),
      createBooking({ customerId: 11, serviceId: 3, addressId: 5, date, time: '11:00', notes: '' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(reservations).toHaveLength(1);
    for (const conn of connections) released(conn);
  });

  it.each(['create', 'update'])('destroys session rather than pooling leaked lock after %s', async (operation) => {
    const conn = connection();
    const execute = conn.execute.getMockImplementation()!;
    conn.execute.mockImplementation(async (sql, args) => {
      if (sql.includes('RELEASE_LOCK')) throw new Error('connection lost');
      return execute(sql, args);
    });
    db.getConnection.mockResolvedValue(conn);
    if (operation === 'create') await insertBooking(input);
    else await updateBookingById(1, { time: '09:00' });
    expect(conn.destroy).toHaveBeenCalledOnce();
    expect(conn.release).not.toHaveBeenCalled();
  });

  it('returns conflict on lock timeout without beginning transaction or releasing unowned lock', async () => {
    const conn = connection();
    conn.execute.mockResolvedValue([[{ ok: 0 }]]);
    db.getConnection.mockResolvedValue(conn);
    await expect(insertBooking(input)).rejects.toMatchObject({ code: 'BUSY' });
    expect(conn.beginTransaction).not.toHaveBeenCalled();
    expect(conn.execute).toHaveBeenCalledOnce();
    expect(conn.release).toHaveBeenCalledOnce();
  });
});
