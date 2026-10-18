'use client';
import { useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { UiIcon, type UiIconName } from './UiIcon';
import { useDialogClose } from './DialogContext';
export { useDialogClose } from './DialogContext';
export function DialogCloseButton() {
  const close = useDialogClose();
  return (
    <button className="button" type="button" onClick={() => close?.()}>
      Tutup
    </button>
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
  icon,
  dialogIcon,
  ariaLabel,
}: {
  label: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
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
