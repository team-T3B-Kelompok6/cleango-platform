import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import LoginForm, { LoginHelp } from '@/components/auth';
import { AuthLayout } from '@/components/shared/layout/AuthLayout';
import { adminDemoEnabled } from '@/lib/demo/mode';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Masuk Admin' };

export default async function Login() {
  const session = (await cookies()).has('cleango-session');
  return (
    <AuthLayout
      headerAction={<LoginHelp demo={adminDemoEnabled()} session={session} />}
    >
      <LoginForm />
    </AuthLayout>
  );
}
