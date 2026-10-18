'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminCleanerTask, TaskBoard } from '@/types/cleaner';
import { stageLabels } from '@/types/cleaner';
import { UiIcon } from '../UiIcon';
import { useDialogClose } from '../DialogContext';
import { DeliveryBadge } from '../cleaner/DeliveryBadge';
import { Modal } from '../Modal';
import { displayId } from '@/lib/display';
import { orderStatusLabel, orderTimeText } from '@/lib/order-flow';
import type { RiskSnapshot } from '@/types/tracking';

function scheduledAt(item: AdminCleanerTask) {
  const start = item.time.match(/(\d{1,2})[.:](\d{2})/);
  if (!start) return null;
  const value = new Date(
    `${item.date}T${start[1].padStart(2, '0')}:${start[2]}:00+07:00`,
  );
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

export function TrackingPanel({
  initialName,
  initialOrderId,
  onClose,
}: {
  initialName?: string;
  initialOrderId?: string;
  onClose: () => void;
}) {
  const close = useDialogClose() ?? onClose;
  const router = useRouter();
  const [board, setBoard] = useState<TaskBoard | null>(null),
    [error, setError] = useState('');
  const scoped = Boolean(initialOrderId || initialName);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{
    orderId: string;
    staffName: string;
  } | null>(null);
  const [busy, setBusy] = useState(''),
    [copied, setCopied] = useState(false),
    [locationItem, setLocationItem] = useState<AdminCleanerTask | null>(null);
  const [prediction, setPrediction] = useState<RiskSnapshot | null>(null),
    [predictionBusy, setPredictionBusy] = useState(false),
    [predictionError, setPredictionError] = useState('');
  const [choices, setChoices] = useState<Record<string, string>>({});
  const frame = useRef<HTMLIFrameElement>(null),
    linkField = useRef<HTMLInputElement>(null),
    requestBusy = useRef(false),
    signature = useRef('');
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/cleaner-tasks', {
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || 'Data tugas belum dapat dimuat.');
      setBoard(result.data);
      setError('');
      const next = result.data.revision || JSON.stringify(result.data.items);
      if (signature.current !== next) router.refresh();
      signature.current = next;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Data tugas belum dapat dimuat.',
      );
    }
  }, [router]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (!document.hidden && !requestBusy.current) void load();
    }, 5000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (
        event.origin === location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === 'cleango-task-updated'
      ) {
        void load();
        router.refresh();
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [load, router]);
  async function resend(item: AdminCleanerTask, open = false) {
    if (requestBusy.current) return;
    requestBusy.current = true;
    setCopied(false);
    setBusy(item.orderId + item.staffName);
    setError('');
    setBoard((previous) =>
      previous
        ? {
            ...previous,
            items: previous.items.map((row) =>
              row.orderId === item.orderId && row.staffName === item.staffName
                ? {
                    ...row,
                    linkDelivery: { ...row.linkDelivery, status: 'sending' },
                  }
                : row,
            ),
          }
        : previous,
    );
    try {
      const response = await fetch('/api/admin/cleaner-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'resend',
          orderId: item.orderId,
          staffName: item.staffName,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || 'Pengiriman belum berhasil.');
      setBoard(result.data);
      const record = result.data.items.find(
        (row: AdminCleanerTask) =>
          row.orderId === item.orderId && row.staffName === item.staffName,
      );
      if (open && record?.publicPath)
        setSelected({ orderId: item.orderId, staffName: item.staffName });
      else if (open)
        setError(
          'Halaman petugas belum tersedia. Penugasan tetap tersimpan. Coba muat ulang atau hubungi pengelola integrasi.',
        );
    } catch (error) {
      await load();
      setError(
        error instanceof Error
          ? error.message
          : 'Pengiriman gagal. Penugasan tetap tersimpan.',
      );
    } finally {
      setBusy('');
      requestBusy.current = false;
    }
  }
  const active = board?.items.find(
    (item) =>
      item.orderId === selected?.orderId &&
      item.staffName === selected.staffName,
  );
  async function copyLink() {
    if (!active?.publicPath || !board) return;
    try {
      try {
        await navigator.clipboard.writeText(
          board.publicOrigin + active.publicPath,
        );
      } catch {
        linkField.current?.focus();
        linkField.current?.select();
        if (!document.execCommand('copy'))
          throw new Error('Clipboard unavailable');
      }
      setCopied(true);
    } catch {
      setError(
        'Tautan belum bisa disalin. Salin dari kolom link di atas pratinjau.',
      );
    }
  }
  const grouped = new Map<string, AdminCleanerTask[]>();
  for (const item of board?.items ?? []) {
    if (
      initialOrderId
        ? item.orderId !== initialOrderId
        : initialName && item.staffName !== initialName
    )
      continue;
    const key = item.staffId || item.staffName;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  for (const person of board?.staff ?? []) {
    if (initialOrderId || (initialName && person.name !== initialName))
      continue;
    if (!grouped.has(person.id)) grouped.set(person.id, []);
  }
  const groups = [...grouped.entries()].filter(([key, items]) =>
    (
      items[0]?.staffName ??
      board?.staff?.find((person) => person.id === key)?.name ??
      ''
    )
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  const trackedItem = locationItem
    ? (board?.items.find(
        (item) =>
          item.orderId === locationItem.orderId &&
          item.staffName === locationItem.staffName,
      ) ?? locationItem)
    : null;
  const trackedLocation = trackedItem?.task?.location;
  const destination = trackedItem?.destinationLocation;
  useEffect(() => {
    const controller = new AbortController();
    setPrediction(null);
    setPredictionError('');
    setPredictionBusy(false);
    if (!trackedItem || !trackedLocation) return () => controller.abort();
    if (trackedItem.task?.stage !== 'en_route') {
      setPredictionError(
        'Prediksi ETA aktif setelah cleaner menekan Berangkat Sekarang.',
      );
      return () => controller.abort();
    }
    if (!destination) {
      setPredictionError(
        'Koordinat tujuan belum tersedia pada alamat pesanan. Lokasi cleaner tetap ditampilkan.',
      );
      return () => controller.abort();
    }
    const schedule = scheduledAt(trackedItem);
    if (!schedule) {
      setPredictionError('Jadwal pesanan belum dapat dibaca untuk prediksi.');
      return () => controller.abort();
    }
    const predictionAt = new Date();
    const departedAt = Date.parse(trackedItem.task.departedAt ?? '');
    const locationUpdatedAt = Date.parse(trackedLocation.updatedAt);
    setPredictionBusy(true);
    void fetch('/api/tracking/risk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cleanerLatitude: trackedLocation.latitude,
        cleanerLongitude: trackedLocation.longitude,
        destinationLatitude: destination.latitude,
        destinationLongitude: destination.longitude,
        predictionAt: predictionAt.toISOString(),
        elapsedSeconds: Number.isFinite(departedAt)
          ? Math.max(0, (predictionAt.getTime() - departedAt) / 1000)
          : 0,
        scheduledAt: schedule,
        locationAgeSeconds: Number.isFinite(locationUpdatedAt)
          ? Math.max(0, (predictionAt.getTime() - locationUpdatedAt) / 1000)
          : 0,
        hasDeparted: true,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: RiskSnapshot;
          message?: string;
        };
        if (!response.ok || !payload.data)
          throw new Error(payload.message ?? 'Prediksi belum tersedia.');
        setPrediction(payload.data);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPredictionError(
          error instanceof Error ? error.message : 'Prediksi belum tersedia.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPredictionBusy(false);
      });
    return () => controller.abort();
  }, [
    destination?.latitude,
    destination?.longitude,
    trackedItem?.date,
    trackedItem?.orderId,
    trackedItem?.staffName,
    trackedItem?.task?.departedAt,
    trackedItem?.task?.stage,
    trackedItem?.time,
    trackedLocation?.latitude,
    trackedLocation?.longitude,
    trackedLocation?.updatedAt,
  ]);
  return (
    <>
      {selected ? (
        <div className="cleaner-admin-preview">
          <div className="cleaner-preview-toolbar">
            <button
              className="button"
              onClick={() => {
                setSelected(null);
                setCopied(false);
              }}
            >
              {scoped ? 'Kembali ke petugas' : 'Kembali ke daftar petugas'}
            </button>
            <div>
              <strong>{selected.staffName}</strong>
              <small>#{displayId(selected.orderId)}</small>
            </div>
            <button
              className="button"
              disabled={!active?.publicPath}
              onClick={() => void copyLink()}
            >
              <UiIcon name="copy" />
              {copied ? 'Link Disalin' : 'Salin Link'}
            </button>
            <button
              className="button primary"
              disabled={!active || !!busy}
              onClick={() => active && void resend(active)}
            >
              {busy ? 'Mengirim…' : 'Kirim Ulang ke Petugas'}
            </button>
          </div>
          {active && (
            <div className="cleaner-link-status">
              <DeliveryBadge delivery={active.linkDelivery} />
              <p>
                {active.demo
                  ? 'Pengiriman WhatsApp belum terhubung.'
                  : 'Jika pengiriman gagal, salin link untuk dikirim manual.'}
              </p>
              {active.publicPath && (
                <input
                  ref={linkField}
                  aria-label="Link halaman petugas"
                  readOnly
                  value={board!.publicOrigin + active.publicPath}
                  onFocus={(event) => event.target.select()}
                />
              )}
              {active.linkDelivery.draftUrl && (
                <a
                  className="button"
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
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {active?.publicPath ? (
            <iframe
              ref={frame}
              title="Halaman tugas cleaner"
              className="cleaner-preview-frame"
              src={active.publicPath + '?embed=1'}
              referrerPolicy="no-referrer"
            />
          ) : (
            <p className="tracking-empty">
              Link tidak tersedia. Kembali ke daftar untuk memperbarui
              penugasan.
            </p>
          )}
        </div>
      ) : (
        <div className="tracking-content dispatch-board">
          <div className="dispatch-heading">
            <div>
              <h3>
                {initialOrderId
                  ? 'Petugas pesanan #' + displayId(initialOrderId)
                  : initialName || 'Daftar petugas'}
              </h3>
              <p>
                {board
                  ? grouped.size + ' petugas · diperbarui otomatis'
                  : 'Memuat petugas…'}
              </p>
            </div>
            <button className="button" onClick={() => void load()}>
              <UiIcon name="clock" />
              Muat ulang
            </button>
          </div>
          {!scoped && (
            <div className="dispatch-filters">
              <label>
                <UiIcon name="search" />
                <input
                  aria-label="Cari petugas"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama petugas…"
                />
              </label>
              {search && (
                <button
                  className="button"
                  onClick={() => {
                    setSearch('');
                  }}
                >
                  Semua petugas
                </button>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {!board && !error && <p role="status">Memuat petugas…</p>}
          <div className="staff-monitor-list">
            {groups.map(([key, items]) => {
              if (!items.length) {
                const person = board?.staff?.find(
                  (person) => person.id === key,
                );
                return (
                  <article className="staff-monitor-card" key={key}>
                    <div className="staff-monitor-identity">
                      <span className="detail-initials">
                        {person?.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((word) => word[0])
                          .join('')}
                      </span>
                      <div>
                        <h3>{person?.name}</h3>
                        <p>{person?.status}</p>
                      </div>
                    </div>
                    <p className="muted">Belum ada penugasan.</p>
                    <div className="dispatch-task-actions">
                      <button className="button" disabled>
                        Buka Halaman Petugas
                      </button>
                      <button className="button" disabled>
                        Lokasi Petugas
                      </button>
                    </div>
                  </article>
                );
              }

              const priority = (item: AdminCleanerTask) =>
                item.task?.stage === 'working'
                  ? 3
                  : item.task?.stage === 'en_route'
                    ? 2
                    : item.task?.stage === 'assigned'
                      ? 1
                      : 0;
              const ordered = [...items].sort(
                (a, b) =>
                  priority(b) - priority(a) ||
                  (b.date + b.time).localeCompare(a.date + a.time),
              );
              const item =
                items.find((row) => row.orderId === choices[key]) || ordered[0];
              const location =
                [...items]
                  .filter((row) => row.task?.location)
                  .sort((a, b) =>
                    b.task!.location!.updatedAt.localeCompare(
                      a.task!.location!.updatedAt,
                    ),
                  )[0] || item;
              return (
                <article className="staff-monitor-card" key={key}>
                  <div className="staff-monitor-identity">
                    <span className="detail-initials">
                      {item.staffName
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join('')}
                    </span>
                    <div>
                      <h3>{item.staffName}</h3>
                      <p>
                        {
                          items.filter(
                            (row) =>
                              !['Selesai', 'Batal'].includes(row.orderStatus) &&
                              (row.task
                                ? ['en_route', 'working'].includes(
                                    row.task.stage,
                                  )
                                : [
                                    'Menuju Lokasi',
                                    'Sedang Dikerjakan',
                                  ].includes(row.orderStatus)),
                          ).length
                        }{' '}
                        tugas aktif · {items.length} penugasan
                      </p>
                    </div>
                    <span className="cleaner-tag">
                      {item.task
                        ? stageLabels[item.task.stage]
                        : orderStatusLabel(item.orderStatus)}
                    </span>
                  </div>
                  {initialOrderId ? (
                    <p className="staff-task-picker">
                      <strong>
                        #{displayId(item.orderId)} · {item.customer}
                      </strong>
                    </p>
                  ) : (
                    <label className="staff-task-picker">
                      Penugasan
                      <select
                        aria-label={'Penugasan ' + item.staffName}
                        value={item.orderId}
                        onChange={(event) =>
                          setChoices((old) => ({
                            ...old,
                            [key]: event.target.value,
                          }))
                        }
                      >
                        {ordered.map((row) => (
                          <option key={row.orderId} value={row.orderId}>
                            #{displayId(row.orderId)} · {row.customer} ·{' '}
                            {row.date}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="staff-task-summary">
                    <strong>{item.service}</strong>
                    <p>
                      {item.date} ·{' '}
                      {orderTimeText({
                        ...item,
                        id: item.orderId,
                        status: item.orderStatus,
                      })}
                    </p>
                    <p>
                      <UiIcon name="pin" />
                      {item.address}
                    </p>
                  </div>
                  <div className="dispatch-task-status">
                    <span>Link tugas</span>
                    <DeliveryBadge delivery={item.linkDelivery} />
                    {item.task?.stage === 'completed' && (
                      <>
                        <span>Laporan</span>
                        <DeliveryBadge delivery={item.task.reportDelivery} />
                      </>
                    )}
                  </div>
                  <div className="dispatch-task-actions">
                    <button
                      className="button primary"
                      disabled={
                        !!busy ||
                        (item.orderStatus === 'Selesai' && !item.publicPath)
                      }
                      onClick={() => {
                        setCopied(false);
                        if (item.publicPath)
                          setSelected({
                            orderId: item.orderId,
                            staffName: item.staffName,
                          });
                        else void resend(item, true);
                      }}
                    >
                      <UiIcon name="person" />
                      {busy === item.orderId + item.staffName
                        ? 'Menyiapkan…'
                        : 'Buka Halaman Petugas'}
                    </button>
                    <button
                      className="button"
                      onClick={() => setLocationItem(location)}
                    >
                      <UiIcon name="pin" />
                      Lokasi Petugas
                    </button>
                  </div>
                  {item.orderStatus === 'Selesai' && !item.publicPath && (
                    <p className="muted">
                      Tidak ada catatan halaman tugas untuk pesanan selesai ini.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
          {board && !groups.length && (
            <p className="tracking-empty">
              {initialOrderId
                ? 'Belum ada petugas yang ditugaskan pada pesanan ini.'
                : 'Tidak ada petugas dengan penugasan yang sesuai pencarian.'}
            </p>
          )}
        </div>
      )}
      <div className="modal-footer">
        <button className="button" onClick={close}>
          Tutup
        </button>
      </div>
      {trackedItem && (
        <Modal
          title="Lokasi Petugas"
          subtitle={trackedItem.staffName}
          icon="pin"
          onClose={() => setLocationItem(null)}
        >
          <div className="modal-body staff-location-detail">
            {trackedLocation ? (
              <>
                <div className="staff-location-pin">
                  <UiIcon name="pin" />
                </div>
                <h3>{trackedItem.staffName}</h3>
                <p>
                  {trackedItem.demo
                    ? 'Lokasi simulasi area Malang'
                    : 'Lokasi terakhir yang dibagikan petugas'}
                </p>
                <dl className="record-facts">
                  <div>
                    <dt>Koordinat</dt>
                    <dd>
                      {trackedLocation.latitude.toFixed(5)},{' '}
                      {trackedLocation.longitude.toFixed(5)}
                    </dd>
                  </div>
                  <div>
                    <dt>Diperbarui</dt>
                    <dd>
                      {new Date(trackedLocation.updatedAt).toLocaleString(
                        'id-ID',
                        { timeZone: 'Asia/Jakarta' },
                      )}
                    </dd>
                  </div>
                  {destination && (
                    <div>
                      <dt>Tujuan pesanan</dt>
                      <dd>
                        {destination.latitude.toFixed(5)},{' '}
                        {destination.longitude.toFixed(5)}
                      </dd>
                    </div>
                  )}
                  {prediction && (
                    <>
                      <div>
                        <dt>ETA perjalanan</dt>
                        <dd>
                          {Math.max(1, Math.round(prediction.etaSeconds / 60))}{' '}
                          menit ·{' '}
                          {prediction.etaSource === 'ml'
                            ? 'Model ML'
                            : 'Rute OSRM'}
                        </dd>
                      </div>
                      <div>
                        <dt>Risiko keterlambatan</dt>
                        <dd>
                          {prediction.riskLevel === 'high'
                            ? 'Tinggi'
                            : prediction.riskLevel === 'medium'
                              ? 'Sedang'
                              : 'Rendah'}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
                {predictionBusy && <p role="status">Menghitung ETA…</p>}
                {predictionError && <p className="muted">{predictionError}</p>}
                {prediction && (
                  <p className="muted">
                    {prediction.reason} {prediction.recommendation}
                  </p>
                )}
                {destination ? (
                  <a
                    className="button primary"
                    href={
                      'https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=' +
                      trackedLocation.latitude +
                      '%2C' +
                      trackedLocation.longitude +
                      '%3B' +
                      destination.latitude +
                      '%2C' +
                      destination.longitude
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buka rute OpenStreetMap
                  </a>
                ) : (
                  <a
                    className="button primary"
                    href={
                      'https://www.openstreetmap.org/?mlat=' +
                      trackedLocation.latitude +
                      '&mlon=' +
                      trackedLocation.longitude +
                      '#map=16/' +
                      trackedLocation.latitude +
                      '/' +
                      trackedLocation.longitude
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buka lokasi OpenStreetMap
                  </a>
                )}
              </>
            ) : (
              <>
                <h3>Lokasi belum tersedia</h3>
                <p>
                  Petugas perlu membagikan lokasi melalui halaman tugas terlebih
                  dahulu.
                </p>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button className="button" onClick={() => setLocationItem(null)}>
              Tutup
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
