'use client';
import { useActionState, useId, useState, type ReactNode } from 'react';
import type { Order, Schedule, Service, Staff } from '@/types';
import { resources } from '@/lib/resources';
import {
  DialogBody,
  DialogFooter,
  Initials,
  StatusBadge,
  UiIcon,
  buttonVariants,
  SubmitButton,
} from '@/components/shared/ui';
import { assignmentIssue } from '@/lib/staff-schedules';
import { orderStatusLabel } from '@/lib/order-flow';
import { StaffAvatar } from '@/components/staff/StaffAvatar';
import { CancelButton } from './CancelButton';
import { Field } from './Field';
import { FormFeedback } from './FormFeedback';
import {
  dangerGhostClass,
  errorClass,
  formClass,
  gridClass,
  hintClass,
  inputClass,
  labelClass,
  panelCaptionClass,
  panelClass,
  panelTitleClass,
  readonlyClass,
  textareaClass,
  type Action,
} from './data';

export function OrderEditor({
  order,
  services,
  staff,
  phone,
  schedules,
  orders,
  action,
}: {
  order: Order;
  services: Service[];
  staff: Staff[];
  phone: string;
  schedules: Schedule[];
  orders: Order[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const uid = useId();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      [
        'customer',
        'service',
        'date',
        'time',
        'price',
        'status',
        'address',
        'notes',
      ].map((key) => [key, String(order[key] ?? '')]),
    ),
  );
  const [crew, setCrew] = useState<string[]>(
    Array.isArray(order.staff) ? order.staff : [],
  );
  function set(name: string, value: string) {
    setValues((previous) => ({ ...previous, [name]: value }));
  }
  function props(name: string, required = true) {
    return {
      id: uid + name,
      name,
      required,
      value: values[name],
      onChange: (
        event: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
      ) => set(name, event.target.value),
      'aria-invalid': !!state.errors?.[name],
      'aria-describedby': state.errors?.[name]
        ? uid + name + '-error'
        : undefined,
    };
  }
  function field(
    name: string,
    label: string,
    input: ReactNode,
    wide = false,
    required = true,
  ) {
    return (
      <Field
        id={uid + name}
        label={label}
        error={state.errors?.[name]}
        wide={wide}
        required={required}
      >
        {input}
      </Field>
    );
  }
  const available = staff.filter(
    (person) =>
      !assignmentIssue(
        person,
        { ...order, date: values.date, time: values.time },
        schedules,
        orders,
      ) || crew.includes(person.name),
  );
  const crewOptions = [
    ...new Set([...available.map((person) => person.name), ...crew]),
  ];
  function toggleCrew(name: string, checked: boolean) {
    // One cleaner per order: the assignment table allows a single row per booking.
    const next = checked ? [name] : [];
    setCrew(next);
    if (next.length && values.status === 'Menunggu Assign')
      set('status', 'Menunggu Lokasi');
    else if (!next.length && values.status === 'Menunggu Lokasi')
      set('status', 'Menunggu Assign');
  }
  return (
    <form action={formAction} className={formClass}>
      <DialogBody className="flex flex-1 flex-col gap-20">
        <div className={panelClass}>
          <Initials name={order.customer} />
          <div className="min-w-0">
            <small className={panelCaptionClass}>Pemesan</small>
            <strong className={panelTitleClass}>{order.customer}</strong>
          </div>
          <div className="ml-auto text-right">
            <small className={panelCaptionClass}>Status saat ini</small>
            <StatusBadge status={order.status} />
          </div>
        </div>
        <input type="hidden" name="customer" value={values.customer} />
        <fieldset disabled={pending} className={gridClass}>
          {field(
            'service',
            'Paket layanan',
            <select
              {...props('service')}
              className={inputClass}
              onChange={(event) => {
                const selected = services.find(
                  (service) => service.name === event.target.value,
                );
                setValues((previous) => ({
                  ...previous,
                  service: event.target.value,
                  price: selected ? String(selected.price) : previous.price,
                }));
              }}
            >
              {[
                ...new Set([
                  order.service,
                  ...services
                    .filter((service) => service.active)
                    .map((service) => service.name),
                ]),
              ].map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>,
          )}
          {field(
            'status',
            'Ubah status pesanan',
            <select
              {...props('status')}
              className={inputClass}
              onChange={(event) => {
                set('status', event.target.value);
                if (event.target.value === 'Menunggu Assign') setCrew([]);
              }}
            >
              {resources.orders.fields
                .find((field) => field.name === 'status')
                ?.options?.map((status) => (
                  <option key={status} value={status}>
                    {orderStatusLabel(status)}
                  </option>
                ))}
            </select>,
          )}
          {field(
            'date',
            'Tanggal pengerjaan',
            <input type="date" {...props('date')} className={inputClass} />,
          )}
          {field(
            'time',
            'Jam / slot waktu',
            <input
              {...props('time')}
              className={inputClass}
              placeholder="13.30–16.30 WIB"
            />,
          )}
          <div className="col-span-full min-w-0">
            <label htmlFor={uid + 'crew-picker'} className={labelClass}>
              Petugas kebersihan
            </label>
            <details className="rounded-md border border-line bg-surface-soft">
              <summary
                id={uid + 'crew-picker'}
                className="flex min-h-44 cursor-pointer list-none items-center justify-between gap-12 px-12 py-11 text-base leading-[1.6] break-words [&::-webkit-details-marker]:hidden"
              >
                {crew.length ? crew.join(' & ') : 'Pilih petugas kebersihan'}
                <UiIcon name="down" />
              </summary>
              <div className="flex flex-col gap-8 px-12 pt-4 pb-12">
                {crewOptions.map((name) => (
                  <label
                    key={name}
                    className="flex cursor-pointer items-center gap-10 rounded-control border border-line bg-surface p-8"
                  >
                    <input
                      type="checkbox"
                      value={name}
                      checked={crew.includes(name)}
                      disabled={
                        !crew.includes(name) &&
                        !!assignmentIssue(
                          staff.find((person) => person.name === name)!,
                          { ...order, date: values.date, time: values.time },
                          schedules,
                          orders,
                        )
                      }
                      onChange={(event) =>
                        toggleCrew(name, event.target.checked)
                      }
                    />
                    <StaffAvatar
                      name={name}
                      src={
                        staff.find((person) => person.name === name)?.photoUrl
                      }
                    />
                    <span>
                      <strong className="block text-base font-medium">
                        {name}
                      </strong>
                      <small className="block text-xs text-ink-muted">
                        {staff.find((person) => person.name === name)?.status ??
                          'Penugasan tersimpan'}
                      </small>
                    </span>
                  </label>
                ))}
                {!crewOptions.length && (
                  <p className="text-xs text-ink-muted">
                    Belum ada petugas aktif yang dapat dipilih.
                  </p>
                )}
              </div>
            </details>
            {crew.map((name) => (
              <input type="hidden" key={name} name="staff" value={name} />
            ))}
            {state.errors?.staff && (
              <small className={errorClass} role="alert">
                {state.errors.staff}
              </small>
            )}
            <small className={hintClass}>
              Pilihan mengikuti shift di Kelola Jadwal. Bisa menugaskan lebih
              dari satu petugas jika tersedia.
            </small>
          </div>
          {field(
            'address',
            'Alamat lengkap lokasi',
            <textarea
              {...props('address')}
              className={textareaClass}
              rows={3}
              maxLength={3000}
            />,
            true,
          )}
          {field(
            'phone',
            'Nomor WhatsApp pelanggan',
            <input
              id={uid + 'phone'}
              className={readonlyClass}
              value={phone || 'Belum ditambahkan'}
              readOnly
            />,
            false,
            false,
          )}
          {field(
            'price',
            'Total biaya (Rp)',
            <input
              type="number"
              min={0}
              step={1}
              {...props('price')}
              className={inputClass}
            />,
          )}
          {field(
            'notes',
            'Catatan pelanggan',
            <textarea
              {...props('notes', false)}
              className={textareaClass}
              rows={2}
              maxLength={3000}
              placeholder="Catatan kebutuhan pelanggan atau koordinasi kru"
            />,
            true,
            false,
          )}
        </fieldset>
        <FormFeedback state={state} />
        {values.status === 'Batal' && order.status !== 'Batal' && (
          <p
            role="status"
            className="rounded-md bg-danger-soft p-12 text-sm leading-[1.6] text-danger"
          >
            Pesanan akan dibatalkan setelah kamu menyimpan perubahan.
          </p>
        )}
      </DialogBody>
      <DialogFooter className="items-center">
        <CancelButton />
        {!['Batal', 'Selesai'].includes(order.status) && (
          <button
            type="button"
            className={dangerGhostClass}
            disabled={pending || values.status === 'Batal'}
            onClick={() => set('status', 'Batal')}
          >
            Batalkan Pesanan
          </button>
        )}
        <SubmitButton className={buttonVariants({ variant: 'primary' })}>
          <UiIcon name="tick" />
          Simpan Perubahan
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
