import Link from 'next/link';
import { shiftOf } from '@/lib/resources';

import { Icon } from './Icon';

import { Badge } from './StatusBadge';
import { UiIcon } from './UiIcon';
import { DeleteRecordButton } from './DeleteRecordButton';
import type { Schedule } from '@/types';
import type { RecordListProps } from './RecordListProps';
const shiftHours: Record<string, string> = {
  'Shift Pagi': '08.00–11.30 WIB',
  'Shift Siang': '12.00–15.30 WIB',
  'Shift Sore': '16.00–19.30 WIB',
};
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
                  {shift} <span>({shiftHours[shift]})</span>
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
                          <div className="shift-card-actions">
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
                            <DeleteRecordButton
                              resource={resource}
                              record={schedule}
                            />
                          </div>
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
                    <h3>Belum ada jadwal tambahan</h3>
                    <p>
                      Jadwal pada shift ini mengikuti pesanan dari aplikasi
                      pelanggan.
                    </p>
                  </article>
                ) : null}
              </div>
            </section>
          ))}
    </>
  );
}
