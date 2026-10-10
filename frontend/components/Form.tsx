'use client';
import { useActionState, useId, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useDialogClose } from './DialogTrigger';
import type { Field, FormState, RecordData } from '@/types';

type FormAction = (state: FormState, form: FormData) => Promise<FormState>;

export function SubmitButton({
  children,
  pendingLabel = 'Menyimpan…',
}: {
  children: ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className="button primary" type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function ResourceForm({
  fields,
  initial = {},
  action,
  cancelHref,
  submitLabel = 'Simpan perubahan',
}: {
  fields: Field[];
  initial?: Partial<RecordData>;
  action: FormAction;
  cancelHref: string;
  submitLabel?: string;
}) {
  const formId = useId();
  const [state, formAction] = useActionState(action, {});
  const close = useDialogClose();
  return (
    <form action={formAction} className="next-form">
      <div className="modal-body manage-form">
        <div className="form-grid">
          {fields.map((field) => {
            const value =
              state.values?.[field.name] ??
              initial[field.name] ??
              (field.kind === 'boolean'
                ? true
                : field.kind === 'select'
                  ? (field.options?.[0] ?? '')
                  : '');
            const text = Array.isArray(value)
              ? value.join('\n')
              : String(value);
            const inputId = formId + '-field-' + field.name;
            const errorId = inputId + '-error';
            const error = state.errors?.[field.name];
            const props = {
              id: inputId,
              name: field.name,
              required: field.required,
              'aria-invalid': !!error,
              'aria-describedby': error ? errorId : undefined,
            };
            return (
              <div
                key={field.name}
                className={
                  field.kind === 'textarea' || field.kind === 'multiselect'
                    ? 'full-width'
                    : ''
                }
              >
                {field.kind === 'multiselect' ? (
                  <fieldset
                    className="staff-fieldset"
                    aria-describedby={error ? errorId : undefined}
                  >
                    <legend>{field.label}</legend>
                    <div className="compact-staff">
                      {field.options?.map((option) => (
                        <label key={option}>
                          <input
                            type="checkbox"
                            name={field.name}
                            value={option}
                            defaultChecked={
                              Array.isArray(value) && value.includes(option)
                            }
                          />
                          {option}
                        </label>
                      ))}
                      {!field.options?.length && (
                        <span className="muted">Belum ada petugas aktif.</span>
                      )}
                    </div>
                  </fieldset>
                ) : (
                  <>
                    <label htmlFor={inputId}>{field.label}</label>
                    {field.kind === 'textarea' ? (
                      <textarea
                        key={text}
                        {...props}
                        defaultValue={text}
                        rows={3}
                        maxLength={3000}
                      />
                    ) : field.kind === 'select' || field.kind === 'boolean' ? (
                      <select key={text} {...props} defaultValue={text}>
                        {field.kind === 'boolean' ? (
                          <>
                            <option value="true">Aktif</option>
                            <option value="false">Nonaktif</option>
                          </>
                        ) : (
                          field.options?.map((option) => (
                            <option key={option}>{option}</option>
                          ))
                        )}
                      </select>
                    ) : (
                      <input
                        key={text}
                        {...props}
                        type={field.kind ?? 'text'}
                        defaultValue={text}
                        min={field.kind === 'number' ? 0 : undefined}
                        step={field.kind === 'number' ? 1 : undefined}
                        maxLength={3000}
                      />
                    )}
                  </>
                )}
                {error && (
                  <span className="field-error" id={errorId}>
                    {error}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {state.message && (
          <p className="form-error" role="alert">
            {state.message}
          </p>
        )}
      </div>
      <div className="modal-footer">
        {close ? (
          <button type="button" className="button" onClick={close}>
            Batal
          </button>
        ) : (
          <Link className="button" href={cancelHref}>
            Batal
          </Link>
        )}
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export function DeleteForm({ action }: { action: FormAction }) {
  const [state, formAction] = useActionState(action, {});
  const close = useDialogClose();
  return (
    <form action={formAction} className="next-form">
      <div className="modal-body">
        <p className="muted">
          Hapus data ini dari daftar? Pastikan data sudah tidak diperlukan.
        </p>
        {state.message && (
          <p role="alert" className="form-error">
            {state.message}
          </p>
        )}
      </div>
      <div className="modal-footer">
        {close && (
          <button className="button" type="button" onClick={close}>
            Batal
          </button>
        )}
        <SubmitButton pendingLabel="Menghapus…">Hapus data</SubmitButton>
      </div>
    </form>
  );
}
