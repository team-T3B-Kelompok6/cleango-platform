import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="starter-card">
        <h1>Halaman tidak ditemukan</h1>
        <Link href="/">Kembali ke beranda</Link>
      </section>
    </main>
  );
}

