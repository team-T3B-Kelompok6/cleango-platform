'use client';
import Link from 'next/link';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="state-panel" role="alert">
      <h1>Data belum bisa dimuat</h1>
      <p>
        Layanan data sedang tidak tersedia. Coba lagi atau hubungi tim
        operasional.
      </p>
      <button className="button primary" onClick={reset}>
        Coba lagi
      </button>{' '}
      <Link className="button" href="/login">
        Kembali ke login
      </Link>
    </section>
  );
}
