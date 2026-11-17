'use client';
import { useState } from 'react';
import { Button, Modal, UiIcon } from '@/components/shared/ui';
import { cn } from '@/lib/cn';
import { TrackingPanel } from './TrackingPanel';

/** Tombol pembuka dialog Pantau Petugas. */
export function TrackingButton({
  name,
  orderId,
  label = 'Pantau Petugas',
  variant = 'ghost',
  size = 'md',
}: {
  name?: string;
  orderId?: string;
  label?: string;
  variant?: 'primary' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <UiIcon name="pin" />
        {label}
      </Button>
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
          className={cn(
            'has-[[data-tracking-preview]]:h-[min(880px,calc(100dvh-48px))]!',
          )}
          width={orderId || name ? 680 : 1040}
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
