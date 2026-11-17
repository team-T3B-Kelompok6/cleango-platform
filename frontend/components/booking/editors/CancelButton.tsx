'use client';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/shared/ui';
import { useDialogClose } from '@/components/shared/ui/DialogContext';
import { cn } from '@/lib/cn';

/** Tombol batal: menutup dialog bila ada, atau menuju halaman daftar. */
export function CancelButton({ href = '/pesanan' }: { href?: string }) {
  const close = useDialogClose();
  if (close)
    return (
      <Button variant="ghost" onClick={close} className="mr-auto">
        Batal
      </Button>
    );
  return (
    <Link
      className={cn(buttonVariants({ variant: 'ghost' }), 'mr-auto')}
      href={href}
    >
      Batal
    </Link>
  );
}
