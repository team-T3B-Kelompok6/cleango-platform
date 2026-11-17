import type { RecordData } from '@/types';
import { StatusBadge } from '@/components/shared/ui';
import { RecordActions } from '@/components/RecordActions';
import {
  cardBottomClass,
  cardClass,
  cardMetaClass,
  cardTitleClass,
} from './data';

/** Satu kartu jadwal petugas. */
export function ShiftCard({
  schedule,
  edit,
}: {
  schedule: RecordData;
  edit: (item: RecordData, label?: string) => React.ReactNode;
}) {
  return (
    <article className={cardClass}>
      <StatusBadge status={String(schedule.status)} />
      <h3 className={cardTitleClass}>
        {String(schedule.staff || '') || 'Petugas belum dipilih'}
      </h3>
      <div className={cardBottomClass}>
        <span className={cardMetaClass}>
          {String(schedule.date)} · {String(schedule.time)}
        </span>
        <RecordActions resource="schedules" record={schedule} edit={edit} />
      </div>
    </article>
  );
}
