'use client';
import { useState } from 'react';
import { Modal } from '../Modal';
import { UiIcon } from '../UiIcon';
import { TrackingPanel } from './TrackingPanel';

export function TrackingButton({
  name,
  orderId,
  label = 'Pantau Petugas',
  className = 'button',
}: {
  name?: string;
  orderId?: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className + ' tracking-trigger'}
        onClick={() => setOpen(true)}
      >
        <UiIcon name="pin" />
        {label}
      </button>
      {open && (
        <Modal
          title="Pantau petugas"
          subtitle={
            orderId
              ? 'Penugasan dan lokasi petugas pada pesanan ini'
              : name
                ? 'Penugasan dan lokasi terakhir ' + name
                : 'Penugasan dan lokasi terakhir setiap petugas'
          }
          wide
          className={
            'tracking-dialog' +
            (orderId || name ? ' tracking-scoped-dialog' : '')
          }
          onClose={() => setOpen(false)}
        >
          <TrackingPanel
            initialName={name}
            initialOrderId={orderId}
            onClose={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}
