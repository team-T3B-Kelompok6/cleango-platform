import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pushModel = vi.hoisted(() => ({
  listPushDevices: vi.fn().mockResolvedValue([]),
  unregisterPushDevice: vi.fn().mockResolvedValue(undefined),
}));

const mockGetAccessToken = vi.hoisted(() => vi.fn().mockResolvedValue('access-token'));

vi.mock('../src/model/customer-push-device.model.js', async () => ({
  ...pushModel,
}));

vi.mock('google-auth-library', async () => ({
  GoogleAuth: class GoogleAuth {
    getAccessToken = mockGetAccessToken;
  },
}));

import { notifyBookingCreated, notifyCustomerNotification } from '../src/lib/firebase-push.js';

const origEnv = { ...process.env };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAccessToken.mockResolvedValue('access-token');
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  process.env = { ...origEnv };
  process.env.CLEANGO_FCM_PROJECT_ID = 'test-project';
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/service-account.json';
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = origEnv;
});

function respondWith(status: number, json?: unknown) {
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    json: vi.fn().mockResolvedValue(json ?? {}),
  } as unknown as Response);
}

describe('notifyBookingCreated', () => {
  it('tidak mengirim saat FCM tidak dikonfigurasi', async () => {
    delete process.env.CLEANGO_FCM_PROJECT_ID;
    await notifyBookingCreated(10);
    expect(pushModel.listPushDevices).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('tidak mengirim saat tidak ada token push', async () => {
    pushModel.listPushDevices.mockResolvedValue([]);
    await notifyBookingCreated(10);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(pushModel.unregisterPushDevice).not.toHaveBeenCalled();
  });

  it('mengirim notifikasi pesanan ke setiap token', async () => {
    pushModel.listPushDevices.mockResolvedValue(['token-1', 'token-2']);
    respondWith(200, { name: 'projects/test-project/messages/1' });
    await notifyBookingCreated(10);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(pushModel.unregisterPushDevice).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));
    expect(payload.message.notification.title).toBe('CleanGo');
    expect(payload.message.notification.body).toBe('Pesanan sedang menunggu pembayaran.');
    expect(payload.message.data).toEqual({ type: 'order' });
    expect(payload.message.data.bookingId).toBeUndefined();
    expect(payload.message.data.notificationId).toBeUndefined();
    expect(payload.message.android.notification).toEqual({ channel_id: 'cleango_orders', icon: 'ic_notification' });
    const contentType = (init.headers as Record<string, string>)['Content-Type'];
    expect(String(contentType)).toBe('application/json; charset=utf-8');
  });

  it('menghapus token hanya untuk FcmError UNREGISTERED', async () => {
    pushModel.listPushDevices.mockResolvedValue(['unreg-token']);
    respondWith(400, {
      error: {
        code: 400,
        status: 'NOT_FOUND',
        message: 'Requested entity was not found.',
        details: [
          {
            '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError',
            errorCode: 'UNREGISTERED',
          },
        ],
      },
    });
    await notifyBookingCreated(10);
    expect(pushModel.unregisterPushDevice).toHaveBeenCalledWith(10, 'unreg-token');
  });

  it('tidak menghapus token untuk 404 generik tanpa FcmError UNREGISTERED', async () => {
    pushModel.listPushDevices.mockResolvedValue(['token-1']);
    respondWith(404, {
      error: { code: 404, status: 'NOT_FOUND', message: 'Not found.' },
    });
    await notifyBookingCreated(10);
    expect(pushModel.unregisterPushDevice).not.toHaveBeenCalled();
  });

  it('tidak menghapus token untuk permission denied', async () => {
    pushModel.listPushDevices.mockResolvedValue(['token-1']);
    respondWith(403, {
      error: { code: 403, status: 'PERMISSION_DENIED', message: 'Permission denied.' },
    });
    await notifyBookingCreated(10);
    expect(pushModel.unregisterPushDevice).not.toHaveBeenCalled();
  });

  it('tidak gagal aplikasi saat transport error', async () => {
    pushModel.listPushDevices.mockResolvedValue(['token-1']);
    fetchMock.mockRejectedValue(new Error('jaringan putus'));
    await expect(notifyBookingCreated(10)).resolves.toBeUndefined();
    expect(pushModel.unregisterPushDevice).not.toHaveBeenCalled();
  });

  it('sends durable payment event data for booking navigation', async () => {
    pushModel.listPushDevices.mockResolvedValue(['token-1']);
    respondWith(200);
    await notifyCustomerNotification({ notificationId: '88', userId: 10, bookingId: 19,
      type: 'payment', title: 'Pembayaran diterima', message: 'Pembayaran BK-1 diterima.' });
    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1].body));
    expect(payload.message.notification).toEqual({ title: 'Pembayaran diterima', body: 'Pembayaran BK-1 diterima.' });
    expect(payload.message.data).toEqual({ type: 'payment', notificationId: '88', bookingId: '19' });
  });

  it('tidak mengirim saat project ID tidak valid', async () => {
    process.env.CLEANGO_FCM_PROJECT_ID = 'Invalid Project ID!!';
    pushModel.listPushDevices.mockResolvedValue(['token-1']);
    await notifyBookingCreated(10);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(pushModel.unregisterPushDevice).not.toHaveBeenCalled();
  });
});
