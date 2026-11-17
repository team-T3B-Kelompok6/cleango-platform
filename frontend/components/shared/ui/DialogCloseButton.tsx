import { UiIcon } from '@/components/shared/ui/UiIcon';
import { cn } from '@/lib/cn';

export function DialogCloseButton({
  onClose,
  className,
  label = 'Tutup dialog',
}: {
  onClose: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClose}
      className={cn(
        'close-button grid size-[34px] shrink-0 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-tint hover:text-ink-soft',
        className,
      )}
    >
      <UiIcon name="close" />
    </button>
  );
}
