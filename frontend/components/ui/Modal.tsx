'use client';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { UiIcon, type UiIconName } from '@/components/ui/UiIcon';
import { DialogCloseContext } from '@/components/ui/DialogContext';
import { DialogHeader } from './DialogHeader';
import { cn } from '@/lib/cn';

/**
 * Warna kotak ikon judul dialog. `danger` memakai `!` karena `.modal
 * .modal-heading-icon` legacy (belum dimigrasi) menang atas utility.
 */
const iconToneClass: Record<'success' | 'danger', string> = {
  success: 'bg-surface-tint text-success',
  danger: 'bg-danger-soft! text-danger!',
};

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  width,
  className = '',
  icon,
  iconTone = 'success',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  /** Lebar dialog dalam px; menimpa token `--dialog-width`. */
  width?: number;
  className?: string;
  icon?: UiIconName;
  iconTone?: 'success' | 'danger';
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const finished = useRef(false);

  function finishClose() {
    if (finished.current) return;
    finished.current = true;
    onClose();
  }

  function requestClose() {
    if (closing || finished.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      finishClose();
    else setClosing(true);
  }

  useEffect(() => {
    if (!closing) return;
    // Also finish if the transition is interrupted, such as in a background tab.
    const timer = window.setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      onClose();
    }, 260);
    return () => window.clearTimeout(timer);
  }, [closing, onClose]);

  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = old;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={cn(
        'modal m-auto h-fit w-[min(var(--dialog-width,560px),calc(100vw-32px))]',
        'max-h-[calc(100dvh-48px)] border border-line-dialog bg-surface p-0 text-ink shadow-dialog',
        'rounded-dialog opacity-0 translate-y-6',
        'transition-[opacity,transform] duration-200 ease-cleango',
        'starting:opacity-0 starting:translate-y-6 open:translate-y-0 open:opacity-100',
        'data-[closing=true]:pointer-events-none data-[closing=true]:opacity-0 data-[closing=true]:translate-y-6',
        'backdrop:bg-overlay backdrop:backdrop-blur-[2px] data-[closing=true]:backdrop:bg-transparent',
        wide && 'wide',
        className,
      )}
      data-closing={closing || undefined}
      style={
        width
          ? ({ '--dialog-width': `${width}px` } as CSSProperties)
          : undefined
      }
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onTransitionEnd={(event) => {
        if (
          closing &&
          event.target === event.currentTarget &&
          event.propertyName === 'transform'
        )
          finishClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <DialogHeader
        title={title}
        subtitle={subtitle}
        titleId={titleId}
        onClose={requestClose}
        icon={
          icon && (
            <span
              className={cn(
                'modal-heading-icon grid size-[36px] shrink-0 place-items-center rounded-md',
                iconToneClass[iconTone],
              )}
            >
              <UiIcon name={icon} />
            </span>
          )
        }
      />
      <DialogCloseContext.Provider value={requestClose}>
        {children}
      </DialogCloseContext.Provider>
    </dialog>
  );
}
