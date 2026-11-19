import { AuthLayout } from '@/components/layouts';
import { adminDemoEnabled } from '@/lib/demo/mode';
import { hasSession } from '@/lib/api';
import { LoginForm, LoginHelp } from '../components';

export const dynamic = 'force-dynamic';

/**
 * Halaman login: hanya mengambil data sesi/demo dari server lalu menyerahkan
 * seluruh interaksi ke komponen fitur auth.
 */
export async function LoginPage() {
  const session = await hasSession();

  return (
    <AuthLayout
      headerAction={<LoginHelp demo={adminDemoEnabled()} session={session} />}
    >
      <LoginForm />
    </AuthLayout>
  );
}
