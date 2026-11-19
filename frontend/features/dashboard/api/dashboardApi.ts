import 'server-only';
import {
  loadDashboardOrders,
  summarizeOrders,
  type DashboardSummary,
} from '../data/dashboardSummary';

/**
 * Ringkasan dashboard: satu pesanan = satu request, lalu diagregasi murni.
 * `now` bisa diinjeksi agar hasilnya deterministik saat diuji.
 */
export async function getDashboardSummary(
  now = new Date(),
): Promise<DashboardSummary> {
  return summarizeOrders(await loadDashboardOrders(), now);
}
