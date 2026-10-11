'use client';
import { useActionState, useState } from 'react';
import { loginAction } from '@/app/actions';
import { SubmitButton } from './Form';
import { UiIcon } from './UiIcon';
import { Icon } from './Icon';
export function LoginForm() {
  const [state, action] = useActionState(loginAction, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action}>
      <div className="login-field">
        <label htmlFor="username">EMAIL ATAU USERNAME</label>
        <span className="login-input-wrap">
          <span className="login-input-icon">
            <UiIcon name="mail" />
          </span>
          <input
            id="username"
            name="username"
            autoComplete="username"
            placeholder="admin"
            required
            defaultValue={(state.values?.username as string) ?? ''}
            aria-invalid={!!state.errors?.username}
          />
        </span>
        {state.errors?.username && (
          <span className="field-error">{state.errors.username}</span>
        )}
      </div>
      <div className="login-field">
        <label htmlFor="password">KATA SANDI</label>
        <span className="login-input-wrap password-field">
          <span className="login-input-icon">
            <UiIcon name="lock" />
          </span>
          <input
            id="password"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="Masukkan kata sandi"
            aria-invalid={!!state.errors?.password}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={
              show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
            }
          >
            <UiIcon name={show ? 'eyeOff' : 'eye'} />
          </button>
        </span>
        {state.errors?.password && (
          <span className="field-error">{state.errors.password}</span>
        )}
      </div>
      <label className="login-remember">
        <input name="remember" type="checkbox" />
        Ingat saya
      </label>
      {state.message && (
        <p className="login-error" role="alert">
          {state.message}
        </p>
      )}
      <div className="login-submit">
        <SubmitButton pendingLabel="Memeriksa akun…">
          Masuk Sekarang
          <Icon name="arrow" />
        </SubmitButton>
      </div>
    </form>
  );
}
