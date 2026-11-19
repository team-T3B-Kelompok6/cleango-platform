import type { CleanerTask } from '@/types/cleaner';
import { time } from '@/lib/cleaner/format';
import { Button, UiIcon, buttonVariants } from '@/components/ui';
import { DeliveryBadge } from '@/components/DeliveryBadge';
import {
  cardClass,
  fieldLabelClass,
  inputClass,
} from '../../data/portalStyles';

/** Ringkasan pekerjaan: form laporan saat aktif, hasil saat selesai. */
export function ReportCard({
  task,
  completed,
  busy,
  summary,
  onSummary,
  checked,
  onChecked,
  onRetry,
}: {
  task: CleanerTask;
  completed: boolean;
  busy: string;
  summary: string;
  onSummary: (value: string) => void;
  checked: boolean;
  onChecked: (value: boolean) => void;
  onRetry: () => void;
}) {
  const disabled = !!busy || task.stage !== 'working';
  return (
    <section className={cardClass}>
      <h2 className="mb-14 text-md leading-[1.55] font-semibold text-ink">
        {completed ? 'Laporan Pekerjaan' : 'Ringkasan Pekerjaan'}
      </h2>
      {completed ? (
        <>
          <p className="text-base leading-[1.7] whitespace-pre-line text-ink">
            {task.report?.summary ||
              'Belum ada laporan petugas untuk pesanan ini.'}
          </p>
          <p className="mt-10 flex items-center gap-6 text-base text-accent">
            <UiIcon name="tick" />
            {task.startedAt || task.report
              ? 'Selesai ' + time(task.completedAt)
              : 'Waktu selesai belum tercatat.'}
          </p>
        </>
      ) : (
        <>
          <label htmlFor="cleaner-summary" className={fieldLabelClass}>
            Hasil pengerjaan <span className="text-danger">*</span>
          </label>
          <textarea
            id="cleaner-summary"
            className={inputClass + ' mt-8'}
            value={summary}
            onChange={(event) => onSummary(event.target.value)}
            placeholder="Jelaskan area yang sudah dibersihkan dan hasil pemeriksaannya…"
            rows={4}
            minLength={10}
            maxLength={2000}
            disabled={disabled}
          />
          <small className="mt-6 block text-xs text-ink-muted">
            Minimal 10 karakter. Foto bersifat opsional.
          </small>
          <label className="mt-14 flex items-start gap-9 text-sm leading-[1.6] text-ink">
            <input
              type="checkbox"
              className="mt-3 size-[17px] shrink-0 accent-accent"
              checked={checked}
              onChange={(event) => onChecked(event.target.checked)}
              disabled={disabled}
            />
            Saya sudah memeriksa hasil pekerjaan.
          </label>
        </>
      )}
      {completed && task.report && (
        <div className="mt-16 flex flex-col items-start gap-10 border-t border-line pt-16">
          <strong className="text-sm text-ink">
            Status pengiriman laporan ke customer
          </strong>
          <DeliveryBadge delivery={task.reportDelivery} />
          <p className="text-xs leading-[1.7] text-ink-muted">
            {(task.reportDelivery.mode === 'simulation'
              ? task.reportDelivery.status === 'failed'
                ? 'Laporan tetap tersimpan. Coba kirim ulang.'
                : 'Laporan tersimpan. Pengiriman WhatsApp belum terhubung.'
              : task.reportDelivery.message) ||
              'Status pengiriman terpisah dari penyelesaian tugas.'}
          </p>
          {['failed', 'not_sent'].includes(task.reportDelivery.status) && (
            <Button variant="ghost" disabled={!!busy} onClick={onRetry}>
              {busy === 'retry_report'
                ? 'Mengirim ulang…'
                : 'Kirim Ulang Laporan'}
            </Button>
          )}
          {task.reportDelivery.draftUrl && (
            <>
              <a
                className={buttonVariants()}
                href={task.reportDelivery.draftUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Buka Draf WhatsApp Customer
              </a>
              <p className="text-xs leading-[1.7] text-ink-muted">
                Pesan belum otomatis terkirim. Tekan kirim di WhatsApp;
                lampirkan foto secara manual jika diperlukan.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
