type Coordinates = { latitude: number; longitude: number; capturedAt: number };

export function watchLocation({
  geolocation,
  canSend,
  send,
  onError,
  onSent,
  now = Date.now,
}: {
  geolocation: Pick<Geolocation, 'watchPosition' | 'clearWatch'>;
  canSend: () => boolean;
  send: (coordinates: Coordinates) => Promise<void>;
  onError: (message: string, stopped: boolean) => void;
  onSent: () => void;
  now?: () => number;
}) {
  let active = true;
  let sending = false;
  let lastSuccess: number | undefined;
  let watch: number | undefined;
  const stop = () => {
    active = false;
    if (watch !== undefined) geolocation.clearWatch(watch);
    watch = undefined;
  };
  try {
    watch = geolocation.watchPosition(
      async ({ coords: { latitude, longitude }, timestamp }) => {
        if (!active || sending || !canSend()) return;
        // Persist acquisition time, not upload time; cached fixes never become new.
        if (
          !Number.isFinite(timestamp) ||
          now() - timestamp > 30000 ||
          timestamp > now()
        ) {
          onError('Lokasi GPS sudah usang. Menunggu lokasi terbaru.', false);
          return;
        }
        if (lastSuccess !== undefined && now() - lastSuccess < 10000) return;
        if (
          !Number.isFinite(latitude) ||
          Math.abs(latitude) > 90 ||
          !Number.isFinite(longitude) ||
          Math.abs(longitude) > 180
        ) {
          onError(
            'Koordinat GPS tidak valid. Menunggu lokasi berikutnya.',
            false,
          );
          return;
        }
        sending = true;
        try {
          await send({ latitude, longitude, capturedAt: timestamp });
          lastSuccess = now();
          if (active) onSent();
        } catch (error) {
          if (active)
            onError(
              error instanceof Error
                ? error.message
                : 'Lokasi belum terkirim. Periksa koneksi.',
              false,
            );
        } finally {
          sending = false;
        }
      },
      ({ code }) => {
        if (!active) return;
        if (code === 1) stop();
        onError(
          code === 1
            ? 'Izin lokasi ditolak. Izinkan lokasi di pengaturan browser; jika tertanam, buka link tugas langsung atau periksa Permissions-Policy/izin iframe.'
            : code === 2
              ? 'Lokasi GPS tidak tersedia. Nyalakan layanan lokasi HP; menunggu sinyal berikutnya.'
              : code === 3
                ? 'GPS kehabisan waktu. Cari sinyal lebih baik; menunggu lokasi berikutnya.'
                : 'GPS gagal. Coba hentikan lalu mulai berbagi lokasi kembali.',
          code === 1,
        );
      },
      { enableHighAccuracy: true, timeout: 60000, maximumAge: 30000 },
    );
    if (!active) stop();
  } catch {
    stop();
    onError(
      'GPS tidak dapat dimulai. Periksa izin lokasi browser dan iframe.',
      true,
    );
  }
  return stop;
}
