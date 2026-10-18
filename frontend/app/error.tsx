'use client';
import Link from 'next/link';
import { useTransition } from 'react';
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <section className="state-panel" role="alert">
      <h1>Data belum bisa dimuat</h1>
      <p>
        Layanan data sedang tidak tersedia. Coba lagi atau hubungi tim
        operasional.
      </p>
      <button
        className="button primary"
        disabled={pending}
        onClick={() => startTransition(retry)}
      >
        {pending ? 'Memuat…' : 'Coba lagi'}
      </button>{' '}
      <Link className="button" href="/login">
        Kembali ke login
      </Link>
    </section>
  );
}
