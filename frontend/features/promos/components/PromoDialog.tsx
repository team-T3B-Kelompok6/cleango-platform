'use client';
import { useState } from 'react';
import type { Promo } from '@/types/promos';
import type { Service } from '@/types';
import { Modal } from '@/components/ui';
import { PromoForm } from './PromoForm';
import { PromoList } from './PromoList';
import { PromoDelete } from './PromoDelete';

type View =
  | { kind: 'list' }
  | { kind: 'new' }
  | { kind: 'edit'; promo: Promo }
  | { kind: 'delete'; promo: Promo };

/** Dialog Kelola Promo: daftar, tambah/ubah, dan hapus dalam satu modal. */
export function PromoDialog({
  promos,
  services,
  today,
  message,
  onClose,
}: {
  promos: Promo[];
  services: Service[];
  today: string;
  message: string;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const deleting = view.kind === 'delete';
  return (
    <Modal
      title={
        view.kind === 'new'
          ? 'Tambah Promo'
          : view.kind === 'edit'
            ? 'Ubah Promo'
            : deleting
              ? 'Hapus Promo'
              : 'Kelola Promo'
      }
      subtitle={
        view.kind === 'list'
          ? 'Atur kode, diskon, periode, dan layanan yang mendapat promo.'
          : deleting
            ? view.promo.code
            : 'Kode promo untuk checkout pelanggan.'
      }
      width={deleting ? 480 : 1040}
      icon={deleting ? 'trash' : 'tag'}
      iconTone={deleting ? 'danger' : 'success'}
      onClose={onClose}
    >
      {view.kind === 'list' ? (
        <PromoList
          promos={promos}
          services={services}
          today={today}
          message={message}
          notice={notice}
          setNotice={setNotice}
          onNew={() => setView({ kind: 'new' })}
          onEdit={(promo) => setView({ kind: 'edit', promo })}
          onDelete={(promo) => setView({ kind: 'delete', promo })}
        />
      ) : deleting ? (
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
          services={services}
          today={today}
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
