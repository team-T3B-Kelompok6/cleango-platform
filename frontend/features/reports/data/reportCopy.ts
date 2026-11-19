export const REPORT_COPY = {
  title: 'Laporan Keuangan & Operasional',
  description:
    'Pantau ringkasan pendapatan, pelanggan, dan riwayat transaksi order.',
  period: {
    title: 'Pilih Periode Laporan',
    subtitle: 'Ringkasan dan unduhan mengikuti periode terpilih.',
    label: 'Bulan laporan',
    apply: 'Terapkan',
    all: 'Semua periode',
  },
  chart: {
    title: 'Tren Pendapatan Mingguan',
    captionMonth: 'Akumulasi pesanan selesai pada bulan terpilih',
    captionAll:
      'Akumulasi pesanan selesai dari seluruh periode, dikelompokkan menurut minggu dalam bulan',
    week: 'Minggu',
  },
  payment: {
    title: 'Ringkasan Metode Pembayaran',
    empty: 'Belum ada data metode pembayaran untuk periode ini.',
    missing: 'pesanan belum mencantumkan metode pembayaran.',
  },
  tabsLabel: 'Jenis laporan',
  download: 'Unduh Laporan CSV',
  invoice: {
    label: 'Lihat Rincian',
    title: 'Rincian Pesanan Selesai',
    open: 'Buka Pesanan',
    payment: 'Metode pembayaran: ',
    noPayment: 'Informasi pembayaran belum tersedia.',
  },
  staffNote: ' · Nilai pesanan yang ditangani, bukan gaji petugas',
  empty: {
    title: 'Belum ada transaksi selesai pada periode ini',
    description: 'Pilih periode lainnya.',
  },
} as const;

/** Kelas baris daftar laporan (dipakai baris pesanan dan baris agregat). */
export const reportRowClass =
  'flex min-w-0 flex-wrap items-center gap-18 rounded-[12px] border border-line bg-surface px-18 py-16 transition-colors hover:border-line-strong max-sm:gap-10';

export const reportRowMainClass = 'min-w-0 flex-1 max-sm:basis-full';

export const reportAmountClass =
  'text-base leading-[1.4] font-semibold whitespace-nowrap text-ink';
