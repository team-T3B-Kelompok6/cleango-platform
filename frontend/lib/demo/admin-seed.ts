import type { Customer, Order, RecordData, Staff } from '@/types';
import { sampleContact } from './contacts';

/** Fictional preview records; DEMO delivery is always simulated. */
export function adminSeed(today: string) {
  const date = (days: number) => {
    const value = new Date(today + 'T12:00:00+07:00');
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  };
  const services: RecordData[] = [
    [
      '01',
      'Deep Cleaning Rumah 2 Lantai',
      'Rumah',
      '3–4 jam',
      350000,
      299000,
      'service_deep_cleaning.jpeg',
      'Pembersihan menyeluruh kamar, dapur, kamar mandi, dan ruang keluarga.',
      [
        'Peralatan dan cairan pembersih',
        'Pembersihan kerak kamar mandi',
        'Debu dan noda dapur',
        'Garansi pembersihan ulang 24 jam',
      ],
    ],
    [
      '02',
      'Cuci Sofa & Kasur',
      'Sofa & Kasur',
      '2–3 jam',
      180000,
      null,
      'service_sofa_mattress.jpeg',
      'Ekstraksi debu dan noda pada sofa serta kasur menggunakan alat khusus.',
      ['Vakum tungau', 'Ekstraksi noda ringan', 'Pengharum kain'],
    ],
    [
      '03',
      'Pembersihan Kantor',
      'Kantor',
      '3–4 jam',
      450000,
      399000,
      'service_office.jpeg',
      'Sanitasi meja kerja, lantai, dan area bersama sebelum aktivitas kantor.',
      [
        'Pembersihan meja kerja',
        'Pel dan sanitasi lantai',
        'Pembersihan pantry',
      ],
    ],
    [
      '04',
      'Cuci & Perawatan AC',
      'AC',
      '1–2 jam',
      100000,
      null,
      'service_ac_care.jpeg',
      'Pembersihan filter, evaporator, dan pemeriksaan fungsi dasar AC.',
      ['Pembersihan filter', 'Pencucian evaporator', 'Pemeriksaan suhu'],
    ],
    [
      '05',
      'Cleaning Harian',
      'Rumah',
      '2 jam',
      150000,
      null,
      'service_daily_cleaning.jpeg',
      'Menyapu, mengepel, dan merapikan ruang yang digunakan setiap hari.',
      ['Menyapu dan mengepel', 'Merapikan permukaan meja', 'Membuang sampah'],
    ],
    [
      '06',
      'Paket Pindah Rumah',
      'Rumah',
      '4–5 jam',
      600000,
      null,
      'service_detail_hero.jpeg',
      'Pembersihan sebelum atau setelah pindah, termasuk lantai, jendela bagian dalam, dan permukaan ruangan.',
      ['Pembersihan seluruh ruangan', 'Pembersihan jendela bagian dalam'],
    ],
  ].map(
    ([
      suffix,
      name,
      category,
      duration,
      price,
      discountPrice,
      image,
      description,
      features,
    ]) => ({
      id: 'DEMO-SRV-' + suffix,
      name: '' + name,
      category,
      duration,
      price,
      discountPrice,
      imageUrl: '/demo/' + image,
      description,
      features,
      active: suffix !== '06',
      packageLabel: category,
      isFavorite: suffix === '01',
      isDemo: true,
    }),
  );
  const historical: Order[] = Array.from({ length: 12 }, (_, index) => {
    const service = services[index % 5];
    const customerIndex = index % 3;
    return {
      id: 'DEMO-HISTORY-' + String(index + 1).padStart(2, '0'),
      customerId: 'DEMO-CUS-0' + (customerIndex + 1),
      customer:
        '' +
        ['Amanda Pratama', 'Bagas Wicaksono', 'Citra Lestari'][customerIndex],
      address: [
        'Cluster Anggrek 2 Blok B No. 15, Bintaro, Tangerang Selatan',
        'Jl. Melati No. 28, Kebayoran Baru, Jakarta Selatan',
        'Ruko Permata Blok C4, Bekasi',
      ][customerIndex],
      service: String(service.name),
      serviceId: service.id,
      date: date(-[0, 1, 2, 4, 6, 8, 10, 12, 15, 21, 28, 35][index]),
      time: ['08.00–12.00 WIB', '13.00–17.00 WIB', '18.00–21.00 WIB'][
        index % 3
      ],
      price: Number(service.discountPrice ?? service.price),
      staff: [
        '' + ['Raka Saputra', 'Dina Rahma', 'Fajar Hidayat'][customerIndex],
      ],
      status: index === 10 ? 'Batal' : 'Selesai',
      notes: '',
      paymentMethod: ['QRIS', 'Transfer Bank', 'Tunai'][index % 3],
      paymentStatus: index === 10 ? 'Dibatalkan' : 'Lunas',
      invoiceId: 'INV-UJI-' + String(index + 1).padStart(3, '0'),
      isDemo: true,
    };
  });
  const extraStaff: Staff[] = [
    {
      id: 'DEMO-PT-04',
      name: '[UJI] Nabila Putri',
      phone: sampleContact('staff', 4, 'Nabila Putri').phone,
      skills: ['Cuci AC', 'Perawatan filter'],
      status: 'Masa Training',
      joined: date(-14),
      area: 'Jakarta Selatan',
      rating: 4.7,
      isDemo: true,
    },
    {
      id: 'DEMO-PT-05',
      name: '[UJI] Yoga Pradana',
      phone: sampleContact('staff', 5, 'Yoga Pradana').phone,
      skills: ['Cleaning Harian'],
      status: 'Nonaktif',
      joined: date(-180),
      area: 'Bekasi',
      rating: 4.8,
      isDemo: true,
    },
  ];
  const extraCustomers: Customer[] = [
    {
      id: 'DEMO-CUS-04',
      name: '[UJI] Nadia Kusuma',
      ...sampleContact('customer', 4, 'Nadia Kusuma'),
      address: 'Jl. Kenanga No. 12, Depok',
      joined: date(-3),
      active: true,
      notes: '',
      isDemo: true,
    },
    {
      id: 'DEMO-CUS-05',
      name: '[UJI] Toko Sinar Bersih',
      ...sampleContact('customer', 5, 'Toko Sinar Bersih'),
      address: 'Ruko Sinar Blok A3, Bekasi',
      joined: date(-60),
      active: false,
      notes: '',
      isDemo: true,
    },
  ];
  const faqSamples = [
    [
      'Layanan & Kebersihan',
      'Berapa lama pengerjaan Deep Cleaning?',
      'Umumnya 3–4 jam, bergantung luas dan kondisi ruangan. Peralatan serta cairan pembersih dibawa oleh petugas.',
    ],
    [
      'Pemesanan',
      'Bagaimana cara mengganti jadwal?',
      'Hubungi admin sebelum jadwal dimulai. Admin akan memeriksa ketersediaan petugas untuk waktu pengganti.',
    ],
    [
      'Pembayaran',
      'Metode pembayaran apa yang tersedia?',
      'Pilihan metode pembayaran ditampilkan saat checkout. Hubungi admin jika metode yang diinginkan belum tersedia.',
    ],
    [
      'Promo',
      'Bagaimana menggunakan kode promo?',
      'Masukkan kode pada checkout. Cakupan layanan, masa berlaku, dan minimum transaksi mengikuti aturan promo.',
    ],
    [
      'Layanan & Kebersihan',
      'Apakah saya harus menyediakan alat?',
      'Tidak. Petugas membawa alat untuk cakupan layanan yang dipesan. Beri tahu admin jika ada kebutuhan khusus.',
    ],
    [
      'Pemesanan',
      'Bisakah saya memilih petugas?',
      'Tulis preferensi saat memesan. Penugasan mengikuti ketersediaan kru dan jadwal.',
    ],
    [
      'Pembayaran',
      'Bagaimana meminta bukti pembayaran?',
      'Bukti transaksi tersedia setelah pembayaran terkonfirmasi. Hubungi admin jika bukti pembayaran belum diterima.',
    ],
  ];
  const faqs = faqSamples.map(([category, question, answer], index) => ({
    id: 'DEMO-FAQ-' + (index + 1),
    category,
    question: '' + question,
    answer,
    published: index !== 6,
    viewCount: [248, 162, 95, 84, 60, 31, 0][index],
    updatedAt: date(-index) + 'T03:00:00.000Z',
    isDemo: true,
  }));
  const categories = ['services', 'faqs'].flatMap((resource) =>
    [
      ...new Set(
        (resource === 'services' ? services : faqs).map(
          (item) => item.category,
        ),
      ),
    ].map((name, index) => ({
      id: 'DEMO-CAT-' + resource + '-' + index,
      name,
      resource,
      isDemo: true,
    })),
  );
  const promo = (
    id: string,
    name: string,
    code: string,
    startsOn: string,
    endsOn: string,
    active: boolean,
    scope = 'all',
  ) => ({
    id,
    name: '' + name,
    code,
    discountType: 'percentage',
    discountValue: 20,
    maxDiscount: 75000,
    minPurchase: 150000,
    scope,
    serviceIds: scope === 'all' ? [] : ['DEMO-SRV-01', 'DEMO-SRV-02'],
    startsOn,
    endsOn,
    usageLimit: 100,
    perCustomerLimit: 1,
    stackable: false,
    active,
    usedCount: 0,
    isDemo: true,
  });
  const records: Record<string, RecordData[]> = {
    services,
    faqs,
    categories,
    banners: [
      {
        id: 'DEMO-BANNER-01',
        imageUrl: '/demo/promo_banner.png',
        isDemo: true,
      },
    ],
    promos: [
      promo(
        'DEMO-PROMO-01',
        'Hemat 20%',
        'UJIHEMAT20',
        date(-3),
        date(14),
        true,
      ),
      promo(
        'DEMO-PROMO-02',
        'Rumah & Sofa',
        'UJIRUMAH20',
        date(-1),
        date(21),
        true,
        'services',
      ),
      promo(
        'DEMO-PROMO-03',
        'Promo mendatang',
        'UJIBESOK20',
        date(7),
        date(28),
        true,
      ),
      promo(
        'DEMO-PROMO-04',
        'Promo berakhir',
        'UJILAMA20',
        date(-30),
        date(-1),
        true,
      ),
    ],
    schedules: [],
  };
  return { records, historical, extraStaff, extraCustomers, date };
}
