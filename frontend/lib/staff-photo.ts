import 'server-only';
import { validImageUrl } from './service-image';
import { serviceMediaUrl } from './service-media';

export function staffPhotoSource(value: unknown): string | null {
  if (!validImageUrl(value)) return null;
  return serviceMediaUrl(
    value,
    process.env.API_URL ? new URL(process.env.API_URL).origin : '',
  );
}
