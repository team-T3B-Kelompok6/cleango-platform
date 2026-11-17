'use client';
import { useEffect, useRef, useState } from 'react';
import type { CleanerTask } from '@/types/cleaner';
import { orderTimeText } from '@/lib/order-flow';
import { whatsappLink } from '@/lib/whatsapp';
import { demoCleanerLocations, requestKey } from '@/lib/cleaner/format';
import { watchLocation } from '@/components/cleaner/location-watch';

/**
 * State dan aksi halaman tugas petugas: polling 5 detik, aksi tahapan,
 * unggah foto, dan berbagi lokasi GPS. Semua tampilan ada di `portal/`.
 */
export function useCleanerTask({
  initial,
  token,
}: {
  initial: CleanerTask;
  token: string;
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
  const stopWatch = useRef<() => void>(() => {});
  const locationRequest = useRef<Promise<void> | null>(null);
  const [sharing, setSharing] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsNotice, setGpsNotice] = useState('');
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
    if (error || gpsError)
      errorMessage.current?.scrollIntoView({ block: 'center' });
  }, [error, gpsError]);

  const canShare =
    (task.stage === 'assigned' || task.stage === 'en_route') &&
    !task.arrivedAt &&
    !['Batal', 'Selesai'].includes(task.orderStatus) &&
    Date.parse(task.expiresAt) > (now || Date.now());

  useEffect(() => {
    if (!sharing || !canShare) {
      if (sharing)
        setGpsNotice(
          'Berbagi lokasi dihentikan karena tugas tidak lagi dalam perjalanan.',
        );
      setSharing(false);
      return;
    }
    let active = true;
    const stop = watchLocation({
      geolocation: navigator.geolocation,
      canSend: () => !requestRef.current && !locationRequest.current,
      send: (coordinates) => {
        // Each sample is a new event, even after a failed request.
        const pending = (async () => {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(15000),
            body: JSON.stringify({
              kind: 'location',
              key: requestKey(),
              ...coordinates,
            }),
          });
          const result = await response.json();
          if (!response.ok) {
            if (active && [401, 403, 404, 410].includes(response.status)) {
              stopWatch.current();
              setSharing(false);
            }
            throw new Error(
              result.message || 'Lokasi belum terkirim. Periksa koneksi.',
            );
          }
          if (active) {
            setTask(result.data);
            parentUpdated();
          }
        })();
        locationRequest.current = pending;
        return pending.finally(() => {
          if (locationRequest.current === pending)
            locationRequest.current = null;
        });
      },
      onSent: () => {
        setGpsError('');
        setGpsNotice('Lokasi terkini tersimpan. Berbagi lokasi aktif.');
      },
      onError: (message, stopped) => {
        setGpsError(message);
        if (stopped) setSharing(false);
      },
    });
    stopWatch.current = () => {
      active = false;
      stop();
    };
    return () => stopWatch.current();
  }, [sharing, canShare, endpoint]);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setInterval(async () => {
      if (document.hidden || requestRef.current || locationRequest.current)
        return;
      try {
        const response = await fetch(endpoint, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json();
        if (response.ok) {
          if (!requestRef.current && !locationRequest.current)
            setTask(data.data);
        } else {
          if ([401, 403, 404, 410].includes(response.status)) {
            stopWatch.current();
            setSharing(false);
          }
          setError(data.message || 'Tugas belum dapat dimuat.');
        }
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
    if (kind === 'location') keys.current[kind] = requestKey();
    else keys.current[kind] ??= requestKey();
    if (kind === 'arrive' || kind === 'complete') {
      stopWatch.current();
      setSharing(false);
      setGpsNotice('Berbagi lokasi dihentikan.');
    }
    try {
      // Reserve the action first, then drain GPS; never drop depart/arrive.
      await locationRequest.current?.catch(() => {});
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
      await locationRequest.current?.catch(() => {});
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
    if (sharing) {
      stopWatch.current();
      setSharing(false);
      setGpsNotice('Berbagi lokasi dihentikan.');
      setGpsError('');
      return;
    }
    if (!window.isSecureContext) {
      setGpsError(
        'GPS perlu koneksi aman HTTPS. Gunakan HTTPS atau localhost; HTTP di alamat LAN tidak didukung.',
      );
      return;
    }
    if (!navigator.geolocation) {
      setGpsError('GPS tidak tersedia pada browser ini.');
      return;
    }
    if (!canShare) {
      setGpsError(
        'Berbagi GPS tersedia sebelum tiba, selama tugas masih aktif.',
      );
      return;
    }
    setGpsError('');
    setGpsNotice('Mencari lokasi GPS…');
    setSharing(true);
  }

  const assigned = task.stage === 'assigned';
  const completed = task.stage === 'completed';
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
      passed: false,
    },
    {
      label: 'Tiba Lokasi',
      value: task.arrivedAt,
      active: false,
      passed: task.stage === 'working' || task.stage === 'completed',
    },
    {
      label: 'Dikerjakan',
      value: task.startedAt,
      active: task.stage === 'working',
      passed: false,
    },
    {
      label: 'Selesai',
      value: task.startedAt || task.report ? task.completedAt : undefined,
      active: completed,
      passed: false,
    },
  ];
  const displayedTime = orderTimeText({
    ...task,
    status: completed ? 'Selesai' : task.orderStatus,
  });

  return {
    task,
    busy,
    error,
    notice,
    summary,
    setSummary,
    checked,
    setChecked,
    sharing,
    gpsError,
    gpsNotice,
    canShare,
    elapsed,
    customerWA,
    maps,
    steps,
    displayedTime,
    assigned,
    completed,
    endpoint,
    fileInput,
    errorMessage,
    perform,
    upload,
    shareLocation,
  };
}
