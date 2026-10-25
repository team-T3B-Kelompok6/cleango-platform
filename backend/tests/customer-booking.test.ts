import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/model/user.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/user.model.js')>()),
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));

const bookingModel = vi.hoisted(() => ({
  BOOKING_MAX_DAYS_AHEAD: 30,
  BookingConflictError: class BookingConflictError extends Error {
    constructor(public readonly reason: 'SLOT_FULL' | 'DUPLICATE' | 'BUSY') {
      super(reason);
    }
  },
  createBooking: vi.fn(),
  findBookableService: vi.fn(),
  findCustomerBooking: vi.fn(),
  findOwnedAddress: vi.fn(),
  findPrimaryAddressId: vi.fn(),
  listAvailability: vi.fn(),
}));

vi.mock('../src/model/booking.model.js', async () => {
  const actual = await vi.importActual<typeof import('../src/model/booking.model.js')>(
    '../src/model/booking.model.js',
  );
  return {
    ...actual,
    ...bookingModel,
    createBooking: bookingModel.createBooking,
    findBookableService: bookingModel.findBookableService,
    findCustomerBooking: bookingModel.findCustomerBooking,
    findOwnedAddress: bookingModel.findOwnedAddress,
    findPrimaryAddressId: bookingModel.findPrimaryAddressId,
    listAvailability: bookingModel.listAvailability,
  };
});

import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/lib/jwt.js';

const app = createApp();
const customerToken = createAccessToken({ id: 10, email: 'c@e.com', role: 'customer' } as never);
const adminToken = createAccessToken({ id: 1, email: 'a@e.com', role: 'admin' } as never);
const auth = (method: 'get' | 'post', path: string, token = customerToken) =>
  request(app)[method](path).set('Authorization', `Bearer ${token}`);

function tomorrow(): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + 1)).toISOString().slice(0, 10);
}

beforeEach(() => {
  bookingModel.createBooking.mockReset();
  bookingModel.findBookableService.mockReset();
  bookingModel.findCustomerBooking.mockReset();
  bookingModel.findOwnedAddress.mockReset();
  bookingModel.findPrimaryAddressId.mockReset();
  bookingModel.listAvailability.mockReset();

  bookingModel.createBooking.mockResolvedValue({ id: 77, code: 'CG-TEST' });
  bookingModel.findCustomerBooking.mockResolvedValue({ id: 77, code: 'CG-TEST', totalAmount: 105000 });
  bookingModel.findBookableService.mockResolvedValue({ id: 1, name: 'Basic', price: 100000, active: true });
  bookingModel.findOwnedAddress.mockResolvedValue({ id: 5, label: 'Rumah' });
  bookingModel.findPrimaryAddressId.mockResolvedValue(5);
  bookingModel.listAvailability.mockResolvedValue({ date: '2026-06-01', slots: [], serviceActive: true });
});

describe('customer booking auth', () => {
  it('requires a customer session for availability', async () => {
    expect((await request(app).get('/api/customer/bookings/availability?date=2026-06-01')).status).toBe(401);
  });
  it('rejects admin tokens', async () => {
    expect((await auth('get', '/api/customer/bookings/availability?date=2026-06-01', adminToken)).status).toBe(403);
  });
  it('requires a customer session to create a booking', async () => {
    expect((await request(app).post('/api/customer/bookings').send({})).status).toBe(401);
  });
});

describe('GET availability', () => {
  it('rejects a missing date', async () => {
    const response = await auth('get', '/api/customer/bookings/availability');
    expect(response.status).toBe(400);
    expect(response.body.errors.date).toBe('Tanggal wajib diisi.');
  });
  it('rejects a past date', async () => {
    const response = await auth('get', '/api/customer/bookings/availability?date=2000-01-01');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('PAST_DATE');
  });
  it('returns the slot board for a valid date', async () => {
    const response = await auth('get', `/api/customer/bookings/availability?date=${tomorrow()}`);
    expect(response.status).toBe(200);
  });
});

describe('POST booking validation', () => {
  const valid = () => ({
    serviceId: 1,
    addressId: 5,
    date: tomorrow(),
    time: '10:00',
    notes: 'Tolong bawa vacuum',
  });

  it('rejects an off-slot time before touching the database', async () => {
    const response = await auth('post', '/api/customer/bookings').send({ ...valid(), time: '09:30' });
    expect(response.status).toBe(400);
    expect(response.body.errors.time).toBe('Pilih salah satu slot yang tersedia.');
    expect(bookingModel.createBooking).not.toHaveBeenCalled();
  });

  it('rejects an inactive service', async () => {
    bookingModel.findBookableService.mockResolvedValue({ id: 1, name: 'X', price: 1000, active: false });
    const response = await auth('post', '/api/customer/bookings').send(valid());
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('SERVICE_INACTIVE');
    expect(bookingModel.createBooking).not.toHaveBeenCalled();
  });

  it('rejects an address that is not owned', async () => {
    bookingModel.findOwnedAddress.mockResolvedValue(null);
    const response = await auth('post', '/api/customer/bookings').send(valid());
    expect(response.status).toBe(404);
    expect(bookingModel.createBooking).not.toHaveBeenCalled();
  });

  it('requires an address when the customer has none', async () => {
    bookingModel.findPrimaryAddressId.mockResolvedValue(null);
    const response = await auth('post', '/api/customer/bookings').send({
      serviceId: 1,
      date: tomorrow(),
      time: '10:00',
    });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('ADDRESS_REQUIRED');
  });

  it('creates a booking and returns it scoped to the customer', async () => {
    const response = await auth('post', '/api/customer/bookings').send(valid());
    expect(response.status).toBe(201);
    expect(response.body.data.code).toBe('CG-TEST');
    expect(bookingModel.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 10, serviceId: 1, addressId: 5, time: '10:00' }),
    );
    expect(bookingModel.findCustomerBooking).toHaveBeenCalledWith(10, 77);
  });

  it('maps a duplicate request to 409', async () => {
    bookingModel.createBooking.mockRejectedValue(new bookingModel.BookingConflictError('DUPLICATE'));
    const response = await auth('post', '/api/customer/bookings').send(valid());
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('DUPLICATE_BOOKING');
  });

  it('maps a full slot to 409', async () => {
    bookingModel.createBooking.mockRejectedValue(new bookingModel.BookingConflictError('SLOT_FULL'));
    const response = await auth('post', '/api/customer/bookings').send(valid());
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('SLOT_FULL');
  });

  it('maps a concurrent slot lock to 409 instead of 500', async () => {
    bookingModel.createBooking.mockRejectedValue(new bookingModel.BookingConflictError('BUSY'));
    const response = await auth('post', '/api/customer/bookings').send(valid());
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('BOOKING_BUSY');
  });
});

describe('GET booking scoping', () => {
  it('404s when the booking is not owned', async () => {
    bookingModel.findCustomerBooking.mockResolvedValue(null);
    const response = await auth('get', '/api/customer/bookings/999');
    expect(response.status).toBe(404);
    expect(bookingModel.findCustomerBooking).toHaveBeenCalledWith(10, 999);
  });
});
