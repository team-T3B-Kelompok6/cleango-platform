'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import type { FormState } from '@/types';
import {
  Button,
  DialogBody,
  DialogFooter,
  SubmitButton,
  buttonVariants,
} from '@/components/shared/ui';
import { useDialogClose } from '@/components/shared/ui/DialogTrigger';
import { StaffAvatar } from '@/components/staff/StaffAvatar';

export type AssignmentCandidate = {
  name: string;
  photo: string | null;
  skills: string[];
};

/** Dialog penugasan petugas untuk satu pesanan. */
export function AssignmentForm({
  customer,
  service,
  date,
  time,
  candidates,
  recommended,
  selected,
  action,
  cancelHref = '/pesanan',
}: {
  customer: string;
  service: string;
  date: string;
  time: string;
  candidates: AssignmentCandidate[];
  recommended: string[];
  selected: string[];
  action: (state: FormState, form: FormData) => Promise<FormState>;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const close = useDialogClose();
  const checked = Array.isArray(state.values?.staff)
    ? state.values.staff.map(String)
    : selected;

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <DialogBody className="flex flex-col gap-16">
        <div className="rounded-card border border-line bg-surface-soft p-14 text-sm leading-[1.65]">
          <strong className="block text-base text-ink">{customer}</strong>
          <p className="mt-4 break-words text-ink-muted">
            {service} · {date} · {time}
          </p>
          <p className="mt-4 text-ink-muted">
            Pilihan petugas mengikuti tanggal dan jam shift di Kelola Jadwal.
          </p>
          {!candidates.length && (
            <p className="mt-8 text-warning" role="status">
              Belum ada petugas dengan shift yang sesuai. Tambahkan atau ubah
              jadwal petugas terlebih dahulu.
            </p>
          )}
        </div>

        <fieldset
          key={checked.join('|')}
          className="m-0 min-w-0 border-0 p-0"
          aria-invalid={!!state.errors?.staff}
        >
          <legend className="mb-9 font-semibold text-ink-soft">
            Petugas sesuai jadwal
          </legend>
          <div className="flex max-h-240 flex-col gap-8 overflow-y-auto">
            {candidates.map((person) => (
              <label
                key={person.name}
                className="flex min-w-0 cursor-pointer items-center gap-12 rounded-md border border-line bg-surface p-12 has-[:checked]:border-line-strong has-[:checked]:bg-accent-soft"
              >
                <input
                  type="checkbox"
                  name="staff"
                  value={person.name}
                  className="size-[15px]! min-h-0! shrink-0 p-0! accent-accent"
                  defaultChecked={checked.includes(person.name)}
                  disabled={pending}
                  aria-label={person.name}
                />
                {person.photo !== null && (
                  <StaffAvatar name={person.name} src={person.photo} />
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-5">
                  <span className="flex flex-wrap items-center gap-8">
                    {person.name}
                    {recommended.includes(person.name) && (
                      <small className="rounded-[5px] bg-accent-soft px-7 py-3 text-xs text-accent">
                        Direkomendasikan
                      </small>
                    )}
                  </span>
                  <small className="text-xs leading-[1.5] text-ink-muted">
                    {person.skills.length
                      ? 'Keahlian: ' + person.skills.join(' · ')
                      : 'Keahlian belum ditambahkan'}
                  </small>
                </span>
              </label>
            ))}
          </div>
          {state.errors?.staff && (
            <span className="mt-4 block text-sm text-danger" role="alert">
              {state.errors.staff}
            </span>
          )}
        </fieldset>

        {state.message && (
          <p
            className="rounded-control bg-danger-soft p-10 text-sm leading-[1.6] text-danger"
            role="alert"
          >
            {state.message}
          </p>
        )}
      </DialogBody>
      <DialogFooter className="items-center">
        <span className="mr-auto text-xs text-ink-muted">
          {checked.length} petugas dipilih
        </span>
        {close ? (
          <Button variant="ghost" disabled={pending} onClick={close}>
            Batal
          </Button>
        ) : (
          <Link
            className={buttonVariants({ variant: 'ghost' })}
            href={cancelHref}
          >
            Batal
          </Link>
        )}
        <SubmitButton disabled={pending}>Tugaskan petugas</SubmitButton>
      </DialogFooter>
    </form>
  );
}
