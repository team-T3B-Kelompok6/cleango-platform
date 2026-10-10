import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Image from 'next/image';
import { Icon } from '@/components/Icon';
import { UiIcon } from '@/components/UiIcon';
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
          <span className="brand-symbol">
            <Icon name="brand" />
          </span>
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
            <span className="login-panda">
              <Image src="/assets/panda.svg" alt="" width={40} height={40} />
            </span>
            <span className="login-admin-tag">
              <UiIcon name="shield" />
              Admin
            </span>
            <span className="login-eyebrow">PORTAL ADMIN OPERASIONAL</span>
            <h1 id="login-title">Masuk ke Akun Admin</h1>
            <p>
              Silakan masukkan kredensial akun Anda untuk mengelola operasional
              Cleango.
            </p>
          </div>
          <p className="login-access">
            Akses khusus Pengelola &amp; Tim Manajemen Cleango
          </p>
          <LoginForm />
        </section>
        <div className="login-tip">
          <span>
            <UiIcon name="zap" />
          </span>
          <p>
            <strong>Tips Bos:</strong> Pastikan koneksi internet stabil saat
            memverifikasi jadwal orderan dan petugas hari ini!
          </p>
        </div>
        <small className="login-copyright">
          © 2026 Cleango Indonesia · Bersih Cerdas Bersama
        </small>
      </div>
    </main>
  );
}
