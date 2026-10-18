import 'server-only';
import { request, ApiError } from './api';

export function validImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return (
      value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    );
  }
}

export async function uploadServiceImage(file: File): Promise<string> {
  const form = new FormData();
  form.set('file', file);
  form.set('purpose', 'service');
  const result = await request<{ data: { url: string } }>('/uploads', {
    method: 'POST',
    body: form,
  });
  if (!validImageUrl(result.data?.url))
    throw new ApiError('Alamat foto dari layanan upload tidak valid.', 502);
  return result.data.url;
}
