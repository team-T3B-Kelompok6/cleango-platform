import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/model/payment.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/payment.model.js')>()),
  refreshBookingPayment: vi.fn().mockResolvedValue(undefined),
}));

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
  cancelCustomerBooking: vi.fn(),
  rescheduleCustomerBooking: vi.fn(),
  listCustomerBookings: vi.fn(),
  createBooking: vi.fn(),
  findBookableService: vi.fn(),
  findCustomerBooking: vi.fn(),
  findOwnedAddress: vi.fn(),
  findPrimaryAddressId: vi.fn(),
  listAvailability: vi.fn(),
  resolveBookableServiceId: vi.fn(),
}));

vi.mock('../src/model/booking.model.js', async () => {
  const actual = await vi.importActual<
    typeof import('../src/model/booking.model.js')
  >('../src/model/booking.model.js');
  return {
    ...actual,
    ...bookingModel,
    cancelCustomerBooking: bookingModel.cancelCustomerBooking,
    createBooking: bookingModel.createBooking,
    findBookableService: bookingModel.findBookableService,
    findCustomerBooking: bookingModel.findCustomerBooking,
    findOwnedAddress: bookingModel.findOwnedAddress,
    findPrimaryAddressId: bookingModel.findPrimaryAddressId,
    listAvailability: bookingModel.listAvailability,
    resolveBookableServiceId: bookingModel.resolveBookableServiceId,
  };
});

import { refreshBookingPayment } from '../src/model/payment.model.js';
import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/lib/jwt.js';

const app = createApp();
const customerToken = createAccessToken({
  id: 10,
  email: 'c@e.com',
  role: 'customer',
} as never);
const adminToken = createAccessToken({
  id: 1,
  email: 'a@e.com',
  role: 'admin',
} as never);
const auth = (method: 'get' | 'post', path: string, token = customerToken) =>
  request(app)[method](path).set('Authorization', `Bearer ${token}`);

function tomorrow(): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
  }).format(new Date());
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + 1)).toISOString().slice(0, 10);
}

beforeEach(() => {
  vi.mocked(refreshBookingPayment).mockClear();
  bookingModel.cancelCustomerBooking.mockReset();
  bookingModel.rescheduleCustomerBooking
    .mockReset()
    .mockResolvedValue({ ok: true });
  bookingModel.listCustomerBookings.mockReset().mockResolvedValue([]);
  bookingModel.createBooking.mockReset();
  bookingModel.findBookableService.mockReset();
  bookingModel.findCustomerBooking.mockReset();
  bookingModel.findOwnedAddress.mockReset();
  bookingModel.findPrimaryAddressId.mockReset();
  bookingModel.listAvailability.mockReset();
  bookingModel.resolveBookableServiceId.mockReset();

  bookingModel.cancelCustomerBooking.mockResolvedValue({ ok: true });
  bookingModel.createBooking.mockResolvedValue({ id: 77, code: 'CG-TEST' });
  bookingModel.findCustomerBooking.mockResolvedValue({
    id: 77,
    code: 'CG-TEST',
    totalAmount: 105000,
  });
  bookingModel.findBookableService.mockResolvedValue({
    id: 1,
    name: 'Basic',
    price: 100000,
    active: true,
  });
  bookingModel.findOwnedAddress.mockResolvedValue({ id: 5, label: 'Rumah' });
  bookingModel.findPrimaryAddressId.mockResolvedValue(5);
  bookingModel.listAvailability.mockResolvedValue({
    date: '2026-06-01',
    slots: [],
    serviceActive: true,
  });
  bookingModel.resolveBookableServiceId.mockResolvedValue(1);
});

