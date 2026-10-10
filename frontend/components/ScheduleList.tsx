import Link from 'next/link';
import { shiftOf } from '@/lib/resources';

import { Icon } from './Icon';

import { Badge } from './StatusBadge';
import { UiIcon } from './UiIcon';
import type { Schedule } from '@/types';
import type { RecordListProps } from './RecordListProps';
export function ScheduleList({
  shown,
  resource,
  tab,
  config,
}: RecordListProps) {
  return (
    <>
      {resource === 'schedules' &&
        ['Shift Pagi', 'Shift Siang', 'Shift Sore']
          .filter((shift) => !tab || shift === tab)
          .map((shift) => (
            <section key={shift} className="shift-section">
              <div className="shift-heading">
                <h2>
                  <i />
                  {shift}
                </h2>
                <small className="shift-count">
                  {
                    shown.filter((item) => shiftOf(String(item.time)) === shift)
                      .length
                  }{' '}
                  order
                </small>
              </div>
              <div className="shift-grid">
                {shown
                  .filter((item) => shiftOf(String(item.time)) === shift)
                  .map((item) => {
                    const schedule = item as Schedule;
                    return (
                      <article key={schedule.id} className="shift-card">
                        <Badge status={schedule.status} />
                        <h3>{schedule.customer}</h3>
                        <p>{schedule.service}</p>
                        <small className="shift-address">
                          <UiIcon name={schedule.address ? 'pin' : 'person'} />
                          {schedule.address || schedule.staff}
                        </small>
                        <div className="shift-card-bottom">
                          <span>
                            {schedule.date} · {schedule.time}
                          </span>
                          <Link
                            className="button"
                            href={
                              config.path +
                              '/' +
                              encodeURIComponent(schedule.id)
                            }
                          >
                            Detail & Ubah
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                {shown.filter((item) => shiftOf(String(item.time)) === shift)
                  .length %
                  2 ===
                  1 ||
                !shown.some((item) => shiftOf(String(item.time)) === shift) ? (
                  <article className="shift-card empty-slot">
                    <Icon name="clock" />
                    <h3>Tambah jadwal pada shift ini</h3>
                    <p>Atur waktu dan petugas untuk pengerjaan berikutnya.</p>
                    <Link className="button" href={config.path + '/new'}>
                      + Tambah Order ke Sini
                    </Link>
                  </article>
                ) : null}
              </div>
            </section>
          ))}
    </>
  );
}
