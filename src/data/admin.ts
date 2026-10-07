import { demoDate } from "./orders";

export interface Service {
  id: string;
  name: string;
  category: string;
  duration: string;
  price: number;
  description: string;
  active: boolean;
  features?: string[];
}

export interface Staff {
  id: string;
  name: string;
  area: string;
  phone: string;
  status: "Tersedia" | "Bertugas" | "Nonaktif";
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  joined: string;
  active: boolean;
}

export interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
  published: boolean;
}

export interface Schedule {
  id: string;
  customer: string;
  service: string;
  date: string;
  time: string;
  staff: string;
  status: "Terjadwal" | "Berlangsung" | "Selesai";
}

export const initialServices: Service[] = [
  {
    id: "SRV-01",
    name: "Deep Cleaning Komplit Rumah / Apartemen",
    category: "Rumah",
    duration: "3–4 jam · Standar 2–3 petugas",
    price: 350000,
    description: "Paket andalan · Deep Cleaning menyeluruh untuk hunian.",
    active: true,
    features: [
      "Pembersihan Debu & Sisa Menyeluruh",
      "Pembersihan Kamar Mandi",
      "Disinfeksi Ruangan",
    ],
  },
  {
    id: "SRV-02",
    name: "Cuci & Perawatan AC",
    category: "AC",
    duration: "1–2 jam · Standar 1 petugas",
    price: 75000,
    description: "Layanan rutin untuk menjaga udara ruangan tetap segar.",
    active: true,
    features: ["Cuci Filter", "Pengecekan Freon", "Bersih"],
  },
  {
    id: "SRV-03",
    name: "Cuci Sofa & Kasur",
    category: "Sofa",
    duration: "1,5–3 jam · Standar 2 petugas",
    price: 120000,
    description: "Paket spesialis higienis untuk tekstil rumah.",
    active: true,
    features: ["Sedot Tungau", "Uap Sanitasi", "Vacuum Sofa & Karpet"],
  },
];

export const initialStaff: Staff[] = [
  {
    id: "PT-01",
    name: "Dimaz Prasetyo",
    area: "Jakarta & Bekasi",
    phone: "0812-0000-1001",
    status: "Bertugas",
  },
  {
    id: "PT-02",
    name: "Siti Aisyah",
    area: "Jakarta Selatan",
    phone: "0812-0000-1002",
    status: "Bertugas",
  },
  {
    id: "PT-03",
    name: "Budi Santoso",
    area: "Jakarta Pusat",
    phone: "0812-0000-1003",
    status: "Tersedia",
  },
  {
    id: "PT-04",
    name: "Rizky Ramadhan",
    area: "Bekasi",
    phone: "0812-0000-1004",
    status: "Tersedia",
  },
  {
    id: "PT-05",
    name: "Dewi Lestari",
    area: "Jakarta Barat",
    phone: "0812-0000-1005",
    status: "Tersedia",
  },
];

export const initialCustomers: Customer[] = [
  {
    id: "CS-01",
    name: "Bpk. Hendra Gunawan",
    phone: "0813-0000-2001",
    email: "hendra@example.com",
    address: "Cluster Anggrek 2 No. 15, Jakarta",
    joined: "2026-07-08",
    active: true,
  },
  {
    id: "CS-02",
    name: "PT Megah Cipta (Ibu Rina)",
    phone: "0813-0000-2002",
    email: "rina@example.com",
    address: "Ruko Grand Melati Blok C4, Bekasi",
    joined: "2026-06-21",
    active: true,
  },
  {
    id: "CS-03",
    name: "Ibu Maya Kartika",
    phone: "0813-0000-2003",
    email: "maya@example.com",
    address: "Apartemen Sudirman Tower A Unit 12B",
    joined: "2026-08-02",
    active: true,
  },
  {
    id: "CS-04",
    name: "Nadia Putri",
    phone: "0813-0000-2004",
    email: "nadia@example.com",
    address: "Cipete, Jakarta Selatan",
    joined: "2026-09-01",
    active: true,
  },
];

