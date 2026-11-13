import { createHash } from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';

const execute = vi.hoisted(() => vi.fn().mockResolvedValue([[]]));
vi.mock('../src/lib/db.js', () => ({ pool: { execute } }));
import { registerPushDevice, unregisterPushDevice, listPushDevices } from '../src/model/customer-push-device.model.js';

beforeEach(() => execute.mockClear());

it('registers atomically with hash uniqueness and authenticated owner', async () => {
  const token = 'device-token';
  await registerPushDevice(42, token);
  const [sql, params] = execute.mock.calls[0];
  expect(sql).toContain('ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)');
  expect(params).toEqual([42, createHash('sha256').update(token).digest(), token]);
  expect(execute).toHaveBeenCalledTimes(1);
});

it('unregister cannot delete another user token', async () => {
  await unregisterPushDevice(7, 'device-token');
  expect(execute.mock.calls[0][0]).toContain('WHERE user_id = ? AND token_hash = ?');
  expect(execute.mock.calls[0][1][0]).toBe(7);
});

it('lists devices only for recipient', async () => {
  execute.mockResolvedValueOnce([[{ token: 'device-token' }]]);
  expect(await listPushDevices(42)).toEqual(['device-token']);
  expect(execute.mock.calls[0][0]).toContain('WHERE user_id = ?');
  expect(execute.mock.calls[0][1]).toEqual([42]);
});
