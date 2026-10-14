import Image from 'next/image';

export function CleanGoLogo({ className = '' }: { className?: string }) {
  return (
    <span className={'cleango-logo ' + className}>
      <Image
        src="/branding/cleango-logo-source.png"
        alt="Logo CleanGo"
        width={362}
        height={417}
        unoptimized
      />
    </span>
  );
}
