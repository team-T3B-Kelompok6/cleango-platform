import type { Field, Resource } from '@/types';
export const resources: Record<
  Resource,
  {
    path: string;
    title: string;
    singular: string;
    description: string;
    fields: Field[];
    tabs?: string[];
    tabField?: string;
  }
> = {
  orders: {
    path: '/pesanan',
    title: 'Kelola Pesanan',
    singular: 'Pesanan',
    description:
      'Kelola daftar order masuk, tentukan cleaner terpilih, dan pantau progres pengerjaan.',
    tabs: ['Semua Pesanan', 'Menunggu Assign', 'Sedang Dikerjakan', 'Selesai'],
    tabField: 'status',
    fields: [
      { name: 'customer', label: 'Nama pelanggan', required: true },
      { name: 'service', label: 'Layanan', required: true },
      {
        name: 'address',
        label: 'Alamat pengerjaan',
        kind: 'textarea',
        required: true,
      },
      { name: 'date', label: 'Tanggal', kind: 'date', required: true },
      { name: 'time', label: 'Jam pengerjaan', required: true },
      { name: 'price', label: 'Biaya (Rp)', kind: 'number', required: true },
      {
        name: 'status',
        label: 'Status',
        kind: 'select',
        options: [
          'Menunggu Assign',
          'Menunggu Lokasi',
          'Sedang Dikerjakan',
          'Selesai',
        ],
        required: true,
      },
      { name: 'staff', label: 'Petugas', kind: 'multiselect', options: [] },
      { name: 'notes', label: 'Catatan', kind: 'textarea' },
    ],
  },
  services: {
    path: '/layanan',
    title: 'Kelola Layanan',
    singular: 'Layanan',
    description:
      'Atur daftar paket kebersihan, harga dasar layanan, estimasi durasi pengerjaan, dan status ketersediaan.',
    tabs: ['Semua Layanan', 'Rumah', 'Kantor', 'Sofa', 'AC'],
    tabField: 'category',
    fields: [
      { name: 'name', label: 'Nama layanan', required: true },
      {
        name: 'category',
        label: 'Kategori',
        kind: 'select',
        options: ['Rumah', 'Kantor', 'Sofa', 'AC'],
        required: true,
      },
      { name: 'duration', label: 'Durasi', required: true },
      { name: 'price', label: 'Harga (Rp)', kind: 'number', required: true },
      { name: 'active', label: 'Status publikasi', kind: 'boolean' },
      {
        name: 'description',
        label: 'Deskripsi',
        kind: 'textarea',
        required: true,
      },
      {
        name: 'features',
        label: 'Fasilitas (satu per baris)',
        kind: 'textarea',
      },
    ],
  },
  staff: {
    path: '/petugas',
    title: 'Kelola Data Petugas',
    singular: 'Petugas',
    description:
      'Daftar, keahlian, kesiapan, area tugas, kontak, dan riwayat penugasan.',
    tabs: ['Semua Petugas', 'Tersedia', 'Bertugas', 'Nonaktif'],
    tabField: 'status',
    fields: [
      { name: 'name', label: 'Nama petugas', required: true },
      { name: 'phone', label: 'Nomor WhatsApp', required: true },
      { name: 'area', label: 'Wilayah kerja', required: true },
      {
        name: 'status',
        label: 'Status',
        kind: 'select',
        options: ['Tersedia', 'Bertugas', 'Nonaktif'],
        required: true,
      },
    ],
  },
  customers: {
    path: '/customer',
    title: 'Kelola Data Customer',
    singular: 'Customer',
    description: 'Daftar pelanggan, kontak, alamat dan status akun.',
    fields: [
      { name: 'name', label: 'Nama customer', required: true },
      { name: 'phone', label: 'Nomor WhatsApp', required: true },
      { name: 'email', label: 'Email', kind: 'email', required: true },
      { name: 'address', label: 'Alamat', kind: 'textarea', required: true },
      {
        name: 'joined',
        label: 'Tanggal bergabung',
        kind: 'date',
        required: true,
      },
      { name: 'active', label: 'Status akun', kind: 'boolean' },
    ],
  },
  faqs: {
    path: '/faq',
    title: 'Kelola FAQ',
    singular: 'FAQ',
    description:
      'Kelola daftar pertanyaan umum dan jawaban operasional Cleango.',
    tabs: ['Semua', 'Layanan', 'Pembayaran', 'Jadwal', 'SOP'],
    tabField: 'category',
    fields: [
      {
        name: 'category',
        label: 'Kategori FAQ',
        kind: 'select',
        options: ['Layanan', 'Pembayaran', 'Jadwal', 'SOP'],
        required: true,
      },
      { name: 'question', label: 'Pertanyaan FAQ', required: true },
      {
        name: 'answer',
        label: 'Jawaban FAQ',
        kind: 'textarea',
        required: true,
      },
      { name: 'published', label: 'Status publikasi', kind: 'boolean' },
    ],
  },
  schedules: {
    path: '/jadwal',
    title: 'Kelola Jadwal',
    singular: 'Jadwal',
    description:
      'Atur jadwal kru harian, pembagian shift, serta jadwal tambahan dari customer.',
    tabs: ['Semua Shift', 'Shift Pagi', 'Shift Siang', 'Shift Sore'],
    tabField: 'shift',
    fields: [
      { name: 'customer', label: 'Nama pelanggan', required: true },
      { name: 'service', label: 'Layanan', required: true },
      { name: 'date', label: 'Tanggal', kind: 'date', required: true },
      { name: 'time', label: 'Jam pengerjaan', required: true },
      { name: 'staff', label: 'Petugas', required: true },
      {
        name: 'status',
        label: 'Status',
        kind: 'select',
        options: ['Terjadwal', 'Berlangsung', 'Selesai'],
        required: true,
      },
    ],
  },
};
export function isResource(value: string): value is Resource {
  return Object.hasOwn(resources, value);
}
export const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
export const valueText = (value: unknown) =>
  Array.isArray(value)
    ? value.join(' & ')
    : typeof value === 'boolean'
      ? value
        ? 'Aktif'
        : 'Nonaktif'
      : String(value ?? '');
export const tone = (status: string) =>
  status === 'Selesai' || status === 'Tersedia' || status === 'Siaga & Tersedia'
    ? 'green'
    : status === 'Sedang Dikerjakan' ||
        status === 'Berlangsung' ||
        status === 'Bertugas' ||
        status === 'Sedang Bekerja'
      ? 'blue'
      : 'amber';
export const shiftOf = (time: string) => {
  const hour = Number(time.match(/^\d{1,2}/)?.[0] ?? 8);
  return hour < 12 ? 'Shift Pagi' : hour < 16 ? 'Shift Siang' : 'Shift Sore';
};
