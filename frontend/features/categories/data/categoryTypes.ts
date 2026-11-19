import type { Category } from '@/types';

/** Kategori yang sudah dilengkapi jumlah layanan dan sumber ikon untuk UI. */
export type ManagedCategory = Category & {
  serviceCount: number;
  iconSrc?: string | null;
};
