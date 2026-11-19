import type {
  LoginCredentials,
  LoginFormValues,
  LoginSession,
} from './authTypes';

interface LoginValidation {
  values: LoginFormValues;
  /** `null` bila masih ada field yang belum valid. */
  credentials: LoginCredentials | null;
  errors: Record<string, string>;
}

/**
 * Validasi form login. Dipakai server action (sumber kebenaran) dan boleh
 * dipakai ulang di hook client tanpa menduplikasi aturan.
 */
export function validateLoginForm(form: FormData): LoginValidation {
  const username = String(form.get('username') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const values: LoginFormValues = { username };
  const errors: Record<string, string> = {};

  if (!username) errors.username = 'Isi username.';
  if (!password) errors.password = 'Isi kata sandi.';

  if (Object.keys(errors).length) return { values, credentials: null, errors };

  return {
    values,
    errors,
    credentials: {
      username,
      password,
      remember: form.get('remember') === 'on',
    },
  };
}

/**
 * Token dipakai langsung sebagai nilai cookie dan header Bearer, jadi bentuk
 * aneh dari upstream harus ditolak sebelum disimpan.
 */
export function isLoginSession(value: unknown): value is LoginSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<LoginSession>;
  return (
    typeof session.accessToken === 'string' &&
    session.accessToken.trim().length > 0 &&
    !/[\s\u0000-\u001f\u007f;]/.test(session.accessToken) &&
    Number.isSafeInteger(session.expiresIn) &&
    (session.expiresIn as number) > 0
  );
}
