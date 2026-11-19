import { CleanGoLogo } from '@/components/ui/CleanGoLogo';

const TAGLINE = 'Layanan Kebersihan Jadi Mudah';
const WORDMARK = 'cleango';

export function BrandLogo({
  className,
  size = 40,
  withWordmark = false,
}: {
  className?: string;
  size?: number;
  withWordmark?: boolean;
}) {
  if (!withWordmark) return <CleanGoLogo className={className} size={size} />;
  return (
    <div className="flex items-center gap-[10px]">
      <CleanGoLogo size={size} />
      <span className="flex min-w-0 flex-col gap-[4px] overflow-hidden leading-none">
        <strong className="truncate font-display text-[20px] leading-[1.15] font-bold">
          {WORDMARK}
          <span className="text-accent-bright">•</span>
        </strong>
        <small className="truncate text-[11px] leading-[1.5] text-ink-faint">
          {TAGLINE}
        </small>
      </span>
    </div>
  );
}