export const initialFaqs: Faq[] = [
  {
    id: "FAQ-01",
    category: "Layanan",
    question: "Berapa lama durasi pembersihan untuk Deep Cleaning rumah?",
    answer:
      "Durasi umumnya 3–4 jam, bergantung pada luas area dan kondisi awal. Tim operasional akan mengonfirmasi estimasi saat pesanan dibuat.",
    published: true,
  },
  {
    id: "FAQ-02",
    category: "Jadwal",
    question:
      "Bagaimana jika cleaner belum tiba melewati estimasi waktu (ETA)?",
    answer:
      "Hubungi tim operasional melalui detail pesanan. Admin akan memeriksa posisi kru dan memberikan pembaruan estimasi kedatangan.",
    published: true,
  },
  {
    id: "FAQ-03",
    category: "Pembayaran",
    question: "Metode pembayaran apa saja yang didukung oleh Cleango?",
    answer:
      "Pembayaran tersedia melalui QRIS, virtual account, invoice untuk pelanggan kantor, serta opsi tunai terbatas sesuai konfirmasi admin.",
    published: true,
  },
  {
    id: "FAQ-04",
    category: "SOP",
    question:
      "Apakah barang pelanggan diasuransikan selama proses pembersihan?",
    answer:
      "Petugas wajib mencatat kondisi awal dan mengikuti SOP penanganan barang. Jika terjadi kendala, laporkan melalui detail pesanan agar tim operasional dapat menindaklanjuti.",
    published: true,
  },
  {
    id: "FAQ-05",
    category: "Layanan",
    question: "Apakah petugas membawa peralatan sendiri?",
    answer:
      "Ya. Petugas membawa peralatan standar dan produk pembersih yang sesuai dengan layanan yang dipesan.",
    published: true,
  },
  {
    id: "FAQ-06",
    category: "Jadwal",
    question: "Bagaimana cara mengubah jadwal pesanan?",
    answer:
      "Hubungi tim operasional sebelum petugas berangkat. Admin akan memeriksa slot yang tersedia dan mengonfirmasi perubahan jadwal.",
    published: true,
  },
  {
    id: "FAQ-07",
    category: "SOP",
    question: "Apakah produk yang digunakan ramah lingkungan?",
    answer:
      "Cleango mengutamakan produk yang lebih aman bagi penghuni dan lingkungan sesuai SOP kebersihan hijau.",
    published: true,
  },
  {
    id: "FAQ-08",
    category: "Layanan",
    question: "Bagaimana cara memilih paket layanan yang sesuai?",
    answer:
      "Pilih paket berdasarkan jenis area dan kebutuhan pembersihan. Tim operasional dapat membantu memberikan rekomendasi setelah mengetahui kondisi lokasi.",
    published: true,
  },
  {
    id: "FAQ-09",
    category: "Pembayaran",
    question: "Kapan invoice pesanan diterbitkan?",
    answer:
      "Invoice tersedia setelah detail layanan dan harga dikonfirmasi oleh tim operasional.",
    published: true,
  },
  {
    id: "FAQ-10",
    category: "Jadwal",
    question: "Apakah tersedia layanan pada akhir pekan?",
    answer:
      "Layanan tersedia sesuai ketersediaan shift. Pilih tanggal saat membuat pesanan untuk memeriksa slot yang dapat dipesan.",
    published: true,
  },
  {
    id: "FAQ-11",
    category: "SOP",
    question: "Apa yang perlu disiapkan sebelum petugas datang?",
    answer:
      "Pastikan akses lokasi tersedia, simpan barang berharga, dan informasikan area prioritas kepada petugas saat tiba.",
    published: true,
  },
  {
    id: "FAQ-12",
    category: "Pembayaran",
    question: "Bagaimana cara menggunakan kode promo?",
    answer:
      "Masukkan kode promo yang berlaku sebelum pesanan dikonfirmasi. Potongan akan terlihat pada rincian pembayaran.",
    published: true,
  },
];
export const initialSchedules: Schedule[] = [
  {
    id: "JD-01",
    customer: "Bpk. Hendra Gunawan",
    service: "Deep Cleaning & Sedot Tungau",
    date: demoDate,
    time: "08.00–11.30 WIB",
    staff: "Budi Santoso",
    status: "Berlangsung",
  },
  {
    id: "JD-02",
    customer: "PT Megah Cipta (Ibu Rina)",
    service: "Pembersihan Kantor",
    date: demoDate,
    time: "13.00–15.30 WIB",
    staff: "Dimaz Prasetyo & Siti Aisyah",
    status: "Terjadwal",
  },
  {
    id: "JD-03",
    customer: "Ibu Maya Kartika",
    service: "Bersih Kilat 2 Jam",
    date: demoDate,
    time: "09.00–11.30 WIB",
    staff: "Budi Santoso",
    status: "Selesai",
  },
  {
    id: "JD-04",
    customer: "Bpk. Dion Pratama",
    service: "Sanitasi Alergi & Cuci Karpet",
    date: demoDate,
    time: "16.00 WIB",
    staff: "Belum ditugaskan",
    status: "Terjadwal",
  },
];

export const nextId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}`;
