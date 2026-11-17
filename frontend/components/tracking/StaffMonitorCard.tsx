import type { AdminCleanerTask } from '@/types/cleaner';
import { stageLabels } from '@/types/cleaner';
import {
  activeTaskCount,
  latestLocatedTask,
  sortTasks,
  type StaffGroup,
} from '@/lib/tracking';
import { displayId } from '@/lib/display';
import { orderStatusLabel, orderTimeText } from '@/lib/order-flow';
import { Button, Initials, UiIcon } from '@/components/shared/ui';
import { DeliveryBadge } from '@/components/cleaner/DeliveryBadge';
import {
  actionsClass,
  cardClass,
  cardMetaClass,
  cardTitleClass,
  identityClass,
  identityCopyClass,
  pickerClass,
  pickerSelectClass,
  pickerValueClass,
  statusRowClass,
  summaryClass,
  tagClass,
} from './data';

/** Kartu satu petugas: penugasan aktif, ringkasan pesanan, dan aksi. */
export function StaffMonitorCard({
  group,
  orderId,
  busy,
  selectedOrderId,
  onSelectOrder,
  onOpen,
  onLocate,
}: {
  group: StaffGroup;
  orderId?: string;
  busy: string;
  selectedOrderId?: string;
  onSelectOrder: (orderId: string) => void;
  onOpen: (item: AdminCleanerTask) => void;
  onLocate: (item: AdminCleanerTask) => void;
}) {
  if (!group.items.length)
    return (
      <article className={cardClass}>
        <div className={identityClass}>
          <Initials name={group.person?.name ?? ''} />
          <div className={identityCopyClass}>
            <h3 className={cardTitleClass}>{group.person?.name}</h3>
            <p className={cardMetaClass}>{group.person?.status}</p>
          </div>
        </div>
        <p className="text-sm text-ink-muted">Belum ada penugasan.</p>
        <div className={actionsClass}>
          <Button size="sm" variant="ghost" disabled>
            Buka Halaman Petugas
          </Button>
          <Button size="sm" variant="ghost" disabled>
            Lokasi Petugas
          </Button>
        </div>
      </article>
    );

  const ordered = sortTasks(group.items);
  const item =
    group.items.find((row) => row.orderId === selectedOrderId) ?? ordered[0];
  const location = latestLocatedTask(group.items) ?? item;

  return (
    <article className={cardClass}>
      <div className={identityClass}>
        <Initials name={item.staffName} />
        <div className={identityCopyClass}>
          <h3 className={cardTitleClass}>{item.staffName}</h3>
          <p className={cardMetaClass}>
            {activeTaskCount(group.items)} tugas aktif · {group.items.length}{' '}
            penugasan
          </p>
        </div>
        <span className={tagClass}>
          {item.task
            ? stageLabels[item.task.stage]
            : orderStatusLabel(item.orderStatus)}
        </span>
      </div>
      {orderId ? (
        <p className={pickerClass}>
          <strong className={pickerValueClass}>
            #{displayId(item.orderId)} · {item.customer}
          </strong>
        </p>
      ) : (
        <label className={pickerClass}>
          Penugasan
          <select
            aria-label={'Penugasan ' + item.staffName}
            className={pickerSelectClass}
            value={item.orderId}
            onChange={(event) => onSelectOrder(event.target.value)}
          >
            {ordered.map((row) => (
              <option key={row.orderId} value={row.orderId}>
                #{displayId(row.orderId)} · {row.customer} · {row.date}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className={summaryClass}>
        <strong className="text-md font-semibold text-ink">
          {item.service}
        </strong>
        <p>
          {item.date} ·{' '}
          {orderTimeText({
            ...item,
            id: item.orderId,
            status: item.orderStatus,
          })}
        </p>
        <p className="flex items-start gap-6">
          <UiIcon name="pin" className="mt-3 size-[16px]" />
          {item.address}
        </p>
      </div>
      <div className={statusRowClass}>
        <span>Link tugas</span>
        <DeliveryBadge delivery={item.linkDelivery} />
        {item.task?.stage === 'completed' && (
          <>
            <span>Laporan</span>
            <DeliveryBadge delivery={item.task.reportDelivery} />
          </>
        )}
      </div>
      <div className={actionsClass}>
        <Button
          size="sm"
          variant="primary"
          disabled={
            !!busy || (item.orderStatus === 'Selesai' && !item.publicPath)
          }
          onClick={() => onOpen(item)}
        >
          <UiIcon name="person" />
          {busy === item.orderId + item.staffName
            ? 'Menyiapkan…'
            : 'Buka Halaman Petugas'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onLocate(location)}>
          <UiIcon name="pin" />
          Lokasi Petugas
        </Button>
      </div>
      {item.orderStatus === 'Selesai' && !item.publicPath && (
        <p className="mt-12 text-sm text-ink-muted">
          Tidak ada catatan halaman tugas untuk pesanan selesai ini.
        </p>
      )}
    </article>
  );
}
