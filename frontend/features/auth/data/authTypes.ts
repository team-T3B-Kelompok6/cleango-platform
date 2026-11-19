import type { UiIconName } from '@/components/ui/UiIcon';

export type LoginFieldName = 'username' | 'password';

export interface LoginField {
  name: LoginFieldName;
  label: string;
  placeholder: string;
  autoComplete: string;
  icon: UiIconName;
}

/** Nilai yang dikirim ke server action login. */
export interface LoginCredentials {
  username: string;
  password: string;
  remember: boolean;
}

/** Nilai field yang dikembalikan ke form saat login gagal. */
export interface LoginFormValues {
  username: string;
  /** Selaras dengan `FormState.values` agar bisa langsung dipakai sebagai state form. */
  [key: string]: string | string[];
}

/**
 * Kontrak `POST /api/auth/login` di backend.
 * Dashboard hanya memakai endpoint platform ini, bukan `/api/admin/auth/login`.
 */
export interface LoginSession {
  accessToken: string;
  expiresIn: number;
}
