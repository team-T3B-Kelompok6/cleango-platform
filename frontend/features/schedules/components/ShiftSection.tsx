import type { RecordData } from '@/types';
import type { ShiftGroup } from '../data/scheduleRules';
import { ShiftCard } from './ShiftCard';
import { EmptyShiftCard } from './EmptyShiftCard';
import {
  countClass,
  gridClass,
  headingClass,
  headingDotClass,
  headingHoursClass,
  headingTitleClass,
} from '../data/scheduleStyles';

/** Satu blok shift: judul, jumlah jadwal, dan grid kartu. */
export function ShiftSection({
  group,
  edit,
}: {
  group: ShiftGroup;
  edit: (item: RecordData, label?: string) => React.ReactNode;
}) {
  return (
    <section>
      <div className={headingClass}>
        <h2 className={headingTitleClass}>
          <i className={headingDotClass} />
          {group.shift}{' '}
          <span className={headingHoursClass}>({group.hours})</span>
        </h2>
        <small className={countClass}>{group.count} jadwal petugas</small>
      </div>
      <div className={gridClass}>
        {group.schedules.map((schedule) => (
          <ShiftCard key={schedule.id} schedule={schedule} edit={edit} />
        ))}
        {group.showEmptyCard && <EmptyShiftCard />}
      </div>
    </section>
  );
}
