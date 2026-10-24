import { describe, expect, it, vi } from 'vitest';

const connection = vi.hoisted(() => ({
  beginTransaction: vi.fn(),
  query: vi.fn().mockResolvedValue([[]]),
  rollback: vi.fn(),
  release: vi.fn(),
}));
vi.mock('../src/lib/db.js', () => ({
  pool: { getConnection: async () => connection },
}));
import { insertPlatformService } from '../src/model/platform-service.model.js';

describe('service category resource boundary', () => {
  it('does not accept a FAQ category when adding a service', async () => {
    await expect(
      insertPlatformService({
        name: 'Tes layanan',
        category: 'Kantor',
        duration: '2 jam',
        durationMinutes: 120,
        price: 100000,
        description: 'Data uji',
        imageUrl: null,
        active: true,
        features: [],
      }),
    ).rejects.toThrow('CATEGORY_NOT_FOUND');
    expect(connection.query).toHaveBeenCalledWith(
      expect.stringContaining("resource = 'services'"),
      ['Kantor'],
    );
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
  });
});
