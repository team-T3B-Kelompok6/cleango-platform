import 'server-only';
import { request, ApiError } from './api';
import { adminDemoEnabled } from './demo/mode';

export function validImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!value || /[\s\\]/.test(value)) return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return value.startsWith('/') && !value.startsWith('//');
  }
}

export async function uploadServiceImage(file: File): Promise<string> {
  // The upload endpoint reads a raw binary body, not multipart form data.
  const result = await request<{ data: { url: string } }>('/uploads', {
    method: 'POST',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!validImageUrl(result.data?.url))
    throw new ApiError('Alamat foto dari layanan upload tidak valid.', 502);
  return result.data.url;
}

export async function uploadImage(
  file: File,
  purpose: string,
): Promise<string> {
  const form = new FormData();
  form.set('file', file);
  form.set('purpose', purpose);
  const result = await request<{ data: { url: string } }>('/uploads', {
    method: 'POST',
    ...(adminDemoEnabled()
      ? { body: form }
      : {
          body: await file.arrayBuffer(),
          headers: { 'Content-Type': file.type },
        }),
  });
  if (!validImageUrl(result.data?.url))
    throw new ApiError('Alamat gambar dari layanan upload tidak valid.', 502);
  return result.data.url;
}
