'use client';
import { useState } from 'react';
import { Modal } from '../Modal';
import { UiIcon } from '../UiIcon';
import { TrackingPanel } from './TrackingPanel';

export function TrackingButton({
  name,
  label = 'Pantau Petugas',
  className = 'button',
}: {
  name?: string;
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
          subtitle="Posisi terakhir dan progres pengerjaan pesanan"
          wide
          className="tracking-dialog"
          onClose={() => setOpen(false)}
        >
          <TrackingPanel initialName={name} onClose={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}
