import type { RefObject } from 'react';
import type { AdminCleanerTask, TaskBoard } from '@/types/cleaner';
import { displayId } from '@/lib/display';
import { Button, buttonVariants, UiIcon } from '@/components/ui';
import { DeliveryBadge } from '@/components/DeliveryBadge';
import {
  emptyClass,
  errorClass,
  frameClass,
  linkFieldClass,
  linkStatusClass,
  previewClass,
  toolbarClass,
  toolbarCopyClass,
} from './data';

/** Pratinjau halaman tugas petugas di dalam dialog. */
export function PreviewPane({
  scoped,
  selected,
  active,
  board,
  copied,
  busy,
  error,
  onBack,
  onCopy,
  onResend,
  frame,
  linkField,
}: {
  scoped: boolean;
  selected: { orderId: string; staffName: string };
  active?: AdminCleanerTask;
  board: TaskBoard;
  copied: boolean;
  busy: string;
  error: string;
  onBack: () => void;
  onCopy: () => void;
  onResend: (item: AdminCleanerTask) => void;
  frame: RefObject<HTMLIFrameElement | null>;
  linkField: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div data-tracking-preview className={previewClass}>
      <div className={toolbarClass}>
        <Button size="sm" variant="ghost" onClick={onBack}>
          {scoped ? 'Kembali ke petugas' : 'Kembali ke daftar petugas'}
        </Button>
        <div className={toolbarCopyClass}>
          <strong className="block text-sm leading-[1.6] text-ink">
            {selected.staffName}
          </strong>
          <small className="text-xs text-ink-muted">
            #{displayId(selected.orderId)}
          </small>
        </div>
        <Button
          size="sm"
          variant="ghost"
          disabled={!active?.publicPath}
          onClick={onCopy}
        >
          <UiIcon name="copy" />
          {copied ? 'Link Disalin' : 'Salin Link'}
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={!active || !!busy}
          onClick={() => active && onResend(active)}
        >
          {busy ? 'Mengirim…' : 'Kirim Ulang ke Petugas'}
        </Button>
      </div>
      {active && (
        <div className={linkStatusClass}>
          <DeliveryBadge delivery={active.linkDelivery} />
          <p className="ml-8 inline text-xs leading-[1.65] text-ink-muted">
            {active.demo
              ? 'Pengiriman WhatsApp belum terhubung.'
              : 'Jika pengiriman gagal, salin link untuk dikirim manual.'}
          </p>
          {active.publicPath && (
            <input
              ref={linkField}
              aria-label="Link halaman petugas"
              className={linkFieldClass}
              readOnly
              value={board.publicOrigin + active.publicPath}
              onFocus={(event) => event.target.select()}
            />
          )}
          {active.linkDelivery.draftUrl && (
            <a
              className={buttonVariants({
                variant: 'ghost',
                className: 'mt-7 text-xs',
              })}
              href={active.linkDelivery.draftUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Buka draf WhatsApp · tekan kirim untuk mengirim
            </a>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      )}
      {active?.publicPath ? (
        <iframe
          ref={frame}
          title="Halaman tugas cleaner"
          className={frameClass}
          src={active.publicPath + '?embed=1'}
          referrerPolicy="no-referrer"
        />
      ) : (
        <p className={emptyClass}>
          Link tidak tersedia. Kembali ke daftar untuk memperbarui penugasan.
        </p>
      )}
    </div>
  );
}
