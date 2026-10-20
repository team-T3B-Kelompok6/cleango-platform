import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const notificationModel = vi.hoisted(() => ({
  listNotifications: vi.fn(),
  countUnreadNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}));
vi.mock('../src/model/notification.model.js', () => notificationModel);

import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/lib/jwt.js';

const app = createApp();
const customerToken = createAccessToken({ id: 10, email: 'c@e.com', role: 'customer' } as never);
const adminToken = createAccessToken({ id: 1, email: 'a@e.com', role: 'admin' } as never);

beforeEach(() => {
  notificationModel.listNotifications.mockReset();
  notificationModel.countUnreadNotifications.mockReset();
  notificationModel.markNotificationRead.mockReset();
  notificationModel.listNotifications.mockResolvedValue([
    { id: '1', type: 'order', title: 'Pesanan Dikonfirmasi', message: 'Pesanan dibuat.', isRead: false, createdAt: '2026-10-20T00:00:00.000Z', bookingId: '9' },
  ]);
  notificationModel.countUnreadNotifications.mockResolvedValue(1);
  notificationModel.markNotificationRead.mockResolvedValue(true);
});

describe('customer notifications', () => {
  it('requires auth', async () => {
    expect((await request(app).get('/api/customer/notifications')).status).toBe(401);
  });

  it('rejects admin', async () => {
    expect(
      (await request(app).get('/api/customer/notifications').set('Authorization', `Bearer ${adminToken}`)).status,
    ).toBe(403);
  });

  it('lists the inbox with an unread count for the session user', async () => {
    const response = await request(app)
      .get('/api/customer/notifications')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.unread).toBe(1);
    expect(notificationModel.listNotifications).toHaveBeenCalledWith(10);
  });

  it('marks a notification read only for the owner', async () => {
    const response = await request(app)
      .patch('/api/customer/notifications/1/read')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(200);
    expect(notificationModel.markNotificationRead).toHaveBeenCalledWith(10, 1);
  });

  it('404s when the notification belongs to someone else', async () => {
    notificationModel.markNotificationRead.mockResolvedValue(false);
    const response = await request(app)
      .patch('/api/customer/notifications/99/read')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(404);
  });

  it('rejects an invalid notification id', async () => {
    const response = await request(app)
      .patch('/api/customer/notifications/bukan-id/read')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(400);
    expect(notificationModel.markNotificationRead).not.toHaveBeenCalled();
  });
});
