'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminCleanerTask, TaskBoard } from '@/types/cleaner';
import type { RiskSnapshot } from '@/types/tracking';
import { groupTasks, scheduledAt } from '@/lib/tracking';
import { useDialogClose } from '@/components/ui/DialogContext';
import {
  fetchTaskBoard,
  requestRisk,
  resendTaskLink,
} from '@/components/tracking/trackingClientApi';

/**
 * Kendali panel Pantau Petugas: memuat board, polling 5 detik, kirim ulang
 * tautan, dan prediksi ETA. Semua perhitungan murni ada di `lib/tracking.ts`.
 */
export function useTrackingPanel({
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
  const [board, setBoard] = useState<TaskBoard | null>(null);
  const [error, setError] = useState('');
  const scoped = Boolean(initialOrderId || initialName);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{
    orderId: string;
    staffName: string;
  } | null>(null);
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);
  const [locationItem, setLocationItem] = useState<AdminCleanerTask | null>(
    null,
  );
  const [prediction, setPrediction] = useState<RiskSnapshot | null>(null);
  const [predictionBusy, setPredictionBusy] = useState(false);
  const [predictionError, setPredictionError] = useState('');
  const [choices, setChoices] = useState<Record<string, string>>({});
  const frame = useRef<HTMLIFrameElement>(null);
  const linkField = useRef<HTMLInputElement>(null);
  const requestBusy = useRef(false);
  const signature = useRef('');

  const load = useCallback(async () => {
    try {
      const nextBoard = await fetchTaskBoard();
      setBoard(nextBoard);
      setError('');
      const next = nextBoard.revision || JSON.stringify(nextBoard.items);
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
      const nextBoard = await resendTaskLink({
        orderId: item.orderId,
        staffName: item.staffName,
      });
      setBoard(nextBoard);
      const record = nextBoard.items.find(
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
      item.staffName === selected?.staffName,
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

  const groups = groupTasks(board, { initialName, initialOrderId, search });

  const trackedItem = locationItem
    ? (board?.items.find(
        (item) =>
          item.orderId === locationItem.orderId &&
          item.staffName === locationItem.staffName,
      ) ?? locationItem)
    : null;
  const trackedLocation = trackedItem?.task?.location;
  const destination = trackedItem?.destinationLocation;
  // Board polling must age the GPS even when its coordinates/timestamp stop changing.
  const riskRefreshWindow = Math.floor(Date.now() / 30_000);

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
    if (
      !Number.isFinite(locationUpdatedAt) ||
      locationUpdatedAt > predictionAt.getTime()
    ) {
      setPredictionError(
        'Waktu GPS tidak valid. Menunggu pembaruan lokasi petugas.',
      );
      return () => controller.abort();
    }
    setPredictionBusy(true);
    void requestRisk(
      {
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
      },
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) setPrediction(data);
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
    riskRefreshWindow,
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

  return {
    close,
    scoped,
    board,
    error,
    setError,
    search,
    setSearch,
    selected,
    setSelected,
    active,
    busy,
    copied,
    setCopied,
    copyLink,
    resend,
    load,
    groups,
    choices,
    setChoices,
    locationItem,
    setLocationItem,
    trackedItem,
    trackedLocation,
    destination,
    prediction,
    predictionBusy,
    predictionError,
    frame,
    linkField,
  };
}
