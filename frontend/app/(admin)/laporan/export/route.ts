import { ApiError, list } from '@/lib/api';
import type { Order } from '@/types';
import {
  completedOrders,
  parseReportMonth,
  reportCsv,
  reportFilename,
} from '@/lib/reports';

export const dynamic = 'force-dynamic';

/** Unduh laporan pesanan selesai sebagai CSV. */
export async function GET(request: Request) {
  try {
    const value = new URL(request.url).searchParams.get('month');
    const month = parseReportMonth(value);
    if (value && !month)
      return Response.json({ message: 'Bulan tidak valid.' }, { status: 400 });
    const orders = completedOrders(await list<Order>('orders'), month);
    return new Response(reportCsv(orders), {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition':
          'attachment; filename="' + reportFilename(month) + '"',
      },
    });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return Response.json({ message: error.message }, { status: error.status });
  }
}
