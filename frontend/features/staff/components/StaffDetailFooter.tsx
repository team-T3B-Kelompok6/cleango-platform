'use client';
import {
  Button,
  DialogFooter,
  UiIcon,
  buttonVariants,
  useDialogClose,
} from '@/components/ui';

/** Footer dialog detail petugas: tutup, WhatsApp, dan ubah. */
export function StaffDetailFooter({
  href,
  onEdit,
}: {
  href: string | null;
  onEdit: () => void;
}) {
  const close = useDialogClose();
  return (
    <DialogFooter className="items-center gap-10 bg-surface-soft px-20 py-16">
      <Button
        variant="ghost"
        className="mr-auto border-transparent bg-transparent"
        onClick={() => close?.()}
      >
        Tutup
      </Button>
      {href ? (
        <a
          className={buttonVariants({
            variant: 'ghost',
            className:
              'border-line-strong bg-accent-soft text-accent hover:bg-accent-soft',
          })}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <UiIcon name="chat" /> Hubungi WhatsApp
        </a>
      ) : (
        <Button
          variant="ghost"
          className="border-line-strong bg-accent-soft text-accent"
          disabled
          title="WhatsApp belum terhubung untuk kontak ini"
        >
          <UiIcon name="chat" /> Hubungi WhatsApp
        </Button>
      )}
      <Button onClick={onEdit} data-staff-edit>
        <UiIcon name="edit" /> Ubah Petugas
      </Button>
    </DialogFooter>
  );
}
