import type { ChatSource } from './groq-chat.js';
import { chatSearchText } from './chatbot-text.js';

export function chatCapabilities(databaseEnabled = false): string {
  return `Saya Boo, Customer Service AI CleanGo, bukan petugas manusia. Saya dapat membantu:
• Mengenal CleanGo dan cara menggunakan aplikasi.
• Menjelaskan langkah memilih layanan, booking, alamat, checkout, dan pembayaran.
• Menjelaskan arti status pesanan, tracking cleaner, ETA kedatangan, dan estimasi selesai cleaning.
• Membantu menelusuri kendala aplikasi, menanggapi keluhan layanan, dan memberi panduan saat cleaner terlambat atau lokasi belum diperbarui.
• Menjelaskan batas informasi pembatalan, perubahan jadwal, ulasan, dan pemesanan ulang.
${databaseEnabled ? 'Saya juga dapat membaca katalog, harga, FAQ, dan promo terbaru yang tersedia di server. Pengecekan status serta pembayaran pesanan memerlukan akun pelanggan yang terhubung ke server dan hanya untuk pesanan milik Anda. Lokasi langsung cleaner belum dibaca melalui chat.' : 'Saat ini koneksi data chatbot masih pending: saya belum dapat memastikan harga/promo terkini atau membaca pesanan pribadi.'} Saya tidak membuat, mengubah, membatalkan, membayar pesanan, maupun menghubungi admin untuk Anda. Gunakan fitur aplikasi atau Pusat Bantuan untuk tindakan tersebut. Saya menerima pesan teks saja.`;
}

export const pendingOrderReply =
  'Pengecekan pesanan pribadi melalui Boo masih menunggu integrasi database dan akun pelanggan. Saya belum dapat membaca status, jadwal, pembayaran, atau lokasi cleaner Anda. Periksa halaman Pesanan/Status Pesanan di aplikasi atau Pusat Bantuan. Saya tetap bisa menjelaskan arti status dan alur layanannya.';
export const noActionReply =
  'Saya bisa bantu menjelaskan caranya. Untuk membuat, mengubah, membatalkan, menjadwalkan ulang, atau membayar pesanan, menerapkan promo, dan menghubungi admin, gunakan fitur di aplikasi atau Pusat Bantuan, ya. Boo tidak dapat menjalankan tindakan itu melalui chat. Tidak ada pesanan atau pembayaran yang saya ubah.';
export const offTopicReply =
  'Maaf, saya belum bisa membantu pertanyaan di luar seputar CleanGo. Saya bisa membantu informasi layanan, cara booking, pembayaran, promo, tracking, atau keluhan layanan CleanGo. Mau dibantu yang mana, ya?';

const policyTopics: Record<string, RegExp> = {
  pembatalan: /\b(?:batal|batalkan|membatalkan|pembatalan|cancel)\b/i,
  refund: /\b(?:refund|pengembalian)\b/i,
  'perubahan jadwal':
    /\b(?:reschedule|jadwal ulang|ubah jadwal|ganti jadwal|perubahan jadwal|penjadwalan ulang)\b/i,
  garansi: /\b(?:garansi|jaminan)\b/i,
};

export function policyTopicsFor(
  question: string,
  includeGeneral = true,
): string[] {
  const text = chatSearchText(question);
  const matched = Object.entries(policyTopics)
    .filter(([, pattern]) => pattern.test(text))
    .map(([topic]) => topic);
  return matched.length ||
    !includeGeneral ||
    !/\b(?:kebijakan|ketentuan)\b/i.test(text)
    ? matched
    : Object.keys(policyTopics);
}

