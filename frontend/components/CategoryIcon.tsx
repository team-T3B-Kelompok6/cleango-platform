'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export function CategoryIcon({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed ? null : (
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
