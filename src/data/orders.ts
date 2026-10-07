export type OrderStatus =
  "Menunggu Assign" | "Sedang Dikerjakan" | "Selesai" | "Menunggu Lokasi";
export interface Order {
  id: string;
  customer: string;
  address: string;
  service: string;
  price: number;
  date: string;
  time: string;
  staff: string[];
  status: OrderStatus;
  emoji: string;
  notes: string;
}

export const demoDate = "2026-09-18";
export const staffMembers = [
  "Dimaz Prasetyo",
  "Siti Aisyah",
  "Budi Santoso",
  "Rizky Ramadhan",
  "Dewi Lestari",
];
export const initialOrders: Order[] = [
  {
    id: "CL-8923",
    customer: "Bpk. Hendra Gunawan",
    address: "Cluster Anggrek 2 No. 15, Jakarta",
    service: "Deep Cleaning & Sedot Tungau",
    price: 350000,
    date: demoDate,
    time: "13.30 WIB",
    staff: [],
    status: "Menunggu Assign",
    emoji: "🏢",
    notes:
      "Hubungi pelanggan saat tiba di gerbang. Fokus pada ruang keluarga dan kasur.",
  },
  {
    id: "CL-8919",
    customer: "PT Megah Cipta (Ibu Rina)",
    address: "Ruko Grand Melati Blok C4, Bekasi",
    service: "Pembersihan Kantor (Office Daily)",
    price: 450000,
    date: demoDate,
    time: "11.00–14.00 WIB",
    staff: ["Dimaz Prasetyo", "Siti Aisyah"],
    status: "Sedang Dikerjakan",
    emoji: "🏠",
    notes: "Pembersihan lantai 1 dan 2. Gunakan cairan ramah lingkungan.",
  },
  {
    id: "CL-8918",
    customer: "Ibu Maya Kartika",
    address: "Apartemen Sudirman Tower A Unit 12B",
    service: "Bersih Kilat 2 Jam",
    price: 180000,
    date: demoDate,
    time: "09.00–11.30 WIB",
    staff: ["Budi Santoso"],
    status: "Selesai",
    emoji: "🏡",
    notes: "Checklist kebersihan sudah diperiksa bersama pelanggan.",
  },
  {
    id: "CL-8915",
    customer: "Nadia Putri",
    address: "Cipete, Jakarta Selatan",
    service: "Sanitasi Alergi",
    price: 250000,
    date: demoDate,
    time: "15.00 WIB",
    staff: ["Siti Aisyah"],
    status: "Menunggu Lokasi",
    emoji: "🏡",
    notes: "Menunggu konfirmasi titik lokasi dari pelanggan.",
  },
];

export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
export const statusTone = (status: OrderStatus) =>
  status === "Selesai"
    ? "green"
    : status === "Sedang Dikerjakan"
      ? "blue"
      : "amber";
