'use client';
import { useActionState, useId, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useDialogClose } from './DialogTrigger';
import type { Field, FormState, RecordData } from '@/types';
import { StaffAvatar } from './StaffAvatar';
import { StaffPhotoField } from './StaffPhotoField';

type FormAction = (state: FormState, form: FormData) => Promise<FormState>;

export function SubmitButton({
  children,
  pendingLabel = 'Menyimpan…',
  className = 'button primary',
  disabled = false,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending || disabled}>
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
  intro,
  staffPhoto,
}: {
  fields: Field[];
  initial?: Partial<RecordData>;
  action: FormAction;
  cancelHref: string;
  submitLabel?: string;
  intro?: ReactNode;
  staffPhoto?: string | null;
}) {
  const formId = useId();
  const [state, formAction, pending] = useActionState(action, {});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoInvalid, setPhotoInvalid] = useState(false);
  const close = useDialogClose();
  return (
    <form
      action={(form) => {
        if (staffPhoto !== undefined) {
          if (photoFile) form.set('staffPhoto', photoFile);
          form.set('removeStaffPhoto', String(photoRemoved));
        }
        formAction(form);
      }}
      className="next-form"
    >
      <div className="modal-body manage-form">
        {intro}
        {staffPhoto !== undefined && (
          <StaffPhotoField
            name={String(initial.name ?? 'Petugas')}
            url={staffPhoto}
            file={photoFile}
            removed={photoRemoved}
            pending={pending}
            error={state.errors?.staffPhoto || state.errors?.photoUrl}
            onSelect={(file) => {
              setPhotoFile(file);
              setPhotoRemoved(false);
            }}
            onRemove={() => {
              setPhotoFile(null);
              setPhotoRemoved(true);
            }}
            onInvalid={setPhotoInvalid}
          />
        )}
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
            const hintId = inputId + '-hint';
            const error = state.errors?.[field.name];
            const props = {
              id: inputId,
              name: field.name,
              required: field.required,
              'aria-invalid': !!error,
              'aria-describedby':
                [field.hint && hintId, error && errorId]
                  .filter(Boolean)
                  .join(' ') || undefined,
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
                    key={JSON.stringify(value)}
                    className="staff-fieldset"
                    aria-invalid={!!error}
                    aria-required={field.required}
                    aria-describedby={props['aria-describedby']}
                  >
                    <legend>{field.label}</legend>
                    <div
                      className={
                        'compact-staff' +
                        (field.name === 'skills' ? ' service-skills' : '')
                      }
                    >
                      {field.options?.map((option) => (
                        <label key={option}>
                          <input
                            type="checkbox"
                            aria-label={option}
                            name={field.name}
                            value={option}
                            defaultChecked={
                              Array.isArray(value) && value.includes(option)
                            }
                          />
                          {field.optionPhotos && (
                            <StaffAvatar
                              name={option}
                              src={field.optionPhotos[option]}
                            />
                          )}
                          <span className="staff-option-copy">
                            <span>
                              {option}
                              {field.recommendedOptions?.includes(option) && (
                                <small className="staff-recommended">
                                  Direkomendasikan
                                </small>
                              )}
                            </span>
                            {field.optionHints?.[option] && (
                              <small>{field.optionHints[option]}</small>
                            )}
                          </span>
                        </label>
                      ))}
                      {!field.options?.length && (
                        <span className="muted">
                          {field.emptyMessage ?? 'Belum ada petugas aktif.'}
                        </span>
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
                        placeholder={field.placeholder}
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
                        placeholder={field.placeholder}
                        defaultValue={text}
                        min={field.kind === 'number' ? 0 : undefined}
                        step={field.kind === 'number' ? 1 : undefined}
                        maxLength={3000}
                      />
                    )}
                  </>
                )}
                {field.hint && (
                  <small className="field-hint" id={hintId}>
                    {field.hint}
                  </small>
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
        {Object.entries(state.errors ?? {})
          .filter(
            ([name]) =>
              !fields.some((field) => field.name === name) &&
              !(
                staffPhoto !== undefined &&
                ['staffPhoto', 'photoUrl'].includes(name)
              ),
          )
          .map(([name, message]) => (
            <p key={name} className="field-error" role="alert">
              {message}
            </p>
          ))}
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
        <SubmitButton disabled={photoInvalid}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export function DeleteForm({
  action,
  name,
}: {
  action: FormAction;
  name: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const close = useDialogClose();
  return (
    <form action={formAction} className="next-form">
      <div className="modal-body">
        <p>
          Hapus <strong>{name}</strong> dari daftar?
        </p>
        <p className="muted">
          Pastikan data sudah tidak diperlukan sebelum menghapusnya.
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
        <SubmitButton pendingLabel="Menghapus…" className="button destructive">
          Hapus data
        </SubmitButton>
      </div>
    </form>
  );
}
