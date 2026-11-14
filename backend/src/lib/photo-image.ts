import sharp from 'sharp';
import { AppError } from './AppError.js';

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export async function normalizePhoto(
  bytes: Buffer,
  contentType: string,
): Promise<Buffer> {
  const invalid = () =>
    new AppError(
      400,
      'Foto tidak dapat dibaca. Pilih satu foto JPG, PNG, atau WebP dengan ukuran lebih kecil.',
      'INVALID_IMAGE',
    );
  if (!bytes.length || bytes.length > PHOTO_MAX_BYTES) throw invalid();
  const format =
    contentType === 'image/jpeg' &&
    bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
      ? 'jpeg'
      : contentType === 'image/png' &&
          bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? 'png'
        : contentType === 'image/webp' &&
            bytes.toString('ascii', 0, 4) === 'RIFF' &&
            bytes.toString('ascii', 8, 12) === 'WEBP'
          ? 'webp'
          : null;
  if (!format) throw invalid();
  try {
    const image = sharp(bytes, { limitInputPixels: 20_000_000 });
    const metadata = await image.metadata();
    if (
      metadata.format !== format ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > 10000 ||
      metadata.height > 10000 ||
      metadata.width * metadata.height > 20_000_000 ||
      (metadata.pages ?? 1) > 1
    )
      throw invalid();
    // Full decode, orientation applied before metadata-free JPEG re-encoding.
    const normalized = await image
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 75 })
      .toBuffer();
    if (normalized.length > 1024 * 1024) {
      normalized.fill(0);
      throw invalid();
    }
    return normalized;
  } catch {
    throw invalid();
  }
}
