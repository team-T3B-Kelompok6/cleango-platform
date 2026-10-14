import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { CleanGoLogo } from '@/components/CleanGoLogo';
import { DialogTrigger } from '@/components/DialogTrigger';
import { LoginForm } from '@/components/LoginForm';
import { logoutAction } from '@/app/actions';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Masuk Admin' };
export default async function Login() {
  const session = (await cookies()).has('cleango-session');
  return (
    <main className="login-page">
      <header className="login-header">
        <div className="login-brand">
          <CleanGoLogo />
          <span>
            <strong>
              cleango<span>•</span>
            </strong>
            <small>Layanan Kebersihan Jadi Mudah</small>
          </span>
        </div>
        <DialogTrigger
          label="Butuh Bantuan?"
          title="Bantuan masuk"
          className="login-help-button"
        >
          <div className="modal-body">
            <p>
              Masuk dengan username admin dan kata sandi admin. Hubungi
              pengelola jika akun belum dapat digunakan.
            </p>
            {session && (
              <form action={logoutAction}>
                <button className="button">Hapus sesi dan masuk ulang</button>
              </form>
            )}
          </div>
        </DialogTrigger>
      </header>
      <div className="login-center">
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-intro">
            <CleanGoLogo className="login-brand-logo" />
            <h1 id="login-title">Masuk ke Akun Admin</h1>
            <p>Masuk untuk mengelola pesanan dan layanan CleanGo.</p>
          </div>
          <LoginForm />
        </section>
        <small className="login-copyright">© 2026 CleanGo</small>
      </div>
    </main>
  );
}
