import Link from 'next/link';
import { Icon } from './Icon';
import { cn } from '@/lib/cn';

/** Tautan teks dengan panah, dipakai di kanan judul seksi. */
export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex shrink-0 items-center gap-11 text-base font-bold text-success hover:underline',
        className,
      )}
    >
      {children}
      <Icon name="arrow" className="size-[14px]" />
    </Link>
  );
}
