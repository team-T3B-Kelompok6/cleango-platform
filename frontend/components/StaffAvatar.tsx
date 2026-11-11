'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export function StaffAvatar({
  name,
  src,
  className = '',
}: {
  name: string;
  src?: string | null;
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
    <span className={'staff-photo ' + className}>
      {src && !failed ? (
        <Image
          src={src}
          alt={'Foto ' + name}
          width={80}
          height={80}
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
