'use client';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import {
  buttonVariants,
  type ButtonSize,
  type ButtonVariant,
} from './buttonVariants';

export function Button({
  variant = 'primary',
  size = 'md',
  pendingLabel,
  className,
  disabled,
  children,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  const isPending = pendingLabel !== undefined && pending;
  return (
    <button
      type={type}
      disabled={disabled || isPending}
      className={cn(
        buttonVariants({ variant, size }),
        'disabled:opacity-45',
        className,
      )}
      {...props}
    >
      {isPending ? pendingLabel : children}
    </button>
  );
}
