import { DialogNote } from '../DialogNote';

const messages = [
  'Cek kembali cairan pembersih, lap mikrofiber, dan vacuum portable sebelum berangkat. Hati-hati di jalan.',
  'Bekerja rapi dimulai dari persiapan. Pastikan perlengkapan lengkap dan baca catatan pelanggan sebelum berangkat.',
  'Perjalanan aman lebih penting daripada terburu-buru. Siapkan rute sebelum jalan dan cek pesan saat sudah berhenti.',
  'Setiap sudut yang bersih membuat rumah lebih nyaman. Kerjakan dengan teliti, satu area demi satu area.',
  'Sapa pelanggan dengan ramah dan konfirmasikan area yang perlu perhatian khusus. Komunikasi kecil membantu pekerjaan lebih lancar.',
  'Jaga kebersihan alat di setiap pergantian area. Pisahkan lap kamar mandi, dapur, dan ruang lainnya.',
  'Kalau ada kendala, kabari admin lebih awal. Kamu tidak perlu menangani semuanya sendirian.',
  'Sisakan waktu untuk memeriksa hasil akhir. Pastikan peralatan, barang pelanggan, dan area kerja kembali rapi.',
];

export function BooEncouragement({ assignmentId }: { assignmentId: string }) {
  // Task IDs identify an assignment and change on reassignment. Derive the pick
  // from that ID so modal, direct link, polling, and refresh show the same tip.
  let hash = 2166136261;
  for (let index = 0; index < assignmentId.length; index++) {
    hash = Math.imul(hash ^ assignmentId.charCodeAt(index), 16777619);
  }
  return (
    <DialogNote title="Pesan semangat dari Boo">
      <p className="cleaner-boo-message">
        {messages[(hash >>> 0) % messages.length]}
      </p>
    </DialogNote>
  );
}
