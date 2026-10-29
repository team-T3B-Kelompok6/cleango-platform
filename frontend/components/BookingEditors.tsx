'use client';
import { useActionState, useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { FormState, Order, Schedule, Service, Staff } from '@/types';
import { resources, scheduleShifts, shiftOf } from '@/lib/resources';
import { Badge } from './StatusBadge';
import { UiIcon } from './UiIcon';
import { DialogNote } from './DialogNote';
import { SubmitButton } from './Form';
import { useDialogClose } from './DialogContext';
import { assignmentIssue } from '@/lib/staff-schedules';
import { orderStatusLabel } from '@/lib/order-flow';
import { StaffAvatar } from './StaffAvatar';

type Action = (previous: FormState, form: FormData) => Promise<FormState>;
function Field({
  id,
  label,
  error,
  children,
  wide = false,
  required = false,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  wide?: boolean;
  required?: boolean;
}) {
  return (
    <div className={'booking-field' + (wide ? ' full-width' : '')}>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {error && (
        <small className="field-error" id={id + '-error'}>
          {error}
        </small>
      )}
    </div>
  );
}
function FormFeedback({ state }: { state: FormState }) {
  return state.message ? (
    <p className="form-error" role="alert">
      {state.message}
    </p>
  ) : null;
}
function CancelButton({ href = '/pesanan' }: { href?: string }) {
  const close = useDialogClose();
  return close ? (
    <button type="button" className="button" onClick={close}>
      Batal
    </button>
  ) : (
    <Link className="button" href={href}>
      Batal
    </Link>
  );
}

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
    <form action={formAction} className="next-form booking-editor order-editor">
      <div className="modal-body booking-editor-body">
        <div className="booking-customer-summary">
          <span className="detail-initials">
            {order.customer
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((word) => word[0])
              .join('')}
          </span>
          <div>
            <small>Pemesan</small>
            <strong>{order.customer}</strong>
          </div>
          <div className="booking-current-status">
            <small>Status saat ini</small>
            <Badge status={order.status} />
          </div>
        </div>
        <input type="hidden" name="customer" value={values.customer} />
        <fieldset disabled={pending} className="booking-form-grid">
          {field(
            'service',
            'Paket layanan',
            <select
              {...props('service')}
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
            <input type="date" {...props('date')} />,
          )}
          {field(
            'time',
            'Jam / slot waktu',
            <input {...props('time')} placeholder="13.30–16.30 WIB" />,
          )}
          <div className="booking-field full-width">
            <label htmlFor={uid + 'crew-picker'}>Petugas kebersihan</label>
            <details className="booking-crew-picker">
              <summary id={uid + 'crew-picker'}>
                {crew.length ? crew.join(' & ') : 'Pilih petugas kebersihan'}
                <UiIcon name="down" />
              </summary>
              <div className="booking-crew-options">
                {crewOptions.map((name) => (
                  <label key={name}>
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
                      <strong>{name}</strong>
                      <small>
                        {staff.find((person) => person.name === name)?.status ??
                          'Penugasan tersimpan'}
                      </small>
                    </span>
                  </label>
                ))}
                {!crewOptions.length && (
                  <p>Belum ada petugas aktif yang dapat dipilih.</p>
                )}
              </div>
            </details>
            {crew.map((name) => (
              <input type="hidden" key={name} name="staff" value={name} />
            ))}
            {state.errors?.staff && (
              <small className="field-error" role="alert">
                {state.errors.staff}
              </small>
            )}
            <small className="field-hint">
              Pilihan mengikuti shift di Kelola Jadwal. Bisa menugaskan lebih
              dari satu petugas jika tersedia.
            </small>
          </div>
          {field(
            'address',
            'Alamat lengkap lokasi',
            <textarea {...props('address')} rows={3} maxLength={3000} />,
            true,
          )}
          {field(
            'phone',
            'Nomor WhatsApp pelanggan',
            <input
              id={uid + 'phone'}
              value={phone || 'Belum ditambahkan'}
              readOnly
            />,
            false,
            false,
          )}
          {field(
            'price',
            'Total biaya (Rp)',
            <input type="number" min={0} step={1} {...props('price')} />,
          )}
          {field(
            'notes',
            'Catatan pelanggan',
            <textarea
              {...props('notes', false)}
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
          <p role="status" className="booking-cancel-notice">
            Pesanan akan dibatalkan setelah kamu menyimpan perubahan.
          </p>
        )}
        <DialogNote>
          <p>
            Periksa jadwal dan penugasan sebelum menyimpan. Hubungi pelanggan
            atau petugas melalui WhatsApp jika perubahan memerlukan konfirmasi.
          </p>
        </DialogNote>
      </div>
      <div className="modal-footer booking-editor-footer">
        <CancelButton />
        {!['Batal', 'Selesai'].includes(order.status) && (
          <button
            type="button"
            className="button booking-cancel-action"
            disabled={pending || values.status === 'Batal'}
            onClick={() => set('status', 'Batal')}
          >
            Batalkan Pesanan
          </button>
        )}
        <SubmitButton>
          <UiIcon name="tick" />
          Simpan Perubahan
        </SubmitButton>
      </div>
    </form>
  );
}

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
  const uid = useId();
  const [values, setValues] = useState<Record<string, string>>(() => ({
    date:
      schedule?.date ??
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(
        new Date(),
      ),
    time: schedule?.time ?? scheduleShifts[0].time,
    staff:
      schedule?.staff ??
      staff.find((person) => ['Tersedia', 'Bertugas'].includes(person.status))
        ?.name ??
      '',
    status: schedule?.status ?? 'Terjadwal',
  }));
  function set(name: string, value: string) {
    setValues((previous) => ({ ...previous, [name]: value }));
  }
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
  const person = staff.find((person) => person.name === values.staff);
  const options = [
    ...new Set([
      ...staff
        .filter(
          (person) =>
            person.name === schedule?.staff ||
            ['Tersedia', 'Bertugas'].includes(person.status),
        )
        .map((person) => person.name),
    ]),
  ];
  return (
    <form
      action={formAction}
      className="next-form booking-editor schedule-editor"
    >
      <div className="modal-body booking-editor-body">
        <div className="schedule-staff-summary">
          <StaffAvatar name={values.staff} src={person?.photoUrl} />
          <div>
            <strong>{values.staff || 'Petugas belum ditugaskan'}</strong>
            <p>{person?.skills?.join(' · ') || 'Kru kebersihan'}</p>
            {person && <Badge status={person.status} />}
          </div>
        </div>
        <fieldset disabled={pending} className="booking-form-grid">
          {field(
            'staff',
            'Pilih petugas / kru kebersihan',
            <select {...props('staff')}>
              {options.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>,
            true,
          )}
          <div className="booking-field full-width">
            <fieldset className="schedule-shift-options">
              <legend>Pilihan shift kerja</legend>
              <div>
                {scheduleShifts.map((shift) => (
                  <label
                    key={shift.name}
                    className={
                      shiftOf(values.time) === shift.name ? 'selected' : ''
                    }
                  >
                    <input
                      type="radio"
                      name="shiftChoice"
                      value={shift.name}
                      checked={shiftOf(values.time) === shift.name}
                      onChange={() => set('time', shift.time)}
                    />
                    <span>
                      <strong>{shift.name}</strong>
                      <small>{shift.time}</small>
                    </span>
                    <UiIcon name="tick" />
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          {field(
            'date',
            'Tanggal shift',
            <input type="date" {...props('date')} />,
          )}
          {field(
            'time',
            'Jam shift',
            <input {...props('time')} placeholder="13.00–17.00 WIB" />,
          )}
          <div className="booking-field full-width">
            <fieldset className="schedule-status-options">
              <legend>Status jadwal</legend>
              <div>
                {resources.schedules.fields
                  .find((field) => field.name === 'status')!
                  .options!.map((status) => (
                    <label
                      key={status}
                      className={values.status === status ? 'selected' : ''}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={status}
                        checked={values.status === status}
                        onChange={() => set('status', status)}
                      />
                      {status}
                    </label>
                  ))}
              </div>
              {state.errors?.status && (
                <small className="field-error">{state.errors.status}</small>
              )}
            </fieldset>
          </div>
        </fieldset>
        <FormFeedback state={state} />
        <DialogNote>
          <p>
            Pastikan waktu penugasan sesuai dengan pesanan pelanggan dan
            ketersediaan kru. Perubahan diterapkan setelah jadwal disimpan.
          </p>
        </DialogNote>
      </div>
      <div className="modal-footer booking-editor-footer">
        <CancelButton href="/jadwal" />
        <SubmitButton>
          <UiIcon name="tick" />
          {schedule ? 'Simpan Perubahan Jadwal' : 'Simpan Jadwal'}
        </SubmitButton>
      </div>
    </form>
  );
}
