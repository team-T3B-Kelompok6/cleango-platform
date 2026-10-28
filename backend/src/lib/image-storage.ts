import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AppError } from './AppError.js';

export const UPLOAD_DIR = process.env.CLEANGO_UPLOAD_DIR || 'uploads';
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

export interface SavedImage {
  url: string;
  storagePath: string;
}

export async function saveImage(
  bytes: unknown,
  contentType: string,
  folder: string,
): Promise<SavedImage> {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0)
    throw new AppError(400, 'Pilih gambar yang akan diunggah.', 'VALIDATION_ERROR');
  if (bytes.length > MAX_IMAGE_BYTES)
    throw new AppError(400, 'Ukuran gambar maksimal 2 MB.', 'VALIDATION_ERROR');
  const extension = EXTENSIONS[contentType];
  if (!extension)
    throw new AppError(
      400,
      'Format gambar harus PNG, JPEG, atau WebP.',
      'VALIDATION_ERROR',
    );
  if (!/^[a-z0-9-]+$/.test(folder))
    throw new Error('Folder upload tidak valid.');

  const directory = path.join(UPLOAD_DIR, folder);
  await mkdir(directory, { recursive: true });
  const name = `${randomUUID()}${extension}`;
  const storagePath = path.join(directory, name);
  await writeFile(storagePath, bytes);
  return {
    url: `/${UPLOAD_DIR.replaceAll('\\', '/')}/${folder}/${name}`,
    storagePath,
  };
}

export async function removeStoredFile(storagePath: string): Promise<void> {
  await unlink(storagePath).catch(() => undefined);
}

export function storedPathFromUrl(url: string): string | null {
  const prefix = `/${UPLOAD_DIR.replaceAll('\\', '/')}/`;
  if (!url.startsWith(prefix)) return null;
  const relative = url
    .slice(prefix.length)
    .split('/')
    .filter(Boolean)
    .map((part) => decodeURIComponent(part))
    .join(path.sep);
  const root = path.resolve(UPLOAD_DIR);
  const resolved = path.resolve(root, relative);
  return resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}
