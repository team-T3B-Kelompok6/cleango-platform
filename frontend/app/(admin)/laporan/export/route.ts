import { list } from '@/lib/api';
import { ApiError } from '@/lib/api';
import type { Order } from '@/types';
export const dynamic = 'force-dynamic';
function cell(value: unknown) {
  let text = String(value ?? '');
  if (/^[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export async function GET(request: Request) {
  try {
    const month = new URL(request.url).searchParams.get('month');
    if (month && !/^\d{4}-\d{2}$/.test(month))
      return Response.json({ message: 'Bulan tidak valid.' }, { status: 400 });
    const orders = (await list<Order>('orders')).filter(
      (order) =>
        order.status === 'Selesai' && (!month || order.date.startsWith(month)),
    );
    const rows = [
      ['ID', 'Pelanggan', 'Layanan', 'Tanggal', 'Status', 'Harga'],
      ...orders.map((order) => [
        order.id,
        order.customer,
        order.service,
        order.date,
        order.status,
        order.price,
      ]),
    ];
    return new Response(
      '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n'),
      {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': 'attachment; filename="laporan-cleango.csv"',
        },
      },
    );
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return Response.json({ message: error.message }, { status: error.status });
  }
}
