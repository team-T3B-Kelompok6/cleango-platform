import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="state-panel">
      <h1>Data atau halaman tidak ditemukan</h1>
      <p>Alamat mungkin sudah berubah atau data telah dihapus.</p>
      <Link className="button primary" href="/">
        Kembali ke dashboard
      </Link>
    </section>
  );
}
