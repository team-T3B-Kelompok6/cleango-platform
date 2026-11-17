import type { CleanerTask } from '@/types/cleaner';
import { Button, UiIcon, buttonVariants } from '@/components/shared/ui';

/** Kartu kontak pelanggan dengan aksi WhatsApp. */
export function CustomerContact({
  task,
  href,
}: {
  task: CleanerTask;
  href: string | null;
}) {
  const initials = task.customer
    .replace('[UJI] ', '')
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('');
  return (
    <div className="flex flex-wrap items-center gap-10">
      <span
        aria-hidden="true"
        className="grid size-34 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent uppercase"
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block text-base leading-[1.6] font-semibold break-words text-ink">
          {task.customer}
        </strong>
        <span className="block text-xs leading-[1.6] text-ink-muted">
          {task.customerPhone || 'Nomor belum tersedia'}
        </span>
      </div>
      {href ? (
        <a
          className={buttonVariants({
            size: 'sm',
            variant: 'ghost',
            className:
              'border-line-strong bg-accent-soft text-accent hover:bg-accent-soft',
          })}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <UiIcon name="chat" />
          WhatsApp
        </a>
      ) : (
        <Button size="sm" variant="ghost" disabled>
          WhatsApp belum terhubung
        </Button>
      )}
    </div>
  );
}
