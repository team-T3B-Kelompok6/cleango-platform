'use client';
import type { AdminCleanerTask } from '@/types/cleaner';
import { Button } from '@/components/ui';
import { useTrackingPanel } from '@/hooks/useTrackingPanel';
import { MonitorBoard } from './MonitorBoard';
import { PreviewPane } from './PreviewPane';
import { StaffLocationDialog } from './StaffLocationDialog';
import { footerClass } from './data';

/**
 * Dialog Pantau Petugas: pilih daftar penugasan atau pratinjau halaman tugas.
 * State dan efeknya ada di `hooks/useTrackingPanel.ts`.
 */
export function TrackingPanel({
  initialName,
  initialOrderId,
  onClose,
}: {
  initialName?: string;
  initialOrderId?: string;
  onClose: () => void;
}) {
  const panel = useTrackingPanel({ initialName, initialOrderId, onClose });

  function openItem(item: AdminCleanerTask) {
    panel.setCopied(false);
    if (item.publicPath)
      panel.setSelected({ orderId: item.orderId, staffName: item.staffName });
    else void panel.resend(item, true);
  }

  return (
    <>
      {panel.selected && panel.board ? (
        <PreviewPane
          scoped={panel.scoped}
          selected={panel.selected}
          active={panel.active}
          board={panel.board}
          copied={panel.copied}
          busy={panel.busy}
          error={panel.error}
          frame={panel.frame}
          linkField={panel.linkField}
          onCopy={() => void panel.copyLink()}
          onResend={(item) => void panel.resend(item)}
          onBack={() => {
            panel.setSelected(null);
            panel.setCopied(false);
          }}
        />
      ) : (
        <MonitorBoard
          groups={panel.groups}
          board={panel.board}
          scoped={panel.scoped}
          initialName={initialName}
          initialOrderId={initialOrderId}
          error={panel.error}
          search={panel.search}
          onSearch={panel.setSearch}
          onReload={() => void panel.load()}
          busy={panel.busy}
          choices={panel.choices}
          onChoose={(key, orderId) =>
            panel.setChoices((old) => ({ ...old, [key]: orderId }))
          }
          onOpen={openItem}
          onLocate={panel.setLocationItem}
        />
      )}
      <div className={footerClass}>
        <Button variant="ghost" onClick={panel.close}>
          Tutup
        </Button>
      </div>
      {panel.trackedItem && (
        <StaffLocationDialog
          item={panel.trackedItem}
          location={panel.trackedLocation}
          destination={panel.destination}
          prediction={panel.prediction}
          predictionBusy={panel.predictionBusy}
          predictionError={panel.predictionError}
          onClose={() => panel.setLocationItem(null)}
        />
      )}
    </>
  );
}
