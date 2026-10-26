'use client';
import { displayId } from '@/lib/display';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { CleanerTask } from '@/types/cleaner';
import { stageLabels } from '@/types/cleaner';
import { UiIcon } from '../UiIcon';
import { CleanGoLogo } from '../CleanGoLogo';
import { DeliveryBadge } from './DeliveryBadge';
import { whatsappLink } from '@/lib/whatsapp';
import { orderTimeText } from '@/lib/order-flow';

function time(value?: string) {
  return value
    ? new Date(value).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }) + ' WIB'
    : 'Menunggu';
}
function date(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}
function duration(seconds: number) {
  const n = Math.max(0, Math.floor(seconds));
  return [Math.floor(n / 3600), Math.floor(n / 60) % 60, n % 60]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}
const demoCleanerLocations: Record<string, [number, number]> = {
  'DEMO-ORD-01': [-7.94974, 112.63092],
  'DEMO-ORD-02': [-7.98018, 112.63063],
  'DEMO-ORD-03': [-7.96792, 112.65354],
};
export function CleanerPortal({
  initial,
  token,
  embedded = false,
}: {
  initial: CleanerTask;
  token: string;
  embedded?: boolean;
}) {
  const [task, setTask] = useState(initial);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [summary, setSummary] = useState(initial.report?.summary ?? '');
  const [checked, setChecked] = useState(initial.report?.checked ?? false);
  const [now, setNow] = useState(0);
  const keys = useRef<Record<string, string>>({});
  const requestRef = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const endpoint = '/api/tugas/' + encodeURIComponent(token);
  function parentUpdated() {
    if (window.parent !== window)
      window.parent.postMessage(
        { type: 'cleango-task-updated' },
        window.location.origin,
      );
  }
  useEffect(() => {
    if (error) errorMessage.current?.scrollIntoView({ block: 'center' });
  }, [error]);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setInterval(async () => {
      if (document.hidden || requestRef.current) return;
      try {
        const response = await fetch(endpoint, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json();
        if (response.ok) setTask(data.data);
        else setError(data.message || 'Tugas belum dapat dimuat.');
      } catch {
        /* Retain the last confirmed task while offline. */
      }
    }, 5000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [endpoint]);
  async function perform(kind: string, extra: Record<string, unknown> = {}) {
    if (requestRef.current) return;
    requestRef.current = true;
    setBusy(kind);
    setError('');
    setNotice('');
    keys.current[kind] ??=
      crypto.randomUUID?.() ??
      Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, key: keys.current[kind], ...extra }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.message || 'Perubahan belum dapat disimpan. Coba lagi.',
        );
      setTask(result.data);
      delete keys.current[kind];
      parentUpdated();
      setNotice(
        kind === 'complete'
          ? 'Pekerjaan selesai. Laporan dan waktu selesai sudah tersimpan.'
          : kind === 'depart'
            ? 'Waktu keberangkatan sudah tersimpan.'
            : kind === 'arrive'
              ? 'Pengerjaan dimulai. Waktu mulai sudah dicatat.'
              : kind === 'location'
                ? 'Lokasi tugas diperbarui.'
                : 'Status pengiriman diperbarui.',
      );
    } catch (error) {
      setError(
        error instanceof TypeError
          ? 'Koneksi terputus. Coba lagi; data yang sudah tersimpan tetap ada.'
          : error instanceof Error
            ? error.message
            : 'Permintaan gagal. Coba lagi.',
      );
    } finally {
      requestRef.current = false;
      setBusy('');
    }
  }
  async function upload(file?: File) {
    if (!file || requestRef.current) return;
    if (
      file.size > 2 * 1024 * 1024 ||
      !['image/jpeg', 'image/png'].includes(file.type)
    ) {
      setError('Gunakan JPG atau PNG, maksimal 2 MB per foto.');
      return;
    }
    requestRef.current = true;
    setBusy('photo');
    setError('');
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch(endpoint, { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setTask(result.data);
      setNotice('Foto bukti kerja tersimpan.');
      parentUpdated();
    } catch (error) {
      setError(
        error instanceof TypeError
          ? 'Foto belum terkirim. Periksa koneksi dan unggah kembali.'
          : error instanceof Error
            ? error.message
            : 'Foto belum dapat disimpan.',
      );
    } finally {
      requestRef.current = false;
      setBusy('');
      if (fileInput.current) fileInput.current.value = '';
    }
  }
  function shareLocation() {
    if (task.demo) {
      const [latitude, longitude] = demoCleanerLocations[task.orderId] ?? [
        -7.96662, 112.63263,
      ];
      void perform('location', { latitude, longitude });
      return;
    }
    if (!navigator.geolocation) {
      setError('GPS tidak tersedia pada browser ini.');
      return;
    }
    setBusy('gps');
    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBusy('');
        void perform('location', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setBusy('');
        setError(
          'Lokasi belum dibagikan. Izinkan GPS atau coba lagi dari browser HP.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }
  const assigned = task.stage === 'assigned',
    completed = task.stage === 'completed';
  const elapsed =
    now && (task.startedAt || task.departedAt)
      ? ((completed ? Date.parse(task.completedAt!) : now) -
          Date.parse(task.startedAt || task.departedAt!)) /
        1000
      : 0;
  const customerWA =
    !task.demo && task.customerPhone
      ? whatsappLink(
          task.customerPhone,
          'Halo ' +
            task.customer +
            ', saya ' +
            task.staffName +
            ' dari CleanGo untuk pesanan #' +
            task.orderId +
            '.',
        )
      : null;
  const maps =
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(task.address);
  const steps = [
    {
      label: 'Berangkat',
      value: task.departedAt,
      active: task.stage === 'en_route',
    },
    { label: 'Tiba Lokasi', value: task.arrivedAt, active: false },
    {
      label: 'Dikerjakan',
      value: task.startedAt,
      active: task.stage === 'working',
    },
    {
      label: 'Selesai',
      value: task.startedAt || task.report ? task.completedAt : undefined,
      active: completed,
    },
  ];
  const displayedTime = orderTimeText({
    ...task,
    status: completed ? 'Selesai' : task.orderStatus,
  });
  return (
    <main
      className={
        'cleaner-portal' +
        (assigned ? ' cleaner-stage-assigned' : '') +
        (embedded ? ' is-embedded' : '')
      }
    >
      <header className="cleaner-header">
        <div>
          <CleanGoLogo />
          <strong>CleanGo</strong>
          <span className="cleaner-tag">
            {assigned ? 'WhatsApp Link' : 'Field Portal'}
          </span>
        </div>
        <span className="cleaner-session">
          <i />
          {completed ? 'Tugas Selesai' : 'Sesi Aktif'}
        </span>
      </header>
      <div className="cleaner-main">
        {assigned ? (
          <>
            <section className="cleaner-gps-card">
              <span className="cleaner-gps-icon">
                <UiIcon name="pin" />
              </span>
              <div>
                <div className="cleaner-section-heading">
                  <h2>
                    {task.demo ? 'Bagikan lokasi' : 'Nyalakan GPS HP Anda'}
                  </h2>
                  <span>
                    {task.location ? 'Lokasi Tersimpan' : 'Belum Aktif'}
                  </span>
                </div>
                <p>
                  {task.demo
                    ? 'Pratinjau lokasi. GPS langsung belum terhubung.'
                    : 'Bagikan lokasi saat siap berangkat. Konfirmasikan kedatangan melalui tombol di halaman tugas.'}
                </p>
                <button
                  className="button cleaner-gps-button"
                  disabled={!!busy}
                  onClick={shareLocation}
                >
                  <UiIcon name="pin" />
                  {busy === 'gps' || busy === 'location'
                    ? 'Memperbarui lokasi…'
                    : task.demo
                      ? 'Perbarui lokasi contoh'
                      : 'Aktifkan GPS Sekarang'}
                </button>
              </div>
            </section>
            <section className="cleaner-reservation cleaner-card">
              <div className="cleaner-section-heading">
                <div>
                  <small>ID RESERVASI</small>
                  <h1>#{displayId(task.orderId)}</h1>
                </div>
                <span className="cleaner-tag">{stageLabels[task.stage]}</span>
              </div>
              <div className="cleaner-service">
                <strong>
                  <UiIcon name="services" />
                  {task.service}
                </strong>
                <span>
                  <UiIcon name="calendar" />
                  {date(task.date)} · {displayedTime}
                </span>
                <span>
                  <UiIcon name="person" />
                  {task.staffName}
                </span>
              </div>
              <CustomerContact task={task} href={customerWA} />
              <p className="cleaner-address">
                <UiIcon name="pin" />
                {task.address}
              </p>
              <div className="cleaner-route-preview">
                <UiIcon name="pin" />
                <span>Tujuan pengerjaan</span>
                <strong>{task.address}</strong>
              </div>
              <a
                className="button cleaner-maps"
                href={maps}
                target="_blank"
                rel="noopener noreferrer"
              >
                <UiIcon name="arrow" />
                Buka Google Maps Navigasi
              </a>
              {task.notes && (
                <aside className="cleaner-customer-note">
                  <UiIcon name="paw" />
                  <div>
                    <strong>Catatan Khusus Pelanggan</strong>
                    <p>{task.notes}</p>
                  </div>
                </aside>
              )}
            </section>
            <section className="cleaner-card">
              <div className="cleaner-section-heading">
                <h2>Perjalanan Pesanan</h2>
                <small>1 dari 4 tahap</small>
              </div>
              <ol className="cleaner-journey">
                {[
                  'Menunggu Keberangkatan',
                  'Sedang Perjalanan',
                  'Sedang Dikerjakan',
                  'Pekerjaan Selesai',
                ].map((label, index) => (
                  <li key={label} className={index === 0 ? 'is-active' : ''}>
                    <span>
                      {index === 0 ? <UiIcon name="services" /> : index + 1}
                    </span>
                    <div>
                      <strong>{label}</strong>
                      <small>
                        {
                          [
                            'Siap berangkat menuju pelanggan',
                            'Menuju lokasi pengerjaan',
                            'Konfirmasi tiba dan mulai bekerja',
                            'Simpan hasil dan laporan',
                          ][index]
                        }
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </>
        ) : (
          <>
            <section className="cleaner-greeting cleaner-card">
              <div>
                <h1>Tugas Anda</h1>
                <p>{task.staffName}</p>
                <span className="cleaner-tag">
                  Order #{displayId(task.orderId)}
                </span>
              </div>
              <div
                className={
                  'cleaner-duration' +
                  (!task.startedAt && !task.departedAt ? ' is-unrecorded' : '')
                }
              >
                <small>
                  {task.startedAt || !task.departedAt
                    ? 'Durasi Pengerjaan'
                    : 'Durasi Perjalanan'}
                </small>
                <strong>
                  {task.startedAt || task.departedAt ? (
                    <>
                      <UiIcon name="clock" />
                      {duration(elapsed)}
                    </>
                  ) : (
                    'Belum tercatat'
                  )}
                </strong>
                {task.stage === 'working' && task.estimatedCompletedAt && (
                  <small>
                    Perkiraan selesai{' '}
                    {new Date(task.estimatedCompletedAt).toLocaleTimeString(
                      'id-ID',
                      {
                        timeZone: 'Asia/Jakarta',
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )}{' '}
                    WIB · sesuai durasi layanan
                  </small>
                )}
              </div>
            </section>
            <section className="cleaner-card">
              <CustomerContact task={task} href={customerWA} />
              <div className="cleaner-address-row">
                <p className="cleaner-address">
                  <UiIcon name="pin" />
                  {task.address}
                </p>
                <a
                  className="button cleaner-small-maps"
                  href={maps}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Buka Maps
                </a>
              </div>
              <p className="cleaner-service-line">
                {task.service} · {date(task.date)} · {displayedTime}
              </p>
              {task.notes && (
                <aside className="cleaner-customer-note">
                  <UiIcon name="paw" />
                  <p>{task.notes}</p>
                </aside>
              )}
            </section>
            <div className="cleaner-sync-line">
              <UiIcon name="shield" />
              <span>Status tugas tersimpan</span>
              <small>Diperbarui tiap 5 detik</small>
            </div>
            <section className="cleaner-card">
              <div className="cleaner-section-heading">
                <h2>Tahapan Pengerjaan</h2>
                <small>{stageLabels[task.stage]}</small>
              </div>
              <ol className="cleaner-stage-grid">
                {steps.map((step, index) => (
                  <li
                    key={step.label}
                    className={
                      (step.value || (completed && index === 3)
                        ? 'is-done '
                        : '') + (step.active ? 'is-active' : '')
                    }
                  >
                    <span>
                      {step.value || (completed && index === 3) ? (
                        <UiIcon name="tick" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div>
                      <strong>
                        {index + 1}. {step.label}
                      </strong>
                      <small>
                        {step.value
                          ? time(step.value)
                          : completed
                            ? 'Tidak tercatat'
                            : 'Menunggu'}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
              {task.stage === 'en_route' && (
                <button
                  className="button primary cleaner-arrive-button"
                  disabled={!!busy}
                  onClick={() => void perform('arrive')}
                >
                  {busy === 'arrive'
                    ? 'Mencatat kedatangan…'
                    : 'Saya Sudah Tiba & Mulai Pengerjaan'}
                </button>
              )}
              {!completed && (
                <button
                  className="text-action cleaner-location-action"
                  disabled={!!busy}
                  onClick={shareLocation}
                >
                  <UiIcon name="pin" />
                  {task.demo
                    ? 'Perbarui lokasi contoh'
                    : 'Bagikan Lokasi Terkini'}
                </button>
              )}
            </section>
            <section className="cleaner-card">
              <div className="cleaner-section-heading">
                <h2>
                  Foto Bukti Kerja <small>(Opsional)</small>
                </h2>
                <small>{task.photos.length} Foto Tersimpan</small>
              </div>
              <div className="cleaner-photos">
                {task.photos.map((photo, index) => (
                  <figure key={photo.id}>
                    <Image
                      src={endpoint + '/foto/' + photo.id}
                      width={120}
                      height={90}
                      alt={'Bukti kerja ' + (index + 1)}
                      unoptimized
                      referrerPolicy="no-referrer"
                    />
                    {!completed && (
                      <button
                        type="button"
                        aria-label={'Hapus foto ' + (index + 1)}
                        disabled={!!busy}
                        onClick={() =>
                          void perform('remove_photo', { photoId: photo.id })
                        }
                      >
                        <UiIcon name="close" />
                      </button>
                    )}
                    <figcaption>Foto {index + 1}</figcaption>
                  </figure>
                ))}
                {!completed &&
                  task.stage === 'working' &&
                  task.photos.length < 3 && (
                    <button
                      className="cleaner-photo-add"
                      disabled={!!busy}
                      onClick={() => fileInput.current?.click()}
                    >
                      <UiIcon name="image" />
                      {busy === 'photo' ? 'Mengunggah…' : '+ Foto'}
                    </button>
                  )}
                <p>
                  {completed && !task.photos.length
                    ? 'Belum ada foto bukti kerja untuk pesanan ini.'
                    : 'JPG/PNG, maksimal 3 foto · 2 MB per foto. Foto tersimpan bersama laporan.'}
                </p>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png"
                aria-label="Unggah foto bukti kerja"
                hidden
                onChange={(event) => void upload(event.target.files?.[0])}
              />
            </section>
            <section className="cleaner-card cleaner-report">
              <h2>{completed ? 'Laporan Pekerjaan' : 'Ringkasan Pekerjaan'}</h2>
              {completed ? (
                <>
                  <p className="cleaner-saved-summary">
                    {task.report?.summary ||
                      'Belum ada laporan petugas untuk pesanan ini.'}
                  </p>
                  <p className="cleaner-completed-time">
                    <UiIcon name="tick" />
                    {task.startedAt || task.report
                      ? 'Selesai ' + time(task.completedAt)
                      : 'Waktu selesai belum tercatat.'}
                  </p>
                </>
              ) : (
                <>
                  <label htmlFor="cleaner-summary">
                    Hasil pengerjaan <span>*</span>
                  </label>
                  <textarea
                    id="cleaner-summary"
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                    placeholder="Jelaskan area yang sudah dibersihkan dan hasil pemeriksaannya…"
                    rows={4}
                    minLength={10}
                    maxLength={2000}
                    disabled={!!busy || task.stage !== 'working'}
                  />
                  <small>Minimal 10 karakter. Foto bersifat opsional.</small>
                  <label className="cleaner-check">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => setChecked(event.target.checked)}
                      disabled={!!busy || task.stage !== 'working'}
                    />
                    Saya sudah memeriksa hasil pekerjaan.
                  </label>
                </>
              )}
              {completed && task.report && (
                <div className="cleaner-report-delivery">
                  <strong>Status pengiriman laporan ke customer</strong>
                  <DeliveryBadge delivery={task.reportDelivery} />
                  <p>
                    {(task.reportDelivery.mode === 'simulation'
                      ? task.reportDelivery.status === 'failed'
                        ? 'Laporan tetap tersimpan. Coba kirim ulang.'
                        : 'Laporan tersimpan. Pengiriman WhatsApp belum terhubung.'
                      : task.reportDelivery.message) ||
                      'Status pengiriman terpisah dari penyelesaian tugas.'}
                  </p>
                  {task.report &&
                    ['failed', 'not_sent'].includes(
                      task.reportDelivery.status,
                    ) && (
                      <button
                        className="button"
                        disabled={!!busy}
                        onClick={() => void perform('retry_report')}
                      >
                        {busy === 'retry_report'
                          ? 'Mengirim ulang…'
                          : 'Kirim Ulang Laporan'}
                      </button>
                    )}
                  {task.reportDelivery.draftUrl && (
                    <>
                      <a
                        className="button primary"
                        href={task.reportDelivery.draftUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Buka Draf WhatsApp Customer
                      </a>
                      <p>
                        Pesan belum otomatis terkirim. Tekan kirim di WhatsApp;
                        lampirkan foto secara manual jika diperlukan.
                      </p>
                    </>
                  )}
                </div>
              )}
            </section>
          </>
        )}
        {error && (
          <p ref={errorMessage} className="cleaner-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="cleaner-success" role="status">
            {notice}
          </p>
        )}
      </div>
      <footer className="cleaner-action-footer">
        {assigned ? (
          <>
            <button
              className="button primary cleaner-main-action"
              disabled={!!busy}
              onClick={() => void perform('depart')}
            >
              <UiIcon name="bike" />
              {busy === 'depart'
                ? 'Mencatat Keberangkatan…'
                : 'Berangkat Sekarang'}
            </button>
            <small>Klik saat mulai perjalanan menuju lokasi pelanggan.</small>
          </>
        ) : !completed ? (
          <>
            <button
              className="button primary cleaner-main-action"
              disabled={!!busy || task.stage !== 'working'}
              onClick={() => void perform('complete', { summary, checked })}
            >
              <UiIcon name="tick" />
              {busy === 'complete'
                ? 'Menyimpan & Memproses Laporan…'
                : 'Selesai & Kirim Laporan ke WA'}
            </button>
            <small>
              {task.stage === 'en_route'
                ? 'Konfirmasikan tiba dan mulai pengerjaan terlebih dahulu.'
                : task.demo
                  ? 'Laporan dan waktu selesai akan disimpan.'
                  : 'Laporan disimpan dahulu. Hasil pengiriman ditampilkan terpisah.'}
            </small>
          </>
        ) : (
          <div className="cleaner-finished">
            <UiIcon name="tick" />
            <strong>
              {task.report
                ? 'Tugas Selesai · Laporan Tersimpan'
                : 'Pesanan Selesai'}
            </strong>
            {task.report && (
              <small>
                Pengiriman laporan:{' '}
                <DeliveryBadge delivery={task.reportDelivery} />
              </small>
            )}
          </div>
        )}
      </footer>
      <p className="cleaner-security-note">
        CleanGo Field Portal · Link khusus tugas ini · Berlaku sampai{' '}
        {date(task.expiresAt)}
      </p>
    </main>
  );
}
function CustomerContact({
  task,
  href,
}: {
  task: CleanerTask;
  href: string | null;
}) {
  return (
    <div className="cleaner-contact">
      <span className="detail-initials">
        {task.customer
          .replace('[UJI] ', '')
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => word[0])
          .join('')}
      </span>
      <div>
        <strong>{task.customer}</strong>
        <span>{task.customerPhone || 'Nomor belum tersedia'}</span>
      </div>
      {href ? (
        <a
          className="button cleaner-wa"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <UiIcon name="chat" />
          WhatsApp
        </a>
      ) : (
        <span className="cleaner-contact-demo">WhatsApp belum terhubung</span>
      )}
    </div>
  );
}
