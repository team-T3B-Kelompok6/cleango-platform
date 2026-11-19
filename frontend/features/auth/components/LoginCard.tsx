import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Card } from '@/components/ui/Card';
import { LOGIN_COPY } from '../data/authConstants';

/** Kartu pembungkus halaman login: logo, judul, dan deskripsi. */
export function LoginCard({ children }: { children: ReactNode }) {
  return (
    <Card className="w-[min(100%,440px)]" aria-labelledby="login-title">
      <div className="flex flex-col items-center text-center">
        <BrandLogo className="mb-16" size={52} />
        <h1
          id="login-title"
          className="m-0 font-display text-[26px] leading-[1.35] font-extrabold tracking-[-0.02em] text-ink"
        >
          {LOGIN_COPY.title}
        </h1>
        <p className="m-0 max-w-[335px] text-base leading-[1.6] text-ink-muted">
          {LOGIN_COPY.description}
        </p>
      </div>
      {children}
    </Card>
  );
}
