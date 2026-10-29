import type { Field, Resource } from '@/types';
export const resources: Record<
  Resource,
  {
    path: string;
    title: string;
    singular: string;
    canCreate: boolean;
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
    canCreate: false,
    description:
      'Kelola daftar order masuk, tentukan cleaner terpilih, dan pantau progres pengerjaan.',
    tabs: [
      'Semua Pesanan',
      'Menunggu Assign',
      'Menunggu Lokasi',
      'Menuju Lokasi',
      'Sedang Dikerjakan',
      'Selesai',
      'Batal',
    ],
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
          'Menuju Lokasi',
          'Sedang Dikerjakan',
          'Selesai',
          'Batal',
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
    canCreate: true,
    description:
      'Atur daftar paket kebersihan, harga dasar layanan, estimasi durasi pengerjaan, dan status ketersediaan.',
    tabField: 'category',
    fields: [
      {
        name: 'name',
        label: 'Nama layanan',
        required: true,
        placeholder: 'Contoh: Bersih Kilat 2 Jam',
      },
      {
        name: 'category',
        label: 'Kategori',
        kind: 'select',
        required: true,
      },
      {
        name: 'duration',
        label: 'Estimasi durasi',
        required: true,
        placeholder: 'Contoh: 2–3 jam',
      },
      {
        name: 'price',
        label: 'Harga (Rp)',
        kind: 'number',
        required: true,
        placeholder: 'Contoh: 180000',
      },
      {
        name: 'active',
        label: 'Status publikasi',
        kind: 'boolean',
        hint: 'Pilih Nonaktif jika layanan belum tersedia.',
      },
      {
        name: 'description',
        label: 'Deskripsi',
        kind: 'textarea',
        required: true,
        placeholder: 'Jelaskan cakupan pekerjaan dan area yang dibersihkan.',
      },
      {
        name: 'features',
        label: 'Fasilitas layanan',
        kind: 'textarea',
        placeholder: 'Alat kebersihan\nCairan pembersih\nPetugas profesional',
        hint: 'Tulis satu fasilitas per baris. Bagian ini boleh dikosongkan.',
        lines: true,
      },
    ],
  },
  staff: {
    path: '/petugas',
    title: 'Kelola Data Petugas',
    singular: 'Petugas',
    canCreate: true,
    description:
      'Kelola keahlian, kesiapan, kontak, dan riwayat penugasan petugas.',
    tabs: [
      'Semua Petugas',
      'Siaga & Tersedia',
      'Siap Berangkat',
      'Menuju Lokasi',
      'Sedang Bekerja',
      'Bertugas',
      'Masa Training',
      'Nonaktif',
    ],
    tabField: 'operationalStatus',
    fields: [
      { name: 'name', label: 'Nama petugas', required: true },
      { name: 'phone', label: 'Nomor WhatsApp', required: true },
      {
        name: 'skills',
        label: 'Keahlian petugas',
        kind: 'multiselect',
        required: false,
        options: [],
        hint: 'Opsional, termasuk saat Masa Training. Pilih satu atau lebih layanan yang dikuasai, atau biarkan kosong.',
        emptyMessage: 'Belum ada layanan. Tambahkan layanan di Kelola Layanan.',
      },
      {
        name: 'status',
        label: 'Status',
        kind: 'select',
        options: ['Tersedia', 'Bertugas', 'Masa Training', 'Nonaktif'],
        required: true,
      },
    ],
  },
  customers: {
    path: '/customer',
    title: 'Kelola Data Customer',
    singular: 'Customer',
    canCreate: false,
    description: 'Daftar pelanggan, kontak, alamat dan status akun.',
    fields: [
      { name: 'name', label: 'Nama customer', required: true },
      { name: 'phone', label: 'Nomor WhatsApp', required: true },
      { name: 'email', label: 'Email', kind: 'email', required: true },
      {
        name: 'address',
        label: 'Alamat',
        kind: 'textarea',
        hint: 'Kosongkan lalu simpan untuk menghapus alamat pelanggan.',
      },
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
    canCreate: true,
    description:
      'Kelola daftar pertanyaan umum dan jawaban operasional Cleango.',
    tabField: 'category',
    fields: [
      {
        name: 'category',
        label: 'Kategori FAQ',
        kind: 'select',
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
    canCreate: true,
    description: 'Atur shift kerja petugas sebagai acuan penugasan pesanan.',
    tabs: ['Semua Shift', 'Shift Pagi', 'Shift Siang', 'Shift Sore'],
    tabField: 'shift',
    fields: [
      { name: 'date', label: 'Tanggal', kind: 'date', required: true },
      { name: 'time', label: 'Jam shift', required: true },
      { name: 'staff', label: 'Petugas', required: true },
      {
        name: 'status',
        label: 'Status',
        kind: 'select',
        options: ['Terjadwal', 'Berlangsung', 'Selesai', 'Nonaktif'],
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
  status === 'Batal' || status === 'Nonaktif'
    ? 'neutral'
    : status === 'Aktif' ||
        status === 'Selesai' ||
        status === 'Tersedia' ||
        status === 'Siaga & Tersedia'
      ? 'green'
      : status === 'Menunggu Lokasi' ||
          status === 'Menuju Lokasi' ||
          status === 'Sedang Dikerjakan' ||
          status === 'Berlangsung' ||
          status === 'Bertugas' ||
          status === 'Sedang Bekerja'
        ? 'blue'
        : 'amber';
export const scheduleShifts = [
  { name: 'Shift Pagi', time: '08.00–12.00 WIB' },
  { name: 'Shift Siang', time: '13.00–17.00 WIB' },
  { name: 'Shift Sore', time: '18.00–21.00 WIB' },
];
export const shiftOf = (time: string) => {
  const hour = Number(time.match(/^\d{1,2}/)?.[0] ?? 8);
  return (
    scheduleShifts.findLast(
      (shift) => hour >= Number(shift.time.slice(0, 2)),
    ) ?? scheduleShifts[0]
  ).name;
};
