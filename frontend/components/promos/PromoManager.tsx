'use client';
import { useState } from 'react';
import type { Promo } from '@/types/promos';
import type { Service } from '@/types';
import { Button, UiIcon } from '@/components/shared/ui';
import { PromoDialog } from './PromoDialog';

/** Tombol pembuka dialog Kelola Promo. */
export function PromoManager({
  promos,
  services,
  today,
  message,
}: {
  promos: Promo[];
  services: Service[];
  today: string;
  message: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="accent" className="gap-8" onClick={() => setOpen(true)}>
        <UiIcon name="tag" />
        Kelola Promo
      </Button>
      {open && (
        <PromoDialog
          promos={promos}
          services={services}
          today={today}
          message={message}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
