'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UiIcon } from '../UiIcon';
export function DemoSeedControls({ onChanged }: { onChanged?: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  async function run(intent: 'seed' | 'reset') {
    if (busy) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/cleaner-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setMessage(result.data.message);
      setConfirm(false);
      router.refresh();
      onChanged?.();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Data uji belum dapat disiapkan.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="cleaner-seed-controls"
      aria-label="Data uji alur cleaner"
    >
      <div>
        <strong>
          <UiIcon name="services" />
          Uji alur cleaner
        </strong>
        <p>
          3 pesanan [UJI] · sukses, gagal kirim link sekali, dan gagal kirim
          laporan sekali. Pengiriman selalu simulasi.
        </p>
      </div>
      <div className="cleaner-seed-actions">
        <button
          className="button"
          disabled={busy}
          onClick={() => void run('seed')}
        >
          {busy ? 'Menyiapkan…' : 'Siapkan 3 Pesanan Uji'}
        </button>
        <button
          className="text-action"
          disabled={busy}
          onClick={() => setConfirm(true)}
        >
          Ulangi Data Uji
        </button>
      </div>
      {confirm && (
        <div className="cleaner-seed-confirm">
          <p>
            Ulangi tiga pesanan cleaner dari awal? Penugasan, link, foto, dan
            laporan DEMO-ORD-01 sampai 03 akan dihapus.
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={() => setConfirm(false)}
          >
            Batal
          </button>
          <button
            className="button destructive"
            disabled={busy}
            onClick={() => void run('reset')}
          >
            Ya, Ulangi Data Uji
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="cleaner-seed-result">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </section>
  );
}
