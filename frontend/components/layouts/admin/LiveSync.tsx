'use client';
import { useAdminLiveSync } from '@/hooks/useAdminLiveSync';

export function LiveSync() {
  useAdminLiveSync();
  return null;
}
