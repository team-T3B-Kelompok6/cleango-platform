import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const db = vi.hoisted(() => ({ execute: vi.fn(), query: vi.fn() }));
const chat = vi.hoisted(() => ({ databaseEnabled: false, groq: vi.fn() }));
vi.mock('../src/lib/db.js', () => ({ pool: db }));
vi.mock('../src/model/user.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/user.model.js')>()),
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));
vi.mock('../src/config/env.js', async (original) => {
  const actual = await original<typeof import('../src/config/env.js')>();
  return {
    getEnv: () => ({ ...actual.getEnv(), CHATBOT_DATABASE_ENABLED: chat.databaseEnabled }),
  };
});
vi.mock('../src/lib/groq-chat.js', async (original) => ({
  ...(await original<typeof import('../src/lib/groq-chat.js')>()),
  askGroq: chat.groq,
}));

import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/lib/jwt.js';
import { replyToChat } from '../src/lib/chatbot.js';

const app = createApp();
const token = createAccessToken({ id: 10, email: 'customer@example.test', role: 'customer' } as never);

beforeEach(() => {
  vi.clearAllMocks();
  db.execute.mockReset();
  db.query.mockReset().mockResolvedValue([[]]);
  chat.databaseEnabled = false;
  chat.groq.mockResolvedValue({ answer: 'Refund otomatis disetujui.' });
});

describe('customer booking payment method query and API regression', () => {
  for (const path of ['/api/customer/bookings', '/api/customer/bookings/77']) {
    it.each(['cash', 'qris', 'dana', 'gopay', null])(
      `${path} returns paymentMethod %s from the owned booking query`,
      async (paymentMethod) => {
        db.execute.mockResolvedValue([[{
          id: 77,
          code: 'CG-TEST',
          databaseStatus: 'cancelled',
          status: 'cancelled',
          paymentStatus: paymentMethod === null ? null : 'paid',
          paymentMethod,
          canCancel: 0,
          canReschedule: 0,
        }]]);
        const response = await request(app).get(path).set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        const booking = Array.isArray(response.body.data) ? response.body.data[0] : response.body.data;
        expect(booking.paymentMethod).toBe(paymentMethod);
        expect(booking.paymentStatus).toBe(paymentMethod === null ? null : 'paid');
        const [sql, parameters] = db.execute.mock.calls[0]!;
        expect(sql).toContain('pay.method AS paymentMethod');
        expect(sql).toContain('LEFT JOIN payments pay ON pay.booking_id = b.id');
        expect(sql).toContain('b.customer_id = ?');
        expect(parameters).toEqual(path.endsWith('/77') ? [77, 10] : [10]);
        expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\b/i);
        expect(db.execute).toHaveBeenCalledTimes(1);
        expect(db.query).not.toHaveBeenCalled();
      },
    );
  }
});

describe.each([false, true])('Boo manual refund guidance with database enabled=%s', (enabled) => {
  it.each([
    'Bagaimana cara refund?',
    'Pengembalian dana setelah pembatalan?',
    'refun otomatis?',
    'Refund pesanan saya CG-123?',
    'Saya komplain hasilnya kurang bersih dan ingin refund',
    'Tolong batalkan pesanan saya dan refund',
  ])('keeps refund manual with the configured CS contact: %s', async (message) => {
    chat.databaseEnabled = enabled;
    db.execute.mockResolvedValue([[]]);
    const result = await replyToChat({ message, history: [] }, 10);
    expect(result.answer).toContain('082140636747');
    expect(result.answer).toContain('refund manual');
    expect(result.answer).toContain('tidak memicu refund otomatis');
    expect(result.answer).toContain('Boo tidak memproses refund');
    expect(result.answer).not.toContain('Refund otomatis disetujui');
    expect(chat.groq).not.toHaveBeenCalled();
    expect(result.attempts).toBe(0);
    expect(result.answer.length).toBeLessThanOrEqual(2500);
    for (const [sql] of [...db.execute.mock.calls, ...db.query.mock.calls])
      expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\b/i);
    if (!enabled) {
      expect(db.execute).not.toHaveBeenCalled();
      expect(db.query).not.toHaveBeenCalled();
    }
  });
});
