'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { UiIcon } from './UiIcon';

export function ServiceIcon({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <span className="service-saved-icon" title="Ikon layanan di aplikasi">
      {failed ? (
        <UiIcon name="image" />
      ) : (
        <Image
          src={src}
          alt={'Ikon ' + name}
          width={40}
          height={40}
          unoptimized
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
