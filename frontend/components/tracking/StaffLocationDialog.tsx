import type { AdminCleanerTask, CleanerTask } from '@/types/cleaner';
import type { RiskSnapshot } from '@/types/tracking';
import {
  Button,
  DialogBody,
  Modal,
  buttonVariants,
  UiIcon,
} from '@/components/ui';
import { footerClass } from './data';

type Location = NonNullable<CleanerTask['location']>;
type Destination = AdminCleanerTask['destinationLocation'];

function riskLabel(riskLevel: RiskSnapshot['riskLevel']) {
  return riskLevel === 'high'
    ? 'Tinggi'
    : riskLevel === 'medium'
      ? 'Sedang'
      : 'Rendah';
}

/** Dialog koordinat, ETA, dan tautan OpenStreetMap untuk satu petugas. */
export function StaffLocationDialog({
  item,
  location,
  destination,
  prediction,
  predictionBusy,
  predictionError,
  onClose,
}: {
  item: AdminCleanerTask;
  location?: Location;
  destination?: Destination;
  prediction: RiskSnapshot | null;
  predictionBusy: boolean;
  predictionError: string;
  onClose: () => void;
}) {
  const facts: [string, string][] = location
    ? [
        [
          'Koordinat',
          `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`,
        ],
        [
          'Diperbarui',
          new Date(location.updatedAt).toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
          }),
        ],
        ...(destination
          ? ([
              [
                'Tujuan pesanan',
                `${destination.latitude.toFixed(5)}, ${destination.longitude.toFixed(5)}`,
              ],
            ] as [string, string][])
          : []),
        ...(prediction
          ? ([
              [
                'ETA perjalanan',
                `${Math.max(1, Math.ceil(prediction.etaSeconds / 60))} menit · Rute OSRM`,
              ],
              ['Risiko keterlambatan', riskLabel(prediction.riskLevel)],
            ] as [string, string][])
          : []),
      ]
    : [];

  return (
    <Modal
      title="Lokasi Petugas"
      subtitle={item.staffName}
      icon="pin"
      onClose={onClose}
    >
      <DialogBody className="text-center">
        {location ? (
          <>
            <div className="mx-auto mb-18 grid size-64 place-items-center rounded-full bg-accent-soft text-accent">
              <UiIcon name="pin" className="size-[28px]" />
            </div>
            <h3 className="text-lg font-semibold text-ink">{item.staffName}</h3>
            <p className="text-base text-ink-muted">
              {item.demo
                ? 'Lokasi simulasi area Malang'
                : 'Lokasi terakhir yang dibagikan petugas'}
            </p>
            <dl className="mt-18 text-left">
              {facts.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[170px_1fr] gap-20 border-b border-line-faint py-15 max-sm:grid-cols-1 max-sm:gap-6"
                >
                  <dt className="text-base text-ink-meta">{label}</dt>
                  <dd className="m-0 text-md font-medium break-words text-ink">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {predictionBusy && (
              <p role="status" className="mt-14 text-sm text-ink-muted">
                Menghitung ETA…
              </p>
            )}
            {predictionError && (
              <p className="mt-14 text-sm text-ink-muted">{predictionError}</p>
            )}
            {prediction && (
              <p className="mt-14 text-sm text-ink-muted">
                {prediction.reason} {prediction.recommendation}
              </p>
            )}
            <a
              className={buttonVariants({ className: 'mt-18' })}
              href={
                destination
                  ? 'https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=' +
                    location.latitude +
                    '%2C' +
                    location.longitude +
                    '%3B' +
                    destination.latitude +
                    '%2C' +
                    destination.longitude
                  : 'https://www.openstreetmap.org/?mlat=' +
                    location.latitude +
                    '&mlon=' +
                    location.longitude +
                    '#map=16/' +
                    location.latitude +
                    '/' +
                    location.longitude
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              {destination
                ? 'Buka rute OpenStreetMap'
                : 'Buka lokasi OpenStreetMap'}
            </a>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-ink">
              Lokasi belum tersedia
            </h3>
            <p className="text-base text-ink-muted">
              Petugas perlu membagikan lokasi melalui halaman tugas terlebih
              dahulu.
            </p>
          </>
        )}
      </DialogBody>
      <div className={footerClass}>
        <Button variant="ghost" onClick={onClose}>
          Tutup
        </Button>
      </div>
    </Modal>
  );
}
