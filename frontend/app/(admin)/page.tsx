import type { Metadata } from 'next';
import { DashboardPage } from '@/features/dashboard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dashboard Utama' };

export default function Page() {
  return <DashboardPage />;
}
