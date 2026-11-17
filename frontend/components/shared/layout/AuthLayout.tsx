import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/shared/ui/BrandLogo';

const COPYRIGHT = '© 2026 CleanGo';

export function AuthLayout({
  headerAction,
  children,
}: {
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="block min-h-dvh max-w-none bg-canvas p-0">
      <header className="relative z-[2] flex h-[74px] items-center justify-between border-b border-line-soft bg-surface px-[clamp(20px,5vw,64px)] max-sm:h-[65px]">
        <BrandLogo withWordmark />
        {headerAction}
      </header>
      <div className="flex min-h-[calc(100dvh-74px)] flex-col items-center justify-center gap-20 px-20 py-24 max-sm:min-h-[calc(100dvh-65px)] max-sm:px-16">
        {children}
        <small className="m-0 text-center text-base text-ink-muted">
          {COPYRIGHT}
        </small>
      </div>
    </main>
  );
}
