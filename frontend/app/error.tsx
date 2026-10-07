'use client';

import { useEffect } from 'react';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page-shell">
      <section className="starter-card">
        <h1>Terjadi kesalahan</h1>
        <p>Halaman belum dapat ditampilkan.</p>
        <button type="button" onClick={reset}>
          Coba lagi
        </button>
      </section>
    </main>
  );
}

