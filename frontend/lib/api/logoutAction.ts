'use server';

import { redirect } from 'next/navigation';
import { clearSession } from './session';

/**
 * Logout di level API/sesi, bukan domain satu halaman, karena dipakai
 * sidebar admin, menu akun, dan dialog bantuan login.
 */
export async function logoutAction(): Promise<never> {
  await clearSession();
  redirect('/login');
}
