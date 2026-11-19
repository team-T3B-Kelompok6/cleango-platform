import type { RecordData } from '@/types';
import { displayId } from '@/lib/display';
import { valueText } from '@/lib/resources';
import { staffStatusLabel } from '@/lib/staff';
import { StatusBadge, UiIcon } from '@/components/ui';
import { RecordActions } from '@/components/RecordActions';
import { TrackingButton } from '@/components/tracking';
import { StaffAvatar } from '@/components/ui/StaffAvatar';
import { staffPhotoSource } from '@/lib/staff-photo';

/** Baris daftar petugas: status operasional, keahlian, dan aksi. */
export function StaffRow({
  item,
  edit,
}: {
  item: RecordData;
  edit: (item: RecordData, label?: string) => React.ReactNode;
}) {
  const status = staffStatusLabel(item);
  return (
    <article className="flex min-w-0 flex-col rounded-card border border-line bg-surface p-16">
      <div className="min-w-0">
        <span className="flex flex-wrap items-center gap-5 text-sm leading-[1.5] text-ink-muted">
          #{displayId(item.id)} · <StatusBadge status={status} />
        </span>
        <h3 className="mt-7 flex items-center gap-8 text-lg leading-[1.5] font-semibold">
          <StaffAvatar
            name={String(item.name)}
            src={staffPhotoSource(item.photoUrl)}
          />
          {valueText(item.name)}
        </h3>
        <p className="mt-6 text-base leading-[1.6] break-words text-ink-muted">
          WhatsApp: {valueText(item.phone)}
        </p>
        <div className="mt-11 flex flex-wrap items-center gap-8">
          {Array.isArray(item.skills) && item.skills.length ? (
            item.skills.map((skill) => (
              <span
                key={String(skill)}
                className="inline-flex min-h-24 items-center gap-5 rounded-[7px] border border-line bg-surface-soft px-8 py-4 text-sm leading-[1.5] text-ink-muted"
              >
                <UiIcon name="tick" className="size-[12px]" />
                {String(skill)}
              </span>
            ))
          ) : (
            <small className="text-sm text-ink-faint">
              Keahlian belum ditambahkan
            </small>
          )}
        </div>
      </div>
      <div className="mt-16 w-full border-t border-line pt-14">
        <RecordActions resource="staff" record={item} edit={edit}>
          {['Menuju Lokasi', 'Sedang Bekerja', 'Bertugas'].includes(
            String(item.operationalStatus),
          ) && (
            <TrackingButton
              name={String(item.name)}
              label="Lihat lokasi"
              variant="accent"
            />
          )}
        </RecordActions>
      </div>
    </article>
  );
}
