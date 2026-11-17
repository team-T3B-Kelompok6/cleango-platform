'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

const sizeClass = {
  sm: 'size-28 text-xs',
  md: 'size-40 text-base',
  lg: 'size-72 text-2xl',
};

/** Foto bulat petugas dengan monogram sebagai cadangan. */
export function StaffAvatar({
  name,
  src,
  size = 'md',
  className = '',
}: {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || 'PT';
  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-accent-soft font-semibold text-accent',
        sizeClass[size],
        className,
      )}
    >
      {src && !failed ? (
        <Image
          src={src}
          alt={'Foto ' + name}
          width={80}
          height={80}
          unoptimized
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
