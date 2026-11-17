'use client';
import { useId, useState } from 'react';
import { Button, DialogBody, DialogFooter } from '@/components/shared/ui';
import { useDialogClose } from '@/components/shared/ui/DialogTrigger';
import { CategoryForm } from './CategoryForm';
import {
  helpClass,
  inputClass,
  labelClass,
  type ManagedCategory,
} from './data';

/** Pilih satu kategori lalu ubah/namanya, ikonnya, atau hapus. */
export function CategoryPicker({
  categories,
}: {
  categories: ManagedCategory[];
}) {
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const id = useId();
  const close = useDialogClose();
  const selected = categories.find((category) => category.id === selectedId);
  return (
    <>
      <div className="border-b border-line px-24 pt-20 pb-16">
        <label htmlFor={id} className={labelClass}>
          Pilih kategori
        </label>
        <select
          id={id}
          className={inputClass}
          value={selectedId}
          disabled={busy || !categories.length}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          <option value="">Pilih kategori layanan</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name} ({category.serviceCount} layanan)
            </option>
          ))}
        </select>
      </div>
      {selected ? (
        <CategoryForm
          key={selected.id}
          resource="services"
          category={selected}
          onBusy={setBusy}
        />
      ) : (
        <>
          <DialogBody>
            <p className={helpClass}>
              {categories.length
                ? 'Pilih kategori untuk mengubah nama, ikon, atau menghapusnya.'
                : 'Belum ada kategori layanan.'}
            </p>
          </DialogBody>
          <DialogFooter className="items-center">
            <Button variant="ghost" onClick={close ?? undefined}>
              Tutup
            </Button>
          </DialogFooter>
        </>
      )}
    </>
  );
}
