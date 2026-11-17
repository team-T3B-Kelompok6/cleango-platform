'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { UiIcon } from '@/components/shared/ui';

/** Ikon kategori untuk tab/filter; jatuh ke ikon tag bila kosong/gagal. */
export function CategoryIcon({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <span
        className="mr-8 inline-flex size-20 items-center justify-center text-ink-muted"
        aria-hidden
      >
        <UiIcon name="tag" />
      </span>
    );
  }
  return (
    <Image
      className="mr-8 size-20 object-contain align-middle"
      src={src}
      alt=""
      width={20}
      height={20}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
