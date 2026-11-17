'use client';
import { useActionState, type ReactNode } from 'react';
import type { Schedule, Staff } from '@/types';
import { bookingStartSlots } from '@/lib/resources';
import { scheduleStatusOptions } from '@/lib/schedules';
import {
  DialogBody,
  DialogFooter,
  StatusBadge,
  UiIcon,
  buttonVariants,
  SubmitButton,
} from '@/components/shared/ui';
import { useScheduleEditor } from '@/hooks/useScheduleEditor';
import { StaffAvatar } from '@/components/staff/StaffAvatar';
import { cn } from '@/lib/cn';
import { CancelButton } from './CancelButton';
import { Field } from './Field';
import { FormFeedback } from './FormFeedback';
import {
  errorClass,
  formClass,
  gridClass,
  inputClass,
  labelClass,
  panelCaptionClass,
  panelClass,
  panelTitleClass,
  type Action,
} from './data';

export function ScheduleEditor({
  schedule,
  staff,
  action,
}: {
  schedule?: Schedule;
  staff: Staff[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const { uid, values, set, setStart, setEnd, person, options } =
    useScheduleEditor({ schedule, staff });
  function props(name: string) {
    return {
      id: uid + name,
      name,
      required: true,
      value: values[name],
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
      ) => set(name, event.target.value),
      'aria-invalid': !!state.errors?.[name],
      'aria-describedby': state.errors?.[name]
        ? uid + name + '-error'
        : undefined,
    };
  }
  function field(name: string, label: string, input: ReactNode, wide = false) {
    return (
      <Field
        id={uid + name}
        label={label}
        error={state.errors?.[name]}
        wide={wide}
        required
      >
        {input}
      </Field>
    );
  }
  return (
    <form action={formAction} className={formClass}>
      <DialogBody className="flex flex-1 flex-col gap-20">
        <div className={panelClass}>
          <StaffAvatar name={values.staff} src={person?.photoUrl} />
          <div className="min-w-0">
            <strong className={panelTitleClass}>
              {values.staff || 'Petugas belum ditugaskan'}
            </strong>
            <p className={cn(panelCaptionClass, 'mt-3')}>
              {person?.skills?.join(' · ') || 'Kru kebersihan'}
            </p>
            {person && (
              <StatusBadge status={person.status} className="mt-6 text-xs" />
            )}
          </div>
        </div>
        <fieldset disabled={pending} className={gridClass}>
          {field(
            'staff',
            'Pilih petugas / kru kebersihan',
            <select {...props('staff')} className={inputClass}>
              {options.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>,
            true,
          )}
          <div className="col-span-full min-w-0">
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className={labelClass}>Pilihan shift kerja</legend>
              <div className="grid grid-cols-3 gap-10 max-sm:grid-cols-1">
                <label className="flex min-w-0 flex-col gap-6 rounded-md border border-line bg-canvas p-12">
                  <span className="text-sm leading-[1.6] font-semibold text-ink">
                    Jam mulai
                  </span>
                  <select
                    id={uid + 'shift-start'}
                    className={inputClass}
                    value={values.start}
                    onChange={(event) => setStart(event.target.value)}
                  >
                    {bookingStartSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot.replace(':', '.')} WIB
                      </option>
                    ))}
                    {!bookingStartSlots.some(
                      (slot) => slot === values.start,
                    ) && (
                      <option key="shift-start-existing" value={values.start}>
                        {values.start.replace(':', '.')} WIB
                      </option>
                    )}
                  </select>
                </label>
                <label className="flex min-w-0 flex-col gap-6 rounded-md border border-line bg-canvas p-12">
                  <span className="text-sm leading-[1.6] font-semibold text-ink">
                    Jam selesai
                  </span>
                  <input
                    id={uid + 'shift-end'}
                    className={inputClass}
                    type="time"
                    value={values.end}
                    onChange={(event) => setEnd(event.target.value)}
                  />
                </label>
              </div>
            </fieldset>
          </div>
          {field(
            'date',
            'Tanggal shift',
            <input type="date" {...props('date')} className={inputClass} />,
          )}
          {field(
            'time',
            'Jam shift',
            <input
              {...props('time')}
              className={inputClass}
              placeholder="13.00–17.00 WIB"
            />,
          )}
          <div className="col-span-full min-w-0">
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className={labelClass}>Status jadwal</legend>
              <div className="grid grid-cols-4 gap-10 max-sm:grid-cols-1">
                {scheduleStatusOptions().map((status) => (
                  <label
                    key={status}
                    className={cn(
                      'flex min-w-0 cursor-pointer items-center justify-center gap-6 rounded-control border border-line bg-canvas px-6 py-10 text-sm max-sm:justify-start max-sm:px-12',
                      values.status === status &&
                        'border-line-strong bg-accent-soft text-accent',
                    )}
                  >
                    <input
                      type="radio"
                      name="status"
                      className="m-0"
                      value={status}
                      checked={values.status === status}
                      onChange={() => set('status', status)}
                    />
                    {status}
                  </label>
                ))}
              </div>
              {state.errors?.status && (
                <small className={errorClass}>{state.errors.status}</small>
              )}
            </fieldset>
          </div>
        </fieldset>
        <FormFeedback state={state} />
      </DialogBody>
      <DialogFooter className="items-center">
        <CancelButton href="/jadwal" />
        <SubmitButton className={buttonVariants({ variant: 'primary' })}>
          <UiIcon name="tick" />
          {schedule ? 'Simpan Perubahan Jadwal' : 'Simpan Jadwal'}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
