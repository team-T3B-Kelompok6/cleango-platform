import type { Metadata } from 'next';
import { DashboardView } from '@/components/dashboard';
import { getDashboardSummary } from '@/lib/dashboard-summary';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dashboard Utama' };

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  return <DashboardView summary={summary} />;
}
