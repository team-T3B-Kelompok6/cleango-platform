'use client';
import { displayId } from '@/lib/display';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { DialogBody, DialogCloseContext, Modal } from '@/components/ui';
import { StaffDetailFooter } from './StaffDetailFooter';

/** Dialog detail petugas; berpindah ke form ubah tanpa menutup dialog. */
export function StaffDetailModal({
  profile,
  editForm,
  href,
  id,
  closeHref = '/petugas',
}: {
  profile: ReactNode;
  editForm: ReactNode;
  href: string | null;
  id: string;
  closeHref?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const hasEdited = useRef(false);
  useEffect(() => {
    if (editing) hasEdited.current = true;
    if (!hasEdited.current) return;
    document
      .querySelector<HTMLElement>(
        editing
          ? 'dialog[open] input:not([type="file"])'
          : 'dialog[open] [data-staff-edit]',
      )
      ?.focus({ preventScroll: true });
  }, [editing]);
  return (
    <Modal
      title={editing ? 'Ubah Petugas' : 'Detail Petugas'}
      subtitle={'#' + displayId(id)}
      icon={editing ? 'edit' : 'person'}
      width={660}
      onClose={() => router.replace(closeHref, { scroll: false })}
    >
      {editing ? (
        <DialogCloseContext.Provider value={() => setEditing(false)}>
          {editForm}
        </DialogCloseContext.Provider>
      ) : (
        <>
          <DialogBody className="flex flex-col gap-18">{profile}</DialogBody>
          <StaffDetailFooter href={href} onEdit={() => setEditing(true)} />
        </>
      )}
    </Modal>
  );
}
