import type { RecordListProps } from '@/components/RecordListProps';
import { groupSchedulesByShift } from '../data/scheduleRules';
import { ShiftSection } from './ShiftSection';
import { boardClass } from '../data/scheduleStyles';

/** Papan jadwal: kelompokkan baris per shift lalu render per seksi. */
export function ScheduleBoard({ shown, resource, tab, edit }: RecordListProps) {
  if (resource !== 'schedules') return null;
  return (
    <div className={boardClass}>
      {groupSchedulesByShift(shown, tab).map((group) => (
        <ShiftSection key={group.shift} group={group} edit={edit} />
      ))}
    </div>
  );
}
