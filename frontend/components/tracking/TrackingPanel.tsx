'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { trackingDemo } from '@/lib/demo/tracking';
import {
  trackingPosition,
  trackingStatuses,
  trackingSteps,
  type EtaSnapshot,
  type RiskSnapshot,
} from '@/types/tracking';
import { UiIcon } from '../UiIcon';
const TrackingMap = dynamic(() => import('./TrackingMap'), {
  ssr: false,
  loading: () => (
    <div className="tracking-map-loading" role="status">
      Menyiapkan peta…
    </div>
  ),
});

export function TrackingPanel({
  initialName,
  onClose,
}: {
  initialName?: string;
  onClose: () => void;
}) {
  const roster = trackingDemo;
  const missingDemo =
    initialName && !roster.some((person) => person.name === initialName);
  const [selectedId, setSelectedId] = useState(
    roster.find((person) => person.name === initialName)?.id ?? roster[0].id,
  );
  const [stages, setStages] = useState<Record<string, number>>({});
  const [running, setRunning] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [eta, setEta] = useState<EtaSnapshot | null>(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const [etaError, setEtaError] = useState('');
  const [risk, setRisk] = useState<RiskSnapshot | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState('');
  const rosterList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = rosterList.current;
    const active = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    const itemBounds = active.getBoundingClientRect();
    const listBounds = list.getBoundingClientRect();
    const offset =
      itemBounds.left < listBounds.left
        ? itemBounds.left - listBounds.left
        : itemBounds.right > listBounds.right
          ? itemBounds.right - listBounds.right
          : 0;
    if (offset)
      list.scrollBy({
        left: offset,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
  }, [selectedId, filter, search]);
  const people = useMemo(
    () =>
      roster.map((person) => ({
        ...person,
        stage: stages[person.id] ?? person.stage,
        updated:
          stages[person.id] === undefined ? person.updated : 'Baru diperbarui',
        stale: stages[person.id] === undefined ? person.stale : false,
      })),
    [roster, stages],
  );
  const selected = people.find((person) => person.id === selectedId)!;
  useEffect(() => {
    const controller = new AbortController();
    if (selected.stage >= 2) {
      setEtaLoading(false);
      setEta(null);
      setEtaError('Petugas sudah berada di lokasi.');
      setRiskLoading(false);
      setRisk(null);
      setRiskError('Risiko perjalanan sudah tidak aktif.');
      return () => controller.abort();
    }
    const [cleanerLatitude, cleanerLongitude] = trackingPosition(selected);
    const [destinationLatitude, destinationLongitude] = selected.destination;
    setEtaLoading(true);
    setEtaError('');
    setRiskLoading(true);
    setRiskError('');
    const predictionAt = new Date();
    const trackingInput = {
      cleanerLatitude,
      cleanerLongitude,
      destinationLatitude,
      destinationLongitude,
      initialDistanceM: 6500,
      elapsedSeconds: selected.stage * 420,
      stoppedDurationSeconds: selected.stale ? 900 : 0,
      rollingSpeedMps: selected.stale ? 0 : 5.8,
      predictionAt: predictionAt.toISOString(),
    };
    const requestPrediction = async <T,>(path: string, input: object) => {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      const payload = (await response.json()) as { data?: T; message?: string };
      if (!response.ok || !payload.data)
        throw new Error(payload.message ?? 'Prediksi belum tersedia.');
      return payload.data;
    };
    void Promise.allSettled([
      requestPrediction<EtaSnapshot>('/api/tracking/eta', trackingInput),
      requestPrediction<RiskSnapshot>('/api/tracking/risk', {
        ...trackingInput,
        scheduledAt: new Date(
          predictionAt.getTime() + selected.minutesToSchedule * 60_000,
        ).toISOString(),
        locationAgeSeconds: selected.stale ? 1_080 : 25,
        hasDeparted: selected.stage >= 1,
      }),
    ]).then(([etaResult, riskResult]) => {
      if (controller.signal.aborted) return;
      if (etaResult.status === 'fulfilled') {
        setEta(etaResult.value);
      } else {
        setEta(null);
        setEtaError(
          etaResult.reason instanceof Error
            ? etaResult.reason.message
            : 'ETA belum tersedia.',
        );
      }
      if (riskResult.status === 'fulfilled') {
        setRisk(riskResult.value);
      } else {
        setRisk(null);
        setRiskError(
          riskResult.reason instanceof Error
            ? riskResult.reason.message
            : 'Risiko belum tersedia.',
        );
      }
      setEtaLoading(false);
      setRiskLoading(false);
    });
    return () => controller.abort();
  }, [selected]);
  const choose = useCallback((id: string) => {
    setSelectedId(id);
    setRunning(false);
  }, []);
  useEffect(() => {
    if (!running) return;
    if (selected.stage === 4) {
      setRunning(false);
      return;
    }
    const timer = window.setInterval(
      () =>
        setStages((previous) => ({
          ...previous,
          [selectedId]: Math.min(
            4,
            (previous[selectedId] ?? selected.stage) + 1,
          ),
        })),
      2200,
    );
    return () => window.clearInterval(timer);
  }, [running, selectedId, selected.stage]);
  const visible = people.filter(
    (person) =>
      (person.name + ' ' + person.area)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === 'all' ||
        (filter === 'moving' && person.stage === 1) ||
        (filter === 'working' && [2, 3].includes(person.stage)) ||
        (filter === 'stale' && person.stale)),
  );
  const status = trackingStatuses[selected.stage];
  return (
    <>
      <div className="tracking-content">
        <div className="tracking-note">
          <span className="tracking-demo-label">Simulasi</span>
          <p>
            Data contoh untuk mencoba tracking. Lokasi ini bukan GPS petugas.
            {missingDemo &&
              ` Skenario ${initialName} belum tersedia; menampilkan contoh petugas.`}
          </p>
        </div>
        <div className="tracking-workspace">
          <aside
            className="tracking-roster"
            aria-label="Daftar petugas tracking"
          >
            <div className="tracking-roster-heading">
              <h3>Petugas lapangan</h3>
              <span>{people.length}</span>
            </div>
            <label className="tracking-search">
              <UiIcon name="search" />
              <input
                aria-label="Cari petugas tracking"
                placeholder="Cari nama atau wilayah…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter status tracking"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">Semua status</option>
              <option value="moving">Di perjalanan</option>
              <option value="working">Di lokasi</option>
              <option value="stale">Lokasi terlambat</option>
            </select>
            <div className="tracking-roster-list" ref={rosterList}>
              {visible.map((person) => (
                <button
                  type="button"
                  key={person.id}
                  className={
                    'tracking-person' +
                    (person.id === selectedId ? ' is-selected' : '')
                  }
                  aria-pressed={person.id === selectedId}
                  onClick={() => choose(person.id)}
                >
                  <span className="tracking-avatar">
                    {person.name
                      .split(' ')
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <span className="tracking-person-copy">
                    <strong>{person.name}</strong>
                    <small>{person.area}</small>
                    <span
                      className={
                        'tracking-status ' +
                        (person.stale
                          ? 'stale'
                          : person.stage === 1
                            ? 'moving'
                            : '')
                      }
                    >
                      <i />
                      {person.stale
                        ? 'Lokasi terlambat'
                        : trackingStatuses[person.stage]}
                    </span>
                  </span>
                  <UiIcon name="chevron" />
                </button>
              ))}
              {!visible.length && (
                <p className="tracking-empty">
                  Petugas tidak ditemukan.
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setFilter('all');
                    }}
                  >
                    Reset pencarian
                  </button>
                </p>
              )}
            </div>
            <p className="tracking-roster-footnote">
              <UiIcon name="clock" />
              Waktu pembaruan adalah contoh simulasi.
            </p>
          </aside>
          <section
            className="tracking-detail"
            aria-label="Detail tracking petugas"
          >
            <TrackingMap
              people={people}
              selectedId={selectedId}
              onSelect={choose}
            />
            <div className="tracking-assignment" key={selectedId}>
              <div className="tracking-assignment-heading">
                <div>
                  <small>
                    #{selected.orderId} · {selected.name}
                  </small>
                  <h3>{selected.customer}</h3>
                </div>
                <span
                  className={
                    'tracking-status ' +
                    (selected.stale
                      ? 'stale'
                      : selected.stage === 1
                        ? 'moving'
                        : '')
                  }
                >
                  <i />
                  {status}
                </span>
              </div>
              <p>{selected.service}</p>
              <p className="tracking-address">
                <UiIcon name="pin" />
                {selected.address}
              </p>
              <div className="tracking-eta" aria-live="polite">
                <div>
                  <small>Prediksi waktu tiba</small>
                  <strong>
                    {etaLoading
                      ? 'Menghitung…'
                      : eta
                        ? `${eta.etaMinutes} menit`
                        : etaError || 'Belum tersedia'}
                  </strong>
                </div>
                {eta && (
                  <div>
                    <small>
                      {Math.max(0.1, eta.distanceMeters / 1000).toFixed(1)} km
                      tersisa
                    </small>
                    <span>
                      {eta.source === 'ml'
                        ? `ML ${eta.modelVersion}`
                        : 'Fallback OSRM'}{' '}
                      ·{' '}
                      {new Date(eta.updatedAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
              <div
                className={`tracking-risk ${risk ? `is-${risk.riskLevel}` : ''}`}
                aria-live="polite"
              >
                <div>
                  <small>Risiko keterlambatan</small>
                  <strong>
                    {riskLoading
                      ? 'Menilai…'
                      : risk
                        ? risk.riskLevel === 'high'
                          ? 'Tinggi'
                          : risk.riskLevel === 'medium'
                            ? 'Sedang'
                            : 'Rendah'
                        : riskError || 'Belum tersedia'}
                  </strong>
                </div>
                {risk && (
                  <div>
                    <span>{risk.reason}</span>
                    <small>
                      {risk.source === 'ml'
                        ? `ML ${risk.modelVersion} · ${Math.round((risk.lateProbability ?? 0) * 100)}%`
                        : 'Aturan operasional'}
                    </small>
                    <em>{risk.recommendation}</em>
                  </div>
                )}
              </div>
              <div
                className={
                  'tracking-last-update' + (selected.stale ? ' is-stale' : '')
                }
                role="status"
              >
                <UiIcon name="clock" />
                <span>
                  {selected.stale
                    ? 'Lokasi belum diperbarui'
                    : 'Pembaruan lokasi'}{' '}
                  · {selected.updated}
                </span>
              </div>
              <ol
                className="tracking-timeline"
                aria-label="Progres tugas simulasi"
              >
                {trackingSteps.map((label, index) => (
                  <li
                    key={label}
                    className={index <= selected.stage ? 'is-done' : ''}
                    aria-current={index === selected.stage ? 'step' : undefined}
                  >
                    <span className="tracking-step-icon">
                      {index <= selected.stage ? (
                        <UiIcon name="tick" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span>{label}</span>
                  </li>
                ))}
              </ol>
              <div className="tracking-assignment-actions">
                <Link
                  className="button"
                  href={'/pesanan/' + encodeURIComponent(selected.orderId)}
                >
                  Detail pesanan
                  <UiIcon name="chevron" />
                </Link>
                <a
                  className="text-action"
                  href={
                    'https://wa.me/' +
                    selected.phone.replace(/\D/g, '').replace(/^0/, '62')
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Hubungi petugas
                  <UiIcon name="arrow" />
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
      <div className="modal-footer tracking-footer">
        <div>
          <span>Kontrol simulasi</span>
          <small>
            {running
              ? 'Progres diperbarui setiap 2,2 detik.'
              : 'Coba alur dari penugasan sampai selesai.'}
          </small>
        </div>
        <div>
          <button
            type="button"
            className="button"
            onClick={() => {
              setRunning(false);
              setStages((previous) => ({ ...previous, [selectedId]: 0 }));
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="button primary"
            onClick={() => {
              if (
                !running &&
                (selected.stage === 4 || stages[selectedId] === undefined)
              )
                setStages((previous) => ({ ...previous, [selectedId]: 0 }));
              setRunning(!running);
            }}
          >
            {running ? 'Jeda simulasi' : 'Jalankan simulasi'}
          </button>
          <button
            type="button"
            className="button tracking-done"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    </>
  );
}
