import type { UiIconName } from '@/components/shared/ui/UiIcon';

export type LoginFieldName = 'username' | 'password';

export type LoginField = {
  name: LoginFieldName;
  label: string;
  placeholder: string;
  autoComplete: string;
  icon: UiIconName;
};

export const LOGIN_FIELDS: readonly LoginField[] = [
  {
    name: 'username',
    label: 'Email atau username',
    placeholder: 'admin@cleango.id',
    autoComplete: 'username',
    icon: 'mail',
  },
  {
    name: 'password',
    label: 'Kata sandi',
    placeholder: 'Masukkan kata sandi',
    autoComplete: 'current-password',
    icon: 'lock',
  },
];

export const LOGIN_COPY = {
  title: 'Masuk ke Akun Admin',
  description: 'Masuk untuk mengelola pesanan dan layanan CleanGo.',
  submit: 'Masuk Sekarang',
  pending: 'Memeriksa akun…',
  remember: 'Ingat saya',
  showPassword: 'Tampilkan kata sandi',
  hidePassword: 'Sembunyikan kata sandi',
  help: {
    trigger: 'Butuh Bantuan?',
    title: 'Bantuan masuk',
    demo: 'Mode demo frontend: gunakan username admin dan kata sandi admin. Seluruh data adalah data uji lokal.',
    live: 'Gunakan akun admin yang diberikan pengelola. Akun demo backend tim: admin@cleango.id dengan kata sandi 321321.',
    logout: 'Hapus sesi dan masuk ulang',
  },
} as const;