describe('GET customer booking payment refresh', () => {
  it('refreshes unpaid digital payment from the provider before returning booking', async () => {
    bookingModel.findCustomerBooking
      .mockResolvedValueOnce({
        id: 77,
        paymentStatus: 'pending',
        paymentMethod: 'qris',
      })
      .mockResolvedValueOnce({
        id: 77,
        paymentStatus: 'paid',
        paymentMethod: 'qris',
      });
    const response = await auth('get', '/api/customer/bookings/77');
    expect(response.status).toBe(200);
    expect(response.body.data.paymentStatus).toBe('paid');
    expect(refreshBookingPayment).toHaveBeenCalledWith(10, 77);
    expect(bookingModel.findCustomerBooking).toHaveBeenCalledTimes(2);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('does not call provider for cash or paid bookings', async () => {
    bookingModel.findCustomerBooking.mockResolvedValue({
      id: 77,
      paymentStatus: 'pending',
      paymentMethod: 'cash',
    });
    expect((await auth('get', '/api/customer/bookings/77')).status).toBe(200);
    expect(refreshBookingPayment).not.toHaveBeenCalled();
    bookingModel.findCustomerBooking.mockResolvedValue({
      id: 77,
      paymentStatus: 'paid',
      paymentMethod: 'qris',
    });
    expect((await auth('get', '/api/customer/bookings/77')).status).toBe(200);
    expect(refreshBookingPayment).not.toHaveBeenCalled();
  });
});

describe('customer booking auth', () => {
  it('requires a customer session for availability', async () => {
    expect(
      (
        await request(app).get(
          '/api/customer/bookings/availability?date=2026-06-01',
        )
      ).status,
    ).toBe(401);
  });
  it('rejects admin tokens', async () => {
    expect(
      (
        await auth(
          'get',
          '/api/customer/bookings/availability?date=2026-06-01',
          adminToken,
        )
      ).status,
    ).toBe(403);
  });
  it('requires a customer session to create a booking', async () => {
    expect(
      (await request(app).post('/api/customer/bookings').send({})).status,
    ).toBe(401);
  });
});

describe('GET availability', () => {
  it('rejects a missing date', async () => {
    const response = await auth('get', '/api/customer/bookings/availability');
    expect(response.status).toBe(400);
    expect(response.body.errors.date).toBe('Tanggal wajib diisi.');
  });
  it('rejects a past date', async () => {
    const response = await auth(
      'get',
      '/api/customer/bookings/availability?date=2000-01-01',
    );
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('PAST_DATE');
  });
  it('returns the slot board for a valid date', async () => {
    const response = await auth(
      'get',
      `/api/customer/bookings/availability?date=${tomorrow()}`,
    );
    expect(response.status).toBe(200);
    expect(bookingModel.listAvailability).toHaveBeenCalledWith(
      tomorrow(),
      null,
      10,
    );
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('uses authenticated customer, not customerId query input, for service duplicates', async () => {
    const response = await auth(
      'get',
      `/api/customer/bookings/availability?date=${tomorrow()}&service=sofa&customerId=99`,
    );
    expect(response.status).toBe(200);
    expect(bookingModel.resolveBookableServiceId).toHaveBeenCalledWith('sofa');
    expect(bookingModel.listAvailability).toHaveBeenCalledWith(
      tomorrow(),
      1,
      10,
    );
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
    const response = await auth('post', '/api/customer/bookings').send({
      ...valid(),
      time: '09:30',
    });
    expect(response.status).toBe(400);
    expect(response.body.errors.time).toBe(
      'Pilih salah satu slot yang tersedia.',
    );
    expect(bookingModel.createBooking).not.toHaveBeenCalled();
    expect(bookingModel.resolveBookableServiceId).not.toHaveBeenCalled();
  });

  it('resolves a service slug before creating a booking with its numeric ID', async () => {
    const response = await auth('post', '/api/customer/bookings').send({
      ...valid(),
      serviceId: 'basic-home-cleaning',
    });
    expect(response.status).toBe(201);
    expect(bookingModel.resolveBookableServiceId).toHaveBeenCalledWith(
      'basic-home-cleaning',
    );
    expect(bookingModel.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ serviceId: 1 }),
    );
  });

  it('rejects an inactive service', async () => {
    bookingModel.findBookableService.mockResolvedValue({
      id: 1,
      name: 'X',
      price: 1000,
      active: false,
    });
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
      expect.objectContaining({
        customerId: 10,
        serviceId: 1,
        addressId: 5,
        time: '10:00',
      }),
    );
    expect(bookingModel.findCustomerBooking).toHaveBeenCalledWith(10, 77);
    expect(bookingModel.resolveBookableServiceId).toHaveBeenCalledWith('1');
  });

  it('maps a duplicate request to 409', async () => {
    bookingModel.createBooking.mockRejectedValue(
      new bookingModel.BookingConflictError('DUPLICATE'),
    );
    const response = await auth('post', '/api/customer/bookings').send(valid());
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('DUPLICATE_BOOKING');
  });

  it('maps a full slot to 409', async () => {
    bookingModel.createBooking.mockRejectedValue(
      new bookingModel.BookingConflictError('SLOT_FULL'),
    );
    const response = await auth('post', '/api/customer/bookings').send(valid());
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('SLOT_FULL');
  });

  it('maps a concurrent slot lock to 409 instead of 500', async () => {
    bookingModel.createBooking.mockRejectedValue(
      new bookingModel.BookingConflictError('BUSY'),
    );
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

describe('customer reschedule API', () => {
  const path = '/api/customer/bookings/77/reschedule';
  const valid = () => ({ date: tomorrow(), time: '10:00' });

  it('requires customer authentication', async () => {
    expect((await request(app).post(path).send(valid())).status).toBe(401);
    expect((await auth('post', path, adminToken).send(valid())).status).toBe(
      403,
    );
    expect(bookingModel.rescheduleCustomerBooking).not.toHaveBeenCalled();
  });

  it('returns standard data and passes only the session owner, id and schedule', async () => {
    bookingModel.findCustomerBooking.mockResolvedValue({
      id: 77,
      date: tomorrow(),
      time: '10:00',
      canCancel: true,
      canReschedule: true,
    });
    const response = await auth('post', path).send({
      ...valid(),
      customerId: 99,
      totalAmount: 1,
      status: 'completed',
    });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: 77,
      canCancel: true,
      canReschedule: true,
    });
    expect(bookingModel.rescheduleCustomerBooking).toHaveBeenCalledWith(
      10,
      77,
      tomorrow(),
      '10:00',
    );
    expect(bookingModel.findCustomerBooking).toHaveBeenCalledWith(10, 77);
  });

  it.each([
    [{}, 'INVALID_DATE'],
    [{ date: '2026-02-30', time: '10:00' }, 'INVALID_DATE'],
    [{ date: '2000-01-01', time: '10:00' }, 'PAST_DATE'],
    [{ date: '2999-01-01', time: '10:00' }, 'TOO_FAR'],
    [{ time: '09:30' }, 'VALIDATION_ERROR'],
    [{ time: 10 }, 'VALIDATION_ERROR'],
  ])('rejects invalid schedule %j', async (body, code) => {
    const response = await auth('post', path).send(
      'date' in body || !Object.keys(body).length
        ? body
        : { date: tomorrow(), ...body },
    );
    expect(response.status).toBe(400);
    expect(response.body.code).toBe(code);
    expect(bookingModel.rescheduleCustomerBooking).not.toHaveBeenCalled();
  });

  it.each([
    ['NOT_FOUND', 404, 'APP_ERROR'],
    ['NOT_ALLOWED', 409, 'RESCHEDULE_NOT_ALLOWED'],
    ['ALREADY_ASSIGNED', 409, 'ALREADY_ASSIGNED'],
    ['SLOT_FULL', 409, 'SLOT_FULL'],
    ['DUPLICATE', 409, 'DUPLICATE_BOOKING'],
    ['BUSY', 409, 'BOOKING_BUSY'],
    ['SERVICE_INACTIVE', 400, 'SERVICE_INACTIVE'],
    ['SLOT_CLOSED', 400, 'SLOT_CLOSED'],
  ])('maps %s', async (reason, status, code) => {
    bookingModel.rescheduleCustomerBooking.mockResolvedValue({
      ok: false,
      reason,
    });
    const response = await auth('post', path).send(valid());
    expect(response.status).toBe(status);
    expect(response.body.code).toBe(code);
  });

  it('returns both capability booleans in the booking list', async () => {
    bookingModel.listCustomerBookings.mockResolvedValue([
      {
        id: 77,
        databaseStatus: 'awaiting_payment',
        canCancel: 1,
        canReschedule: 1,
      },
    ]);
    const response = await auth('get', '/api/customer/bookings');
    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      status: 'Menunggu Pembayaran',
      canCancel: true,
      canReschedule: true,
    });
  });
});

describe('customer booking cancellation', () => {
  it('cancels only the session customer booking', async () => {
    const response = await auth('post', '/api/customer/bookings/77/cancel');
    expect(response.status).toBe(200);
    expect(bookingModel.cancelCustomerBooking).toHaveBeenCalledWith(10, 77);
  });

  it('maps an ineligible status to 409', async () => {
    bookingModel.cancelCustomerBooking.mockResolvedValue({
      ok: false,
      reason: 'NOT_ALLOWED',
    });
    const response = await auth('post', '/api/customer/bookings/77/cancel');
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('CANCEL_NOT_ALLOWED');
  });

  it('maps an assigned booking to 409', async () => {
    bookingModel.cancelCustomerBooking.mockResolvedValue({
      ok: false,
      reason: 'ALREADY_ASSIGNED',
    });
    const response = await auth('post', '/api/customer/bookings/77/cancel');
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('ALREADY_ASSIGNED');
  });
});
