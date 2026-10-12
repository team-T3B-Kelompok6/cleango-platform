'use client';
import { useState } from 'react';
import { SopDialog } from './SopDialog';
export function SopButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="button" type="button" onClick={() => setOpen(true)}>
        Lihat SOP
      </button>
      {open && <SopDialog onClose={() => setOpen(false)} />}
    </>
  );
}
