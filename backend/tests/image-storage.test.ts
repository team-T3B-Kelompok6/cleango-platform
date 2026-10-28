import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const folder = path.join('tmp', `image-storage-${Date.now()}`);
let storage: typeof import('../src/lib/image-storage.js');

beforeAll(async () => {
  process.env.CLEANGO_UPLOAD_DIR = folder;
  storage = await import('../src/lib/image-storage.js');
});

afterAll(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe('image storage', () => {
  it('stores an allowed image with a random name', async () => {
    const bytes = Buffer.from([1, 2, 3, 4]);
    const saved = await storage.saveImage(bytes, 'image/png', 'avatars');
    expect(saved.storagePath).toContain(path.join(folder, 'avatars'));
    expect(saved.storagePath).toMatch(/[a-f0-9-]{36}\.png$/);
    expect((await stat(saved.storagePath)).size).toBe(4);
    expect(await readFile(saved.storagePath)).toEqual(bytes);
    await storage.removeStoredFile(saved.storagePath);
  });

  it('rejects an unsupported content type and oversized files', async () => {
    await expect(
      storage.saveImage(Buffer.from('%PDF'), 'application/pdf', 'avatars'),
    ).rejects.toThrow('Format gambar');
    await expect(
      storage.saveImage(Buffer.alloc(2 * 1024 * 1024 + 1), 'image/jpeg', 'avatars'),
    ).rejects.toThrow('maksimal 2 MB');
  });
});
