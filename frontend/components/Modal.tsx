'use client';
import { UiIcon, type UiIconName } from './UiIcon';
import { useEffect, useRef, useId, useState, type ReactNode } from 'react';
import { DialogCloseContext } from './DialogContext';
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  className = '',
  icon,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
  icon?: UiIconName;
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
      className={`modal ${wide ? 'wide' : ''} ${className}`}
      data-closing={closing || undefined}
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
      <div className="modal-header">
        <div className="modal-heading">
          {icon && (
            <span className="modal-heading-icon">
              <UiIcon name={icon} />
            </span>
          )}
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        <button
          className="close-button"
          aria-label="Tutup dialog"
          onClick={requestClose}
        >
          <UiIcon name="close" />
        </button>
      </div>
      <DialogCloseContext.Provider value={requestClose}>
        {children}
      </DialogCloseContext.Provider>
    </dialog>
  );
}