// Public product guidance from PRD_CleanGo.md and Konsep_Fitur_Smart_CleanGo, not live business data.
const knowledge: (ChatSource & { matches: RegExp })[] = [
  {
    id: 'knowledge:cleango',
    title: 'Tentang CleanGo',
    matches:
      /apa (?:itu )?cleango|cleango (?:itu )?(?:apa|apaan)|jelaskan.*cleango|tentang cleango|tujuan|manfaat|kelebihan|kenapa.*cleango|^cleango[?! .]*$/i,
    text: 'CleanGo adalah proyek platform pemesanan jasa kebersihan dengan aplikasi pelanggan dan dashboard admin. Fokusnya memberikan kejelasan status layanan, kedatangan cleaner, dan tindak lanjut bila ada keterlambatan. Wilayah awal dalam konsep produk adalah Kota Malang; ketersediaan alamat dan layanan saat ini perlu dikonfirmasi di aplikasi/admin.',
  },
  {
    id: 'knowledge:team',
    title: 'Tim proyek CleanGo',
    matches:
      /pembuat|pendiri|founder|dikembangkan|dibuat|didirikan|tim pengembang|siapa.*cleango/i,
    text: 'Menurut identitas PRD, CleanGo merupakan proyek Kelompok 6 kelas T3B, Program Studi D3 Teknologi Informasi, Fakultas Vokasi, Universitas Brawijaya. Ini informasi tim proyek, bukan klaim pendiri badan usaha atau kepemilikan perusahaan komersial.',
  },
  {
    id: 'knowledge:region',
    title: 'Wilayah layanan',
    matches:
      /wilayah|kota|malang|surabaya|jakarta|luar daerah|jangkauan|cakupan daerah|lokasi.*(?:mana|layanan)|melayani.*(?:mana|daerah)/i,
    text: 'Wilayah layanan awal yang dirancang adalah Kota Malang, Jawa Timur. Boo belum dapat mengecek jangkauan alamat, kecamatan, slot, atau ketersediaan cleaner secara langsung. Konfirmasi alamat melalui aplikasi atau admin sebelum memesan; layanan di luar Malang belum dapat dipastikan.',
  },
  {
    id: 'knowledge:account',
    title: 'Akun, login, dan pendaftaran',
    matches:
      /akun|login|log in|masuk|daftar|registrasi|register|lupa password|lupa kata sandi|ubah password|ubah kata sandi/i,
    text: 'Gunakan halaman Masuk atau Daftar di aplikasi CleanGo dan isi form sesuai petunjuk. Untuk mengubah data diri atau kata sandi, gunakan menu Profil yang tersedia. Jika lupa kata sandi atau gagal masuk, periksa koneksi dan data yang dimasukkan lalu buka Pusat Bantuan jika kendala berlanjut. Boo tidak membuat akun, mereset kata sandi, atau membuka akun lewat chat. Jangan kirim password, OTP, PIN, maupun token. Sesi login demo lokal tidak otomatis memberi akses ke pesanan server.',
  },
  {
    id: 'knowledge:booking',
    title: 'Cara booking',
    matches:
      /booking|memesan|pemesanan|pesen|pesan layanan|pesan jasa|order baru|pesan.*(?:gimana|bagaimana|cara)|cara.*pesan/i,
    text: 'Untuk booking di aplikasi, ikuti langkah berikut, ya:\n• Pilih layanan dan baca detailnya.\n• Tentukan tanggal/jam dan pilih alamat pembersihan. Tambahkan catatan bila perlu.\n• Lanjut ke checkout, periksa ringkasan, lalu pilih metode pembayaran yang tersedia.\n• Ikuti instruksi aplikasi dan pantau hasilnya di Pesanan/Status Pesanan. Booking tetap dilakukan melalui aplikasi, bukan chat Boo.',
  },
  {
    id: 'knowledge:checkout',
    title: 'Memeriksa checkout dan konfirmasi pesanan',
    matches:
      /checkout|ringkasan (?:pesanan|booking|pembayaran)|konfirmasi pemesanan|sebelum (?:bayar|membayar)/i,
    text: 'Sebelum melanjutkan checkout, periksa layanan, alamat yang dipilih, tanggal/jam, dan rincian harga di layar. Jika ada yang salah, kembali ke bagian terkait untuk memperbaikinya. Gunakan hanya metode dan promo yang tersedia pada aplikasi. Setelah mengirim pesanan atau pembayaran, periksa hasilnya di Pesanan sebelum mengulang saat koneksi terputus agar tidak memesan dua kali. Boo tidak mengonfirmasi pembayaran atau membuat booking melalui chat.',
  },
  {
    id: 'knowledge:schedule',
    title: 'Memilih jadwal dan ketersediaan',
    matches:
      /pilih (?:tanggal|jam|jadwal)|memilih (?:tanggal|jam|jadwal)|jadwal (?:tersedia|penuh)|slot|tanggal (?:penuh|tersedia)|pesan (?:hari ini|besok)|booking (?:hari ini|besok)/i,
    text: 'Pilih tanggal dan jam pada halaman Booking sesuai pilihan yang tersedia. Jika slot tidak tersedia atau pesanan ditolak saat konfirmasi, pilih jadwal lain dan periksa kembali ringkasan sebelum melanjutkan. Ketersediaan dapat berubah; Boo belum membaca kapasitas slot atau menjamin cleaner tersedia lewat chat. Jadwal, harga, dan ketersediaan harus diperiksa ulang ketika memesan lagi.',
  },
  {
    id: 'knowledge:chat-input',
    title: 'Mengirim pesan kepada Boo',
    matches:
      /kirim (?:foto|gambar|suara|pesan)|upload (?:foto|gambar)|kamera|mikrofon|voice|pesan suara|chat (?:gambar|foto)/i,
    text: 'Boo saat ini menerima pertanyaan teks. Foto, gambar, dan pesan suara belum dianalisis melalui chat. Jelaskan kendala dengan teks tanpa data pribadi. Untuk foto ulasan atau bukti layanan, gunakan fitur unggah yang tersedia pada halaman terkait, bukan chat Boo. Tidak perlu mengirim foto identitas, kartu, atau bukti pembayaran sensitif.',
  },
  {
    id: 'knowledge:address',
    title: 'Alamat dan catatan',
    matches:
      /alamat|catatan|lokasi pembersihan|titik tujuan|pin (?:peta|lokasi)/i,
    text: 'Pada alur booking pilih alamat pembersihan yang benar dan periksa kembali di checkout, termasuk titik lokasi serta petunjuk tambahan jika diperlukan. Boo tidak menambah, mengganti, atau mengirim alamat ke cleaner. Gunakan pengelolaan alamat di aplikasi; tidak perlu menuliskan alamat lengkap atau nomor telepon di chat Boo.',
  },
  {
    id: 'knowledge:service',
    title: 'Jenis dan cakupan layanan',
    matches:
      /layanan|cleaning|bersih|cuci|sofa|kasur|rumah|kantor|kos|kost|setrika|ironing|fogging|karpet|motor|mobil|\bac\b|luas|ukuran|\bbrp\s*x|berapa\s*x|m²|\bm2\b/i,
    text: 'Konsep CleanGo mencakup layanan kebersihan rumah, kamar/kos, sofa, kasur, dan sejenisnya. Daftar aktif, detail pekerjaan, luas maksimal, jumlah petugas, alat, bahan, serta durasi setiap layanan harus mengikuti detail katalog dan konfirmasi admin. Data katalog chatbot masih pending. Deep Cleaning tidak boleh disamakan dengan Basic/Home Cleaning; perbedaan paket resmi belum dapat dipastikan tanpa detailnya. Nama layanan baru seperti cuci motor tidak otomatis berarti tersedia.',
  },
  {
    id: 'knowledge:price',
    title: 'Harga dan total biaya',
    matches:
      /harga|biaya|tarif|ongkos|berapa.*(?:bayar|rupiah)|brp.*harga|estimasi harga|total|mahal|murah/i,
    text: 'Harga terbaru di Boo masih menunggu integrasi katalog. Untuk sementara, Anda bisa cek harga pada detail layanan dan rincian checkout, termasuk biaya tambahan bila ada, ya. Harga final atau penawaran berdasarkan luas rumah belum bisa saya pastikan lewat chat. Untuk kebutuhan khusus, silakan konfirmasi kepada admin.',
  },
  {
    id: 'knowledge:promo',
    title: 'Promo dan voucher',
    matches: /promo|diskon|voucher|kupon|potongan/i,
    text: 'Data promo aktif beserta kode, kuota, masa berlaku, dan syaratnya belum terhubung ke Boo. Saya belum dapat memastikan ada atau tidaknya promo. Coba periksa promo di checkout dan validasi kodenya di sana, ya. Kode yang disebut dalam chat belum otomatis diterapkan atau dijamin berlaku.',
  },
  {
    id: 'knowledge:payment',
    title: 'Panduan pembayaran',
    matches:
      /bayar|membayar|pembayaran|payment|qris|dana|gopay|tunai|transfer|debit|kredit/i,
    text: 'Pilih metode pembayaran yang ditampilkan pada checkout dan ikuti instruksi aplikasi. Panduan umum ini tidak memastikan metode mana yang saat ini aktif. Untuk konfirmasi pembayaran pesanan, gunakan data pesanan server yang terhubung dengan akun Anda; Boo tidak membayar untuk Anda. Jangan kirim PIN, OTP, password, data kartu, atau bukti pembayaran sensitif ke chat.',
  },
  {
    id: 'knowledge:policy',
    title: 'Pembatalan, ubah jadwal, refund, dan garansi',
    matches:
      /batal|batalkan|membatalkan|pembatalan|cancel|reschedule|jadwal ulang|ubah jadwal|ganti jadwal|perubahan jadwal|penjadwalan ulang|refund|pengembalian|garansi|jaminan|kebijakan|ketentuan/i,
    text: 'Ketentuan resmi pembatalan, perubahan jadwal, refund, garansi, tenggat, dan biayanya belum dipastikan di sumber Boo. Silakan konfirmasi melalui Pusat Bantuan agar admin dapat memeriksa ketentuan yang berlaku untuk kebutuhan Anda, ya. Saya belum bisa memastikan persetujuan atau pengembalian uang melalui chat.',
  },
  {
    id: 'knowledge:status',
    title: 'Arti tahapan layanan',
    matches:
      /arti.*status|maksud.*status|status.*apa saja|cara.*(?:cek|lihat|melihat).*status|tahap|dikonfirmasi|ditugaskan|berangkat|dalam perjalanan|dikerjakan|selesai|menunggu pembayaran/i,
    text: 'Alur utama yang dirancang adalah Dikonfirmasi, Berangkat, Dalam Perjalanan, Sedang Dikerjakan, lalu Selesai. Dikonfirmasi berarti pesanan diterima; Berangkat/Dalam Perjalanan berarti cleaner menuju lokasi; Sedang Dikerjakan berarti pembersihan berlangsung; Selesai berarti pekerjaan dinyatakan selesai. Penugasan dan pembayaran dapat memiliki status tambahan. Penjelasan ini bukan pengecekan keadaan pesanan Anda.',
  },
  {
    id: 'knowledge:tracking',
    title: 'Cleaner dan tracking',
    matches:
      /tracking|lacak|gps|peta|map|posisi|koordinat|lokasi cleaner|lokasi petugas|link|tautan|whatsapp|\bwa\b/i,
    text: 'Dalam konsep CleanGo, admin menugaskan cleaner internal, membuat tautan unik pesanan, lalu mengirimkannya melalui WhatsApp. Cleaner membuka tautan dan mengizinkan lokasi pada perangkatnya. GPS memberikan posisi, bukan AI. Tracking memerlukan lokasi nyata, izin, dan koneksi yang memadai. Boo tidak membaca lokasi langsung dan tidak membuat/membagikan tautan akses cleaner.',
  },
  {
    id: 'knowledge:ai',
    title: 'Boo dan penggunaan AI di CleanGo',
    matches: /\bai\b|llm|rag|generative ai|kamu.*(?:robot|manusia)/i,
    text: 'Boo adalah Customer Service AI, bukan manusia. Boo memakai LLM melalui Groq dengan sumber pengetahuan dan data resmi CleanGo yang dipilih server. Pencarian sumber saat ini berbasis kata kunci, bukan vector database. Estimasi perjalanan menggunakan hasil routing OSRM, estimasi selesai menggunakan waktu mulai ditambah durasi layanan, dan risiko keterlambatan menggunakan aturan jadwal, bukan machine learning. GPS memberikan posisi, bukan AI. Boo tidak memiliki akses bebas untuk mengubah database atau melakukan transaksi.',
  },
  {
    id: 'knowledge:eta',
    title: 'ETA kedatangan dan estimasi selesai',
    matches:
      /\beta\b|estimasi|durasi|berapa lama|jam berapa|waktu tiba|waktu selesai|prediksi|machine learning/i,
    text: 'ETA kedatangan adalah perkiraan sisa waktu cleaner menuju alamat pembersihan dari perhitungan rute OSRM. Estimasi selesai berbeda: waktu mulai pengerjaan yang tercatat ditambah durasi layanan/SOP. Keduanya memakai algoritma biasa, bukan model machine learning, dan bukan jaminan waktu tiba atau selesai. OSRM yang dipakai tidak memberi data kemacetan atau hujan langsung. Estimasi tidak otomatis mengubah status menjadi selesai. Boo belum mengambil estimasi langsung pesanan tertentu melalui chat.',
  },
  {
    id: 'knowledge:delay',
    title: 'Cleaner terlambat atau lokasi tidak diperbarui',
    matches:
      /telat|terlambat|no.?show|tidak (?:datang|hadir)|belum datang|belum sampai|berhenti|tidak bergerak|belum.*(?:diperbarui|diperbaharui)|macet|hujan|cuaca/i,
    text: 'Jika cleaner terlambat, belum hadir, atau lokasi tidak diperbarui, periksa status dan waktu pembaruan terakhir di aplikasi lalu hubungi admin melalui Pusat Bantuan. Tidak bergeraknya titik GPS belum membuktikan no-show; bisa terkait izin lokasi, sinyal, atau perangkat. Admin menindaklanjuti dan dapat mempertimbangkan pengganti sesuai kondisi. Boo tidak otomatis menghubungi atau mengganti cleaner, serta tidak mengetahui macet/cuaca nyata tanpa sumber data.',
  },
  {
    id: 'knowledge:cleaner',
    title: 'Pengelolaan cleaner',
    matches:
      /cleaner|petugas|mitra|tasker|mendaftar.*(?:kerja|cleaner)|jadi.*cleaner/i,
    text: 'CleanGo bukan marketplace mitra terbuka. Cleaner dikelola dan ditugaskan oleh admin internal. Konsep cleaner memakai tautan tugas berbasis web, tanpa aplikasi cleaner khusus. Pemilihan petugas, penggantian, ketersediaan, dan permintaan bekerja sebagai cleaner perlu dikonfirmasi kepada admin; Boo tidak menugaskan petugas.',
  },
  {
    id: 'knowledge:notifications',
    title: 'Notifikasi status',
    matches: /notifikasi|pemberitahuan|notif|update otomatis/i,
    text: 'Notifikasi dirancang untuk memberi tahu perubahan pesanan, seperti dikonfirmasi, cleaner berangkat, dalam perjalanan, mulai dikerjakan, dan selesai. Pengiriman nyata menunggu integrasi event/backend; Boo tidak menjamin push sudah terkirim. Periksa informasi di halaman Pesan atau Pesanan dan Pusat Bantuan jika perlu.',
  },
  {
    id: 'knowledge:review',
    title: 'Ulasan dan pesan ulang',
    matches: /ulasan|rating|review|bintang|pesan ulang|reorder|pesan lagi/i,
    text: 'Alur aplikasi menyediakan ulasan/rating setelah layanan selesai dan pemesanan ulang dari riwayat. Saat memesan ulang, periksa kembali alamat, jadwal, layanan, dan rincian checkout; harga serta ketersediaan sebelumnya tidak dijamin sama. Boo tidak mengambil riwayat order atau membuat pesanan ulang melalui chat.',
  },
  {
    id: 'knowledge:safety',
    title: 'Kebutuhan khusus dan keamanan bahan',
    matches:
      /alergi|bayi|hewan|bahan kimia|pemutih|cairan|alat.*(?:sedia|bawa)|bahan.*(?:sedia|bawa)|aman untuk/i,
    text: 'Informasi bahan, alat, keamanan untuk bayi/hewan, alergi, serta kebutuhan khusus belum dipastikan di sumber Boo. Sampaikan kebutuhan pada catatan booking dan konfirmasi kepada admin sebelum layanan berlangsung. Boo tidak dapat menjamin bahan aman, hasil disinfeksi, atau kecocokan layanan tanpa informasi resminya.',
  },
  {
    id: 'knowledge:privacy',
    title: 'Privasi dan riwayat Boo',
    matches:
      /privasi|data pribadi|aman|riwayat chat|riwayat percakapan|chat.*(?:simpan|hilang)|disimpan|otp|password|kata sandi|\bpin\b|api key/i,
    text: 'Boo menerima teks. Riwayat Boo disimpan lokal melalui penyimpanan aman perangkat, maksimal enam puluh pesan, dan dipisahkan per sesi login; belum disinkronkan lintas perangkat. Pertanyaan yang diperlukan untuk jawaban AI dapat dikirim ke Groq setelah minimisasi data; jangan menulis informasi rahasia atau pribadi yang tidak dibutuhkan. Boo tidak memiliki akses bebas ke database, kamera, mikrofon, atau berkas perangkat.',
  },
  {
    id: 'knowledge:complaint',
    title: 'Penanganan keluhan layanan',
    matches:
      /komplain|keluhan|kecewa|kerusakan|rusak|kasar|tidak sopan|belum bersih|kurang bersih|masih kotor|hasil.*(?:jelek|buruk)|barang hilang/i,
    text: 'Maaf atas ketidaknyamanannya, ya. Saya Boo, CS AI CleanGo, siap membantu memahami keluhannya. Jelaskan bagian layanan yang bermasalah tanpa menyertakan alamat lengkap atau data pribadi. Untuk hasil yang belum sesuai, periksa detail cakupan layanan di pesanan dan simpan bukti untuk ditunjukkan lewat jalur bantuan resmi. Jika ada kerusakan, kehilangan, atau keselamatan terancam, hentikan aktivitas yang tidak aman dan gunakan kontak resmi di Pusat Bantuan untuk tindak lanjut petugas. Chat ini belum membuat tiket, mengirim laporan ke admin, menjanjikan ganti rugi, atau menyetujui refund. Bagian layanan mana yang bermasalah?',
  },
  {
    id: 'knowledge:support',
    title: 'Bantuan dan keterbatasan',
    matches:
      /bantuan|komplain|keluhan|admin|cs\b|hubungi|masalah|kendala|error|gagal|tidak bisa|jam operasional|buka jam|kontak|nomor telepon/i,
    text: 'Untuk keluhan, kendala layanan, pembayaran, atau informasi yang belum tersedia, buka Pusat Bantuan di aplikasi dan gunakan kontak resmi yang ditampilkan di sana. Boo belum dapat mengirim pesan atau meneruskan keluhan ke admin. Jam operasional, nomor kontak, SLA, dan jaminan bisnis belum dipastikan di sumber Boo; saya tidak akan menebaknya.',
  },
];

