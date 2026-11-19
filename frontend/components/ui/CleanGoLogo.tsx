import Image from 'next/image';
import { cn } from '@/lib/cn';

export function CleanGoLogo({
  className = '',
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn(
        'relative inline-block shrink-0 overflow-hidden rounded-[12%] bg-brand-mark',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/branding/cleango-logo-source.png"
        alt="Logo CleanGo"
        width={362}
        height={417}
        unoptimized
        className="absolute top-[-29.434%] left-[-21.132%] h-auto w-[136.604%] max-w-none"
      />
    </span>
  );
}
