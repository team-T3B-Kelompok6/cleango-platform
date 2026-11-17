'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import type { FormState, RecordData } from '@/types';
import {
  Button,
  DialogBody,
  DialogFooter,
  buttonVariants,
  SubmitButton,
} from '@/components/shared/ui';
import { useDialogClose } from '@/components/shared/ui/DialogTrigger';
import { useCustomerForm } from '@/hooks/useCustomerForm';
import {
  errorClass,
  hintClass,
  inputClass,
  labelClass,
  noticeClass,
  pairClass,
  textareaClass,
} from './data';

/** Form ubah data customer: kontak, alamat, tanggal bergabung, status akun. */
export function CustomerForm({
  initial,
  action,
}: {
  initial?: RecordData;
  action: (state: FormState, form: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const close = useDialogClose();
  const form = useCustomerForm({ initial });

  return (
    <form
      action={(data) => {
        data.set('active', String(form.values.active));
        formAction(data);
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <DialogBody className="flex flex-col gap-16">
        <div className={pairClass}>
          <div className="min-w-0">
            <label htmlFor="customer-name" className={labelClass}>
              Nama customer
            </label>
            <input
              id="customer-name"
              name="name"
              className={inputClass}
              required
              maxLength={120}
              value={form.values.name}
              disabled={pending}
              onChange={(event) => form.set('name', event.target.value)}
              aria-invalid={!!state.errors?.name}
            />
            {state.errors?.name && (
              <span className={errorClass} role="alert">
                {state.errors.name}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <label htmlFor="customer-phone" className={labelClass}>
              Nomor WhatsApp
            </label>
            <input
              id="customer-phone"
              name="phone"
              className={inputClass}
              required
              maxLength={30}
              value={form.values.phone}
              disabled={pending}
              onChange={(event) => form.set('phone', event.target.value)}
              aria-invalid={!!state.errors?.phone}
            />
            {state.errors?.phone && (
              <span className={errorClass} role="alert">
                {state.errors.phone}
              </span>
            )}
          </div>
        </div>

        <div className={pairClass}>
          <div className="min-w-0">
            <label htmlFor="customer-email" className={labelClass}>
              Email
            </label>
            <input
              id="customer-email"
              name="email"
              type="email"
              className={inputClass}
              required
              maxLength={160}
              value={form.values.email}
              disabled={pending}
              onChange={(event) => form.set('email', event.target.value)}
              aria-invalid={!!state.errors?.email}
            />
            {state.errors?.email && (
              <span className={errorClass} role="alert">
                {state.errors.email}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <label htmlFor="customer-joined" className={labelClass}>
              Tanggal bergabung
            </label>
            <input
              id="customer-joined"
              name="joined"
              type="date"
              className={inputClass}
              required
              value={form.values.joined}
              disabled={pending}
              onChange={(event) => form.set('joined', event.target.value)}
              aria-invalid={!!state.errors?.joined}
            />
            {state.errors?.joined && (
              <span className={errorClass} role="alert">
                {state.errors.joined}
              </span>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="customer-address" className={labelClass}>
            Alamat
          </label>
          <textarea
            id="customer-address"
            name="address"
            className={textareaClass}
            rows={3}
            maxLength={3000}
            value={form.values.address}
            disabled={pending}
            placeholder="Alamat utama pelanggan"
            onChange={(event) => form.set('address', event.target.value)}
            aria-invalid={!!state.errors?.address}
          />
          <small className={hintClass}>
            Kosongkan lalu simpan untuk menghapus alamat pelanggan.
          </small>
          {state.errors?.address && (
            <span className={errorClass} role="alert">
              {state.errors.address}
            </span>
          )}
        </div>

        <label
          htmlFor="customer-active"
          className="flex items-center justify-between gap-12 rounded-card border border-line p-12"
        >
          <span className="min-w-0">
            <strong className="block text-sm font-semibold text-ink">
              {form.values.active ? 'Akun aktif' : 'Akun nonaktif'}
            </strong>
            <small className={hintClass + ' mt-0'}>
              {form.values.active
                ? 'Pelanggan dapat memesan layanan.'
                : 'Pelanggan disembunyikan dari daftar aktif.'}
            </small>
          </span>
          <input
            id="customer-active"
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={form.values.active}
            disabled={pending}
            onChange={(event) => form.set('active', event.target.checked)}
          />
          <span
            aria-hidden="true"
            className="relative h-24 w-44 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-accent after:absolute after:top-3 after:left-3 after:size-18 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-20"
          />
        </label>

        {state.message && (
          <p className={noticeClass} role="alert">
            {state.message}
          </p>
        )}
      </DialogBody>
      <DialogFooter className="items-center">
        <span className="mr-auto text-xs text-ink-muted">
          {initial?.id ? '#' + initial.id : 'Customer'}
        </span>
        {close ? (
          <Button variant="ghost" disabled={pending} onClick={close}>
            Batal
          </Button>
        ) : (
          <Link
            className={buttonVariants({ variant: 'ghost' })}
            href="/customer"
          >
            Batal
          </Link>
        )}
        <SubmitButton disabled={pending}>Simpan perubahan</SubmitButton>
      </DialogFooter>
    </form>
  );
}
