'use server';

import type { FormState } from '@/types';
import { ApiError, saveSession } from '@/lib/api';
import { loginAdmin } from './authApi';
import { validateLoginForm } from '../data/authValidation';

/**
 * Server action login. Cookie sesi hanya bisa dipasang di server, jadi alur
 * tetap: client mutation → action ini → fetch server → Express.
 * Tidak ada `redirect()` di sini; navigasi dilakukan hook setelah sukses.
 */
export async function loginAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { values, credentials, errors } = validateLoginForm(form);
  if (!credentials) return { errors, values };

  try {
    const session = await loginAdmin(credentials);
    await saveSession(
      session.accessToken,
      session.expiresIn,
      credentials.remember,
    );
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { message: error.message, errors: error.errors, values };
  }

  return { success: true };
}
