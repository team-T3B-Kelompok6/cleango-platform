import Link from 'next/link';
import { displayId } from '@/lib/display';
import { orderTimeText } from '@/lib/order-flow';
import { shortDate } from '@/lib/staff';
import { staffPhotoSource } from '@/lib/staff-photo';
import type { Order, Staff } from '@/types';
import { StatusBadge, UiIcon } from '@/components/ui';
import { StaffAvatar } from '@/components/ui/StaffAvatar';
import { StaffPhone } from './StaffPhone';

const factValueClass = 'm-0 text-base font-semibold leading-[1.6] break-words';
const factLabelClass = 'mb-5 text-sm leading-[1.5] text-ink-muted';

/** Profil petugas di dalam dialog detail. */
export function StaffDetail({
  staff,
  skills,
  status,
  phone,
  href,
  task,
  scheduleCount,
  dataAvailable,
}: {
  staff: Staff;
  skills: string[];
  status: string;
  phone: string;
  href: string | null;
  task?: Order;
  scheduleCount: number | null;
  dataAvailable: boolean;
}) {
  const completed = staff.completedBookings ?? 0;
  return (
    <>
      <section
        className="flex flex-wrap items-center gap-14 rounded-card border border-line bg-canvas p-16"
        aria-label="Profil petugas"
      >
        <StaffAvatar
          name={staff.name}
          src={staffPhotoSource(staff.photoUrl)}
          className="size-50 rounded-card text-lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-5">
            <h3 className="text-lg leading-[1.5] font-semibold break-words text-ink">
              {staff.name}
            </h3>
            <span className="rounded-full border border-line-strong bg-accent-soft px-7 py-1 text-xs leading-[1.65] break-words text-accent">
              #{displayId(staff.id)}
            </span>
          </div>
          <StaffPhone phone={phone} href={href} />
          {completed !== undefined && (
            <p className="flex flex-wrap items-center gap-x-10 gap-y-4 text-xs leading-[1.55] text-ink-muted">
              <span>{completed} pesanan selesai tercatat</span>
            </p>
          )}
        </div>
        <StatusBadge status={status} className="ml-auto" />
      </section>
      <dl className="grid grid-cols-2 gap-12 max-sm:grid-cols-1">
        <div className="min-w-0 border-b border-line-soft py-12">
          <dt className={factLabelClass}>Keahlian petugas</dt>
          <dd className={factValueClass}>
            {skills.length ? (
              skills.join(' · ')
            ) : (
              <span className="font-normal text-ink-muted">
                Belum ditambahkan
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 border-b border-line-soft py-12">
          <dt className={factLabelClass}>Area operasional</dt>
          <dd className={factValueClass}>
            {typeof staff.area === 'string' && staff.area.trim() ? (
              staff.area
            ) : (
              <span className="font-normal text-ink-muted">Belum tersedia</span>
            )}
          </dd>
        </div>
        {staff.trainerId && staff.trainerName && (
          <div className="min-w-0 border-b border-line-soft py-12">
            <dt className="mb-5 text-sm leading-[1.5] tracking-[0.03em] text-ink-muted uppercase">
              Materi pendampingan
            </dt>
            <dd className={factValueClass}>
              <strong>{staff.trainerName}</strong>
              {Array.isArray(staff.mentorMaterials) &&
              staff.mentorMaterials.length ? (
                <ul className="mt-6 flex flex-wrap gap-6 text-sm font-normal text-ink-muted">
                  {staff.mentorMaterials.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              ) : (
                <span className="font-normal text-ink-muted">
                  Tidak ada materi pendampingan.
                </span>
              )}
            </dd>
          </div>
        )}
        <div className="min-w-0 border-b border-line-soft py-12">
          <dt className={factLabelClass}>Tanggal bergabung</dt>
          <dd className={factValueClass}>{shortDate(staff.joined)}</dd>
        </div>
        <div className="min-w-0 border-b border-line-soft py-12">
          <dt className={factLabelClass}>Jadwal tercatat</dt>
          <dd className={factValueClass}>
            {scheduleCount === null
              ? 'Belum dapat dimuat'
              : scheduleCount + ' jadwal'}
          </dd>
        </div>
      </dl>
      <section
        className="rounded-card border border-line-strong bg-surface-soft p-16 text-sm leading-[1.65]"
        aria-label="Tugas dan penugasan"
      >
        <div className="mb-9 flex flex-wrap items-baseline justify-between gap-x-12 gap-y-6 text-accent">
          <h3 className="flex items-center gap-6 text-xs leading-[1.6] tracking-[0.035em] uppercase">
            <i className="size-[7px] shrink-0 rounded-full bg-accent" />
            Tugas aktif saat ini
          </h3>
          {task && <span>{orderTimeText(task)}</span>}
        </div>
        {task ? (
          <>
            <strong className="block text-base leading-[1.6]">
              Pesanan #{displayId(task.id)} · {task.customer}
            </strong>
            <p className="mt-4 break-words text-ink-muted">{task.service}</p>
            <p className="mt-4 break-words text-ink-muted">{task.address}</p>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-x-12 gap-y-6 text-xs text-ink-muted">
              <span>
                {shortDate(task.date)} · {task.status}
              </span>
              <Link
                className="inline-flex items-center gap-3 font-semibold text-accent hover:underline"
                href={'/pesanan/' + encodeURIComponent(task.id)}
              >
                Lihat detail <UiIcon name="chevron" className="size-[14px]" />
              </Link>
            </div>
          </>
        ) : (
          <p className="text-ink-muted">
            {dataAvailable
              ? 'Tidak ada tugas yang sedang dijalankan.'
              : 'Data penugasan belum dapat dimuat. Coba buka kembali detail petugas.'}
          </p>
        )}
        {task && !dataAvailable && (
          <p className="mt-4 text-warning">
            Sebagian data penugasan belum dapat dimuat.
          </p>
        )}
        <Link
          className="mt-12 inline-flex items-center gap-3 font-semibold text-accent hover:underline"
          href={'/jadwal?q=' + encodeURIComponent(staff.name)}
        >
          Lihat semua jadwal <UiIcon name="arrow" className="size-[14px]" />
        </Link>
      </section>
    </>
  );
}
