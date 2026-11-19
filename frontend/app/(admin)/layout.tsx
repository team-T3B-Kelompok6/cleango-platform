import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { list } from '@/lib/api';
import type { Order } from '@/types';
import { AdminShell, NotificationsMenu } from '@/components/layouts';
import { getAdminNotificationsRead } from '@/app/admin-notification-actions';
import { newestOrderFirst } from '@/lib/order-flow';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await cookies()).has('cleango-session')) redirect('/login');

  const orders = [...(await list<Order>('orders'))].sort(newestOrderFirst);
  let initialRead: string[] = [];
  try {
    initialRead = await getAdminNotificationsRead();
  } catch {
    initialRead = [];
  }

  const date = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date());

  return (
    <AdminShell
      date={date}
      headerActions={
        <NotificationsMenu
          orders={orders.slice(0, 8)}
          initialRead={initialRead}
        />
      }
    >
      {children}
    </AdminShell>
  );
}
