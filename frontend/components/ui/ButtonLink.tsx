import Link from 'next/link';
import { buttonVariants } from './buttonVariants';

/** Tautan yang tampil seperti tombol. */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: {
  href: string;
  variant?: 'primary' | 'ghost';
  size?: 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonVariants({ variant, size, className })}>
      {children}
    </Link>
  );
}