export function knowledgeFor(question: string): ChatSource[] {
  const text = chatSearchText(question);
  return knowledge
    .map((entry) => ({
      entry,
      score:
        ([
          'knowledge:service',
          'knowledge:region',
          'knowledge:cleaner',
        ].includes(entry.id)
          ? 0.25
          : 1) *
        new Set(
          text.match(
            new RegExp(
              `(?<![\\p{L}\\p{N}])(?:${entry.matches.source})(?![\\p{L}\\p{N}])`,
              'giu',
            ),
          ) ?? [],
        ).size,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ entry: { id, title, text } }) => ({ id, title, text }));
}

export function chatSafetyReply(question: string): string | null {
  if (
    /(?:abaikan|ignore|lupakan|bypass).{0,60}(?:instruksi|aturan|instructions|prompt|safety)|(?:bocorkan|tampilkan|reveal|show|cetak|terjemahkan).{0,50}(?:system.?prompt|api.?key|secret|token)|(?:orang|pengguna|pelanggan|customer) lain/i.test(
      question,
    )
  )
    return 'Saya tidak dapat membagikan informasi internal, secret, atau data pengguna lain. Saya hanya membantu informasi CleanGo yang tersedia dan tidak mengikuti instruksi untuk melewati batas tersebut.';
  if (
    /(?:password|kata sandi|\botp\b|\bpin\b|nomor kartu|\bnik\b)\s*(?:saya|aku|anda|:|=)|\bBearer\s+\S+|\b(?:gsk_|sk-)[A-Za-z0-9_-]+|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i.test(
      question,
    )
  )
    return 'Jangan kirim password, PIN, OTP, token, NIK, atau data kartu ke chat. Boo tidak membutuhkannya. Jika rahasia sudah terlanjur dibagikan, amankan atau ganti melalui pengaturan/layanan resminya. Silakan ulangi pertanyaan tanpa informasi sensitif.';
  if (
    /^(?:(?:tolong|bantu|langsung|sekarang|please|bisa|boleh|mohon|saya|ingin|mau|kamu|boo|kak|min|admin)\s+)*(?:pesankan|pesenin|buatkan\s+(?:booking|pesanan|order)|bookingkan|batalkan|cancel|reschedule|ubah(?:kan)?\s+(?:jadwal|status|pesanan)|ganti(?:kan)?\s+(?:jadwal|cleaner|petugas)|bayarkan|terapkan\s+(?:promo|voucher)|hubungi\s+(?:admin|cleaner|cs))\b/i.test(
      question,
    )
  )
    return noActionReply;
  return null;
}
