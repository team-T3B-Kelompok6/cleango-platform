'use client';
import { displayId } from '@/lib/display';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from './Modal';
import { DialogCloseContext, useDialogClose } from './DialogContext';
import { UiIcon } from './UiIcon';

export function StaffPhone({
  phone,
  href,
}: {
  phone: string;
  href: string | null;
}) {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copyLink() {
    if (!href) return;
    try {
      await navigator.clipboard.writeText(href);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
  }
  return (
    <div className="staff-profile-contact">
      <div className="staff-profile-phone">
        <UiIcon name="phone" />
        <span>{phone.trim() || 'Nomor belum ditambahkan'}</span>
        {href && (
          <button
            className="staff-copy-link"
            type="button"
            onClick={copyLink}
            aria-label="Salin tautan WhatsApp"
            title="Salin tautan WhatsApp"
          >
            <UiIcon name={copied === 'copied' ? 'tick' : 'copy'} />
          </button>
        )}
      </div>
      {copied !== 'idle' && (
        <small role="status">
          {copied === 'copied'
            ? 'Tautan WhatsApp disalin.'
            : 'Tautan belum bisa disalin. Gunakan tombol Hubungi WhatsApp.'}
        </small>
      )}
      {!href && (
        <small className="staff-contact-warning">
          WhatsApp belum terhubung untuk kontak ini.
        </small>
      )}
    </div>
  );
}

function DetailFooter({
  href,
  onEdit,
}: {
  href: string | null;
  onEdit: () => void;
}) {
  const close = useDialogClose();
  return (
    <div className="modal-footer staff-profile-footer">
      <button
        type="button"
        className="button staff-profile-close"
        onClick={() => close?.()}
      >
        Tutup
      </button>
      {href ? (
        <a
          className="button staff-whatsapp-action"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <UiIcon name="chat" /> Hubungi WhatsApp
        </a>
      ) : (
        <button
          type="button"
          className="button staff-whatsapp-action"
          disabled
          title="WhatsApp belum terhubung untuk kontak ini"
        >
          <UiIcon name="chat" /> Hubungi WhatsApp
        </button>
      )}
      <button type="button" className="button primary" onClick={onEdit}>
        <UiIcon name="edit" /> Ubah Petugas
      </button>
    </div>
  );
}

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
          ? '.staff-profile-dialog input'
          : '.staff-profile-dialog .staff-profile-footer .primary',
      )
      ?.focus({ preventScroll: true });
  }, [editing]);
  return (
    <Modal
      title={editing ? 'Ubah Petugas' : 'Detail Petugas'}
      subtitle={'#' + displayId(id)}
      icon={editing ? 'edit' : 'person'}
      className="staff-profile-dialog"
      onClose={() => router.replace(closeHref, { scroll: false })}
    >
      {editing ? (
        <DialogCloseContext.Provider value={() => setEditing(false)}>
          {editForm}
        </DialogCloseContext.Provider>
      ) : (
        <>
          <div className="modal-body staff-profile-body">{profile}</div>
          <DetailFooter href={href} onEdit={() => setEditing(true)} />
        </>
      )}
    </Modal>
  );
}
