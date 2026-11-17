import type { ReactNode } from 'react';
import { errorClass, labelClass } from './data';

/** Label + kontrol + pesan galat untuk satu isian form. */
export function Field({
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
    <div className={wide ? 'col-span-full min-w-0' : 'min-w-0'}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <small className={errorClass} id={id + '-error'}>
          {error}
        </small>
      )}
    </div>
  );
}
