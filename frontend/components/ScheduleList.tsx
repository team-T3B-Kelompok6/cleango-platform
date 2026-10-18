import { scheduleShifts, shiftOf } from '@/lib/resources';

import { Icon } from './Icon';

import { Badge } from './StatusBadge';
import { RecordActions } from './RecordActions';
import type { Schedule } from '@/types';
import type { RecordListProps } from './RecordListProps';
const shiftHours: Record<string, string> = Object.fromEntries(
  scheduleShifts.map((shift) => [shift.name, shift.time]),
);
export function ScheduleList({ shown, resource, tab, edit }: RecordListProps) {
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
                  jadwal petugas
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
                        <h3>{schedule.staff || 'Petugas belum dipilih'}</h3>
                        <div className="shift-card-bottom">
                          <span>
                            {schedule.date} · {schedule.time}
                          </span>
                          <RecordActions
                            resource={resource}
                            record={schedule}
                            edit={edit}
                          />
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
                      Tambahkan shift kerja petugas agar dapat dipilih saat
                      penugasan pesanan.
                    </p>
                  </article>
                ) : null}
              </div>
            </section>
          ))}
    </>
  );
}
