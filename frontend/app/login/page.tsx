import type { Metadata } from 'next';
import { LoginPage } from '@/features/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Masuk Admin' };

export default function Login() {
  return <LoginPage />;
}
