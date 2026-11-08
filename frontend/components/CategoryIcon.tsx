'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { UiIcon } from './UiIcon';

export function CategoryIcon({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <span
        className="category-tab-icon category-tab-icon-fallback"
        aria-hidden
      >
        <UiIcon name="tag" />
      </span>
    );
  }
  return (
    <Image
      className="category-tab-icon"
      src={src}
      alt=""
      width={20}
      height={20}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
