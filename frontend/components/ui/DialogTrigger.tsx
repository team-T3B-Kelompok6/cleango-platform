'use client';
import { useState, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { UiIcon, type UiIconName } from '@/components/ui/UiIcon';
import { useDialogClose } from '@/components/ui/DialogContext';
export { useDialogClose } from '@/components/ui/DialogContext';
export function DialogCloseAction() {
  const close = useDialogClose();
  return (
    <Button variant="ghost" type="button" onClick={() => close?.()}>
      Tutup
    </Button>
  );
}
export function DialogTrigger({
  label,
  title,
  subtitle,
  children,
  wide = false,
  className = 'button',
  dialogClass = '',
  dialogWidth,
  icon,
  dialogIcon,
  ariaLabel,
}: {
  label: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
  /** Lebar dialog dalam px; menimpa token `--dialog-width`. */
  dialogWidth?: number;
  className?: string;
  dialogClass?: string;
  icon?: UiIconName;
  dialogIcon?: UiIconName;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className={className}
        aria-label={ariaLabel}
        type="button"
        onClick={() => setOpen(true)}
      >
        {icon && <UiIcon name={icon} />}
        {label}
      </button>
      {open && (
        <Modal
          title={title}
          subtitle={subtitle}
          wide={wide}
          width={dialogWidth}
          className={dialogClass}
          icon={dialogIcon ?? icon}
          onClose={() => setOpen(false)}
        >
          {children}
        </Modal>
      )}
    </>
  );
}
