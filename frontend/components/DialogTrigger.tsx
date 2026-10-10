'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { UiIcon, type UiIconName } from './UiIcon';
const CloseContext = createContext<(() => void) | null>(null);
export const useDialogClose = () => useContext(CloseContext);
export function DialogTrigger({
  label,
  title,
  subtitle,
  children,
  wide = false,
  className = 'button',
  dialogClass = '',
  icon,
}: {
  label: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
  className?: string;
  dialogClass?: string;
  icon?: UiIconName;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} type="button" onClick={() => setOpen(true)}>
        {icon && <UiIcon name={icon} />}
        {label}
      </button>
      {open && (
        <Modal
          title={title}
          subtitle={subtitle}
          wide={wide}
          className={dialogClass}
          onClose={() => setOpen(false)}
        >
          <CloseContext.Provider value={() => setOpen(false)}>
            {children}
          </CloseContext.Provider>
        </Modal>
      )}
    </>
  );
}
