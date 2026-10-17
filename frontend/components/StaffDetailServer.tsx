import { displayId } from '@/lib/display';
import Link from 'next/link';
import { ApiError, list } from '@/lib/api';
import { whatsappLink } from '@/lib/whatsapp';
import type { Order, Schedule, Staff } from '@/types';
import { Badge } from './StatusBadge';
import { UiIcon } from './UiIcon';
import { StaffDetailModal, StaffPhone } from './StaffDetailModal';
import { ResourceFormServer } from './ResourceFormServer';
import { orderTimeText } from '@/lib/order-flow';
import { withOrderWorkTimes } from '@/lib/order-work-times';
import {
  activeOrderForStaff,
  staffOperationalStatus,
} from '@/lib/staff-availability';

async function related<T extends Order | Schedule>(
  resource: 'orders' | 'schedules',
) {
  try {
    return await list<T>(resource);
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

function displayDate(value: unknown) {
  if (
    typeof value !== 'string' ||
    !value ||
    !Number.isFinite(Date.parse(value))
  )
    return 'Belum tersedia';
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}

export async function StaffDetailServer({
  staff,
  closeHref = '/petugas',
}: {
  staff: Staff;
  closeHref?: string;
}) {
  const [rawOrders, schedules] = await Promise.all([
    related<Order>('orders'),
    related<Schedule>('schedules'),
  ]);
  const orders = rawOrders ? await withOrderWorkTimes(rawOrders) : null;
  const ownOrders = orders?.filter(
    (order) => Array.isArray(order.staff) && order.staff.includes(staff.name),
  );
  const ownSchedules = schedules?.filter(
    (schedule) =>
      typeof schedule.staff === 'string' &&
      schedule.staff
        .split(' & ')
        .map((name) => name.trim())
        .includes(staff.name),
  );
  const activeOrder = orders ? activeOrderForStaff(staff, orders) : undefined;
  const task = activeOrder;
  const completed = ownOrders?.filter(
    (order) => order.status === 'Selesai',
  ).length;
  const skills = Array.isArray(staff.skills)
    ? staff.skills.filter((skill) => typeof skill === 'string' && skill.trim())
    : [];
  const initials =
    staff.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((name) => name[0])
      .join('')
      .toUpperCase() || 'PT';
  const status = staffOperationalStatus(staff, orders ?? []);
  const phone = typeof staff.phone === 'string' ? staff.phone : '';
  const href = staff.id.startsWith('DEMO-')
    ? null
    : whatsappLink(
        phone,
        'Halo ' +
          staff.name +
          ', saya Admin CleanGo. Saya ingin berkoordinasi mengenai tugas Anda.',
      );
  const profile = (
    <>
      <section className="staff-profile-summary" aria-label="Profil petugas">
        <span className="staff-profile-avatar" aria-hidden="true">
          {initials}
        </span>
        <div className="staff-profile-identity">
          <div className="staff-profile-name">
            <h3>{staff.name}</h3>
            <span className="staff-profile-id">#{displayId(staff.id)}</span>
          </div>
          <StaffPhone phone={phone} href={href} />
          {((typeof staff.rating === 'number' &&
            Number.isFinite(staff.rating) &&
            staff.rating >= 0 &&
            staff.rating <= 5) ||
            completed !== undefined) && (
            <p className="staff-profile-history">
              {typeof staff.rating === 'number' &&
                Number.isFinite(staff.rating) &&
                staff.rating >= 0 &&
                staff.rating <= 5 && (
                  <span>
                    <UiIcon name="star" /> {staff.rating.toFixed(1)}
                  </span>
                )}
              {completed !== undefined && (
                <span>{completed} pesanan selesai tercatat</span>
              )}
            </p>
          )}
        </div>
        <Badge status={status} />
      </section>
      <dl className="staff-profile-facts">
        <div>
          <dt>Keahlian petugas</dt>
          <dd>
            {skills.length ? (
              skills.join(' · ')
            ) : (
              <span className="muted">Belum ditambahkan</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Area operasional</dt>
          <dd>
            {typeof staff.area === 'string' && staff.area.trim() ? (
              staff.area
            ) : (
              <span className="muted">Belum tersedia</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Tanggal bergabung</dt>
          <dd>{displayDate(staff.joined)}</dd>
        </div>
        <div>
          <dt>Jadwal tercatat</dt>
          <dd>
            {ownSchedules
              ? ownSchedules.length + ' jadwal'
              : 'Belum dapat dimuat'}
          </dd>
        </div>
      </dl>
      <section className="staff-profile-task" aria-label="Tugas dan penugasan">
        <div className="staff-profile-section-heading">
          <h3>
            <i />
            Tugas aktif saat ini
          </h3>
          {task && <span>{orderTimeText(task)}</span>}
        </div>
        {task ? (
          <>
            <strong>
              Pesanan #{displayId(task.id)} · {task.customer}
            </strong>
            <p>{task.service}</p>
            <p>{task.address}</p>
            <div className="staff-profile-task-footer">
              <span>
                {displayDate(task.date)} · {task.status}
              </span>
              <Link href={'/pesanan/' + encodeURIComponent(task.id)}>
                Lihat detail <UiIcon name="chevron" />
              </Link>
            </div>
          </>
        ) : (
          <p>
            {orders === null || schedules === null
              ? 'Data penugasan belum dapat dimuat. Coba buka kembali detail petugas.'
              : 'Tidak ada tugas yang sedang dijalankan.'}
          </p>
        )}
        {task && (orders === null || schedules === null) && (
          <p className="staff-profile-data-note">
            Sebagian data penugasan belum dapat dimuat.
          </p>
        )}
        <Link
          className="staff-profile-schedule-link"
          href={'/jadwal?q=' + encodeURIComponent(staff.name)}
        >
          Lihat semua jadwal <UiIcon name="arrow" />
        </Link>
      </section>
    </>
  );
  return (
    <StaffDetailModal
      key={staff.id}
      closeHref={closeHref}
      id={staff.id}
      href={href}
      profile={profile}
      editForm={<ResourceFormServer resource="staff" record={staff} />}
    />
  );
}
