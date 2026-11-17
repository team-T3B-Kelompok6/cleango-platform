'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import type { FormState, RecordData } from '@/types';
import {
  Button,
  DialogBody,
  DialogFooter,
  buttonVariants,
} from '@/components/shared/ui';
import { useDialogClose } from '@/components/shared/ui/DialogTrigger';
import { SubmitButton } from '@/components/shared/ui';
import { useStaffForm } from '@/hooks/useStaffForm';
import { appendStaffForm } from '@/lib/staff-form';
import { StaffPhotoField } from './StaffPhotoField';
import { StaffMentor } from './StaffMentor';
import { StaffSkills } from './StaffSkills';
import {
  errorClass,
  hintClass,
  inputClass,
  labelClass,
  noticeClass,
  pairClass,
} from './data';

const STATUS_OPTIONS = ['Tersedia', 'Bertugas', 'Masa Training', 'Nonaktif'];

/** Form tambah/ubah petugas: identitas, status, keahlian, mentor, dan foto. */
export function StaffForm({
  initial,
  action,
  skillOptions,
  previousSkills,
  mentors,
  photoUrl,
}: {
  initial?: RecordData;
  action: (state: FormState, form: FormData) => Promise<FormState>;
  skillOptions: string[];
  previousSkills: string[];
  mentors: { id: string; name: string }[];
  photoUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const close = useDialogClose();
  const form = useStaffForm({ initial });

  const skillsHint = previousSkills.length
    ? 'Pilih layanan yang dikuasai. Keahlian sebelumnya: ' +
      previousSkills.join(', ') +
      '.'
    : 'Opsional, termasuk saat Masa Training. Pilih satu atau lebih layanan yang dikuasai, atau biarkan kosong.';

  return (
    <form
      action={(data) => {
        appendStaffForm(data, form.values, {
          file: form.photo,
          removed: form.photoRemoved,
        });
        formAction(data);
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <DialogBody className="flex flex-col gap-16">
        <StaffPhotoField
          name={form.values.name || 'Petugas'}
          url={photoUrl}
          file={form.photo}
          removed={form.photoRemoved}
          pending={pending}
          error={state.errors?.staffPhoto || state.errors?.photoUrl}
          onSelect={form.selectPhoto}
          onRemove={form.removePhoto}
          onInvalid={form.setPhotoInvalid}
        />

        <div className={pairClass}>
          <div className="min-w-0">
            <label htmlFor="staff-name" className={labelClass}>
              Nama petugas
            </label>
            <input
              id="staff-name"
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
            <label htmlFor="staff-phone" className={labelClass}>
              Nomor WhatsApp
            </label>
            <input
              id="staff-phone"
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

        <div className={form.training ? pairClass : ''}>
          <div className="min-w-0">
            <label htmlFor="staff-status" className={labelClass}>
              Status
            </label>
            <select
              id="staff-status"
              name="status"
              className={inputClass}
              value={form.values.status}
              disabled={pending}
              aria-invalid={!!state.errors?.status}
              onChange={(event) => form.set('status', event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <small className={hintClass}>
              {form.training
                ? 'Saat keluar dari training, pilih keahlian aktual trainee sebelum menyimpan.'
                : 'Status menentukan ketersediaan petugas pada penugasan baru.'}
            </small>
            {state.errors?.status && (
              <span className={errorClass} role="alert">
                {state.errors.status}
              </span>
            )}
          </div>
          {form.training && (
            <StaffMentor
              mentors={mentors}
              value={form.values.trainerId}
              disabled={pending}
              error={state.errors?.trainerId}
              onChange={(id) => form.set('trainerId', id)}
            />
          )}
        </div>

        {form.training ? (
          <p className="rounded-control border border-line bg-surface-soft p-12 text-sm leading-[1.6] text-ink-muted">
            Keahlian tidak dipilih selama masa training. Keahlian muncul kembali
            saat status diubah menjadi Tersedia atau Bertugas.
          </p>
        ) : (
          <StaffSkills
            options={skillOptions}
            selected={form.values.skills}
            disabled={pending}
            hint={skillsHint}
            error={state.errors?.skills}
            onToggle={form.toggleSkill}
          />
        )}

        {state.message && (
          <p className={noticeClass} role="alert">
            {state.message}
          </p>
        )}
        {Object.entries(state.errors ?? {})
          .filter(
            ([name]) =>
              ![
                'name',
                'phone',
                'status',
                'trainerId',
                'skills',
                'staffPhoto',
                'photoUrl',
              ].includes(name),
          )
          .map(([name, message]) => (
            <p key={name} className={errorClass} role="alert">
              {message}
            </p>
          ))}
      </DialogBody>
      <DialogFooter className="items-center">
        <span className="mr-auto text-xs text-ink-muted">
          {initial?.id ? '#' + initial.id : 'Petugas baru'}
        </span>
        {close ? (
          <Button variant="ghost" disabled={pending} onClick={close}>
            Batal
          </Button>
        ) : (
          <Link
            className={buttonVariants({ variant: 'ghost' })}
            href="/petugas"
          >
            Batal
          </Link>
        )}
        <SubmitButton disabled={pending || form.photoInvalid}>
          {initial?.id ? 'Simpan perubahan' : 'Simpan petugas'}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
