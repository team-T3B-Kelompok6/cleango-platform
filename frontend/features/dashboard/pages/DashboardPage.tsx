import { getDashboardSummary } from '../api/dashboardApi';
import { DashboardView } from '../components/DashboardView';

/**
 * Halaman dashboard: membaca data di server lalu menyerahkan seluruh markup ke
 * `DashboardView`. Tidak ada state client di sini.
 */
export async function DashboardPage() {
  const summary = await getDashboardSummary();
  return <DashboardView summary={summary} />;
}
