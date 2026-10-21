import 'server-only';
import { request, ApiError } from './api';
import type { Banner } from '@/types';
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
export async function listBanners(): Promise<Banner[]> {
  const result = await request<{ data: Banner[] }>('/banners');
  if (
    !Array.isArray(result.data) ||
    result.data.some(
      (banner) =>
        !banner ||
        typeof banner.id !== 'string' ||
        !validImageUrl(banner.imageUrl),
    )
  )
    throw new ApiError('Format daftar banner tidak sesuai.', 502);
  return result.data;
}
export async function uploadBanner(file: File): Promise<string> {
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
