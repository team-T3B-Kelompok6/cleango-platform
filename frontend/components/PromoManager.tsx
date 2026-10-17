'use client';
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import type { Promo, PromoActionState } from '@/types/promos';
import type { Service } from '@/types';
import { removePromo, setPromoActive } from '@/app/promo-actions';
import { promoStatus } from '@/lib/promo-rules';
import { rupiah } from '@/lib/resources';
import { Modal } from './Modal';
import { useDialogClose } from './DialogContext';
import { SubmitButton } from './Form';
import { PromoForm } from './PromoForm';
import { UiIcon } from './UiIcon';
import { AddBannerButton } from './AddBannerButton';

const dateLabel = (date: string) =>
  new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(date + 'T00:00:00+07:00'));
type Props = {
  promos: Promo[];
  services: Service[];
  today: string;
  message: string;
};
type View =
  | { kind: 'list' }
  | { kind: 'new' }
  | { kind: 'edit'; promo: Promo }
  | { kind: 'delete'; promo: Promo };

function PromoDelete({
  promo,
  onCancel,
  onDeleted,
}: {
  promo: Promo;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [state, action] = useActionState<PromoActionState, FormData>(
    removePromo.bind(null, promo.id),
    {},
  );
  const completed = useRef(false);
  useEffect(() => {
    if (state.success && !completed.current) {
      completed.current = true;
      onDeleted();
    }
  }, [state, onDeleted]);
  return (
    <form action={action} className="next-form">
      <div className="modal-body">
        <p>
          Hapus promo <strong>{promo.name}</strong> dengan kode{' '}
          <strong>{promo.code}</strong>?
        </p>
        <p className="promo-delete-hint">
          Kode promo tidak dapat digunakan setelah dihapus.
        </p>
        {state.message && (
          <p className="form-error" role="alert">
            {state.message}
          </p>
        )}
      </div>
      <div className="modal-footer">
        <button type="button" className="button" onClick={onCancel}>
          Batal
        </button>
        <SubmitButton className="button destructive" pendingLabel="Menghapus…">
          Hapus promo
        </SubmitButton>
      </div>
    </form>
  );
}

function PromoList({
  promos,
  services,
  today,
  message,
  onNew,
  onEdit,
  onDelete,
  notice,
  setNotice,
}: Props & {
  onNew: () => void;
  onEdit: (promo: Promo) => void;
  onDelete: (promo: Promo) => void;
  notice: { text: string; error: boolean } | null;
  setNotice: (notice: { text: string; error: boolean }) => void;
}) {
  const close = useDialogClose(),
    router = useRouter();
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState('');
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState('');
  const shown = promos.filter(
    (p) =>
      (!status || promoStatus(p, today) === status) &&
      (!query ||
        (p.name + ' ' + p.code)
          .toLowerCase()
          .includes(query.toLowerCase().trim())),
  );
  function toggle(promo: Promo) {
    setBusyId(promo.id);
    startTransition(async () => {
      try {
        const result = await setPromoActive(promo.id, !promo.active);
        setNotice({
          text: result.success
            ? `Promo berhasil ${promo.active ? 'dinonaktifkan' : 'diaktifkan'}.`
            : result.message || 'Perubahan belum tersimpan.',
          error: !result.success,
        });
      } finally {
        setBusyId('');
      }
    });
  }
  return (
    <>
      <div className="modal-body promo-list-body">
        <div className="promo-list-heading">
          <span>
            {message ? 'Daftar promo' : `${promos.length} kode promo`}
          </span>
          <div className="promo-heading-actions">
            <AddBannerButton />
            <button
              type="button"
              className="button primary"
              onClick={onNew}
              disabled={pending}
            >
              <UiIcon name="plus" />
              Tambah Promo
            </button>
          </div>
        </div>
        <div className="promo-list-filters">
          <label className="sr-only" htmlFor="promo-search">
            Cari promo
          </label>
          <input
            type="search"
            id="promo-search"
            placeholder="Cari nama atau kode promo…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <label className="sr-only" htmlFor="promo-status">
            Filter status promo
          </label>
          <select
            id="promo-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Semua status</option>
            {[
              'Aktif',
              'Dijadwalkan',
              'Berakhir',
              'Nonaktif',
              'Kuota habis',
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {notice && (
          <p
            className={notice.error ? 'form-error' : 'form-success'}
            role={notice.error ? 'alert' : 'status'}
          >
            {notice.text}
          </p>
        )}
        {message ? (
          <div className="promo-load-error">
            <p role="alert">{message}</p>
            <button
              type="button"
              className="button"
              disabled={pending}
              onClick={() => startTransition(() => router.refresh())}
            >
              {pending ? 'Memuat…' : 'Muat ulang'}
            </button>
          </div>
        ) : (
          <div className="promo-records">
            {shown.map((promo) => {
              const status = promoStatus(promo, today);
              return (
                <article key={promo.id} className="promo-record">
                  <div className="promo-record-heading">
                    <div>
                      <h3>{promo.name}</h3>
                      <span className="promo-code">{promo.code}</span>
                    </div>
                    <span
                      className={
                        'status-badge ' +
                        (status === 'Aktif'
                          ? 'green'
                          : status === 'Dijadwalkan'
                            ? 'blue'
                            : 'neutral')
                      }
                    >
                      <i />
                      {status}
                    </span>
                  </div>
                  <p className="promo-discount">
                    {promo.discountType === 'percentage'
                      ? `Diskon ${promo.discountValue}%`
                      : `Potongan ${rupiah(promo.discountValue)}`}
                    {promo.maxDiscount !== null &&
                      ` · Maks. ${rupiah(promo.maxDiscount)}`}
                  </p>
                  <dl className="promo-record-details">
                    <div>
                      <dt>Berlaku untuk</dt>
                      <dd>
                        {promo.scope === 'all'
                          ? 'Semua layanan'
                          : promo.serviceIds
                              .map(
                                (id) =>
                                  services.find((s) => s.id === id)?.name ||
                                  `Layanan #${id}`,
                              )
                              .join(', ')}
                      </dd>
                    </div>
                    <div>
                      <dt>Periode</dt>
                      <dd>
                        {dateLabel(promo.startsOn)} – {dateLabel(promo.endsOn)}
                      </dd>
                    </div>
                    <div>
                      <dt>Minimal transaksi</dt>
                      <dd>
                        {promo.minPurchase
                          ? rupiah(promo.minPurchase)
                          : 'Tanpa minimal transaksi'}
                      </dd>
                    </div>
                    <div>
                      <dt>Pemakaian</dt>
                      <dd>
                        {promo.usageLimit
                          ? `Kuota ${promo.usageLimit}`
                          : 'Kuota tanpa batas'}{' '}
                        · {promo.perCustomerLimit}× per pelanggan
                        {promo.usedCount !== undefined &&
                          ` · Dipakai ${promo.usedCount}×`}
                      </dd>
                    </div>
                  </dl>
                  <div className="promo-record-footer">
                    <span>Diskon dari harga normal layanan</span>
                    <div className="record-rud">
                      <button
                        type="button"
                        className="button edit-action"
                        aria-label={'Ubah promo ' + promo.code}
                        onClick={() => onEdit(promo)}
                        disabled={pending}
                      >
                        <UiIcon name="edit" />
                        Ubah
                      </button>
                      <button
                        type="button"
                        className="button"
                        aria-label={
                          (promo.active ? 'Nonaktifkan' : 'Aktifkan') +
                          ' promo ' +
                          promo.code
                        }
                        onClick={() => toggle(promo)}
                        disabled={pending}
                      >
                        {pending && busyId === promo.id
                          ? 'Memproses…'
                          : promo.active
                            ? 'Nonaktifkan'
                            : 'Aktifkan'}
                      </button>
                      <button
                        type="button"
                        className="icon-action record-delete"
                        aria-label={'Hapus promo ' + promo.code}
                        onClick={() => onDelete(promo)}
                        disabled={pending}
                      >
                        <UiIcon name="trash" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            {!shown.length && (
              <div className="empty-state">
                <h3>
                  {promos.length
                    ? 'Tidak ada promo yang sesuai'
                    : 'Belum ada kode promo'}
                </h3>
                <p>
                  {promos.length
                    ? 'Coba ubah pencarian atau status.'
                    : 'Tambahkan kode promo untuk dipakai pelanggan saat checkout.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button type="button" className="button" onClick={close ?? undefined}>
          Tutup
        </button>
      </div>
    </>
  );
}

function PromoDialog({ onClose, ...props }: Props & { onClose: () => void }) {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  return (
    <Modal
      title={
        view.kind === 'new'
          ? 'Tambah Promo'
          : view.kind === 'edit'
            ? 'Ubah Promo'
            : view.kind === 'delete'
              ? 'Hapus Promo'
              : 'Kelola Promo'
      }
      subtitle={
        view.kind === 'list'
          ? 'Atur kode, diskon, periode, dan layanan yang mendapat promo.'
          : view.kind === 'delete'
            ? view.promo.code
            : 'Kode promo untuk checkout pelanggan.'
      }
      className={
        view.kind === 'delete' ? 'confirmation-dialog' : 'promo-dialog'
      }
      icon={view.kind === 'delete' ? 'trash' : 'tag'}
      onClose={onClose}
    >
      {view.kind === 'list' ? (
        <PromoList
          {...props}
          notice={notice}
          setNotice={setNotice}
          onNew={() => setView({ kind: 'new' })}
          onEdit={(promo) => setView({ kind: 'edit', promo })}
          onDelete={(promo) => setView({ kind: 'delete', promo })}
        />
      ) : view.kind === 'delete' ? (
        <PromoDelete
          promo={view.promo}
          onCancel={() => setView({ kind: 'list' })}
          onDeleted={() => {
            setView({ kind: 'list' });
            setNotice({ text: 'Promo berhasil dihapus.', error: false });
          }}
        />
      ) : (
        <PromoForm
          initial={view.kind === 'edit' ? view.promo : undefined}
          services={props.services}
          today={props.today}
          onCancel={() => setView({ kind: 'list' })}
          onSaved={() => {
            setView({ kind: 'list' });
            setNotice({ text: 'Promo berhasil disimpan.', error: false });
          }}
        />
      )}
    </Modal>
  );
}

export function PromoManager(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="button category-add"
        onClick={() => setOpen(true)}
      >
        <UiIcon name="tag" />
        Kelola Promo
      </button>
      {open && <PromoDialog {...props} onClose={() => setOpen(false)} />}
    </>
  );
}
