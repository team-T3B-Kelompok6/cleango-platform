'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { resources } from '@/lib/resources';
import type { Resource } from '@/types';
import { displayId } from '@/lib/display';
import { Modal } from './Modal';
import { DialogCloseContext, useDialogClose } from './DialogContext';
import { UiIcon, type UiIconName } from './UiIcon';

const titles: Record<Resource, string> = {
  orders: 'Detail Pesanan',
  schedules: 'Detail Jadwal',
  customers: 'Detail Customer',
  faqs: 'Detail FAQ',
  services: 'Detail Layanan',
  staff: 'Detail Data Petugas',
};

function DetailFooter({
  resource,
  href,
  onEdit,
}: {
  resource: Resource;
  href?: string | null;
  onEdit: () => void;
}) {
  const close = useDialogClose();
  return (
    <div className="modal-footer detail-dialog-footer">
      {resource === 'customers' &&
        (href ? (
          <a
            className="button detail-contact-action"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <UiIcon name="chat" /> Hubungi WA
          </a>
        ) : (
          <button
            className="button detail-contact-action"
            type="button"
            disabled
            title="WhatsApp belum terhubung untuk kontak ini"
          >
            <UiIcon name="chat" />
            Hubungi WA
          </button>
        ))}
      <>
        <button className="button" type="button" onClick={() => close?.()}>
          Tutup
        </button>
        <button
          className="button primary detail-edit-button"
          type="button"
          onClick={onEdit}
        >
          <UiIcon name="edit" />
          {'Ubah ' + resources[resource].singular}
        </button>
      </>
    </div>
  );
}

export function RecordDetailModal({
  resource,
  id,
  subtitle,
  children,
  form,
  href,
  closeHref,
}: {
  resource: Resource;
  id: string;
  subtitle: string;
  children?: ReactNode;
  form: ReactNode;
  href?: string | null;
  closeHref: string;
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
          ? '.record-detail-dialog input:not([type="hidden"]):not([type="file"]), .record-detail-dialog select, .record-detail-dialog textarea'
          : '.record-detail-dialog .detail-edit-button',
      )
      ?.focus({ preventScroll: true });
  }, [editing]);
  const icon: UiIconName =
    resource === 'faqs'
      ? 'faq'
      : resource === 'schedules'
        ? 'calendar'
        : resource === 'customers'
          ? 'contact'
          : resource === 'services'
            ? 'services'
            : 'edit';
  return (
    <Modal
      title={
        editing
          ? resource === 'services'
            ? 'Ubah Layanan'
            : 'Ubah ' + resources[resource].singular
          : titles[resource]
      }
      subtitle={editing ? '#' + displayId(id) : subtitle}
      icon={icon}
      className={
        'record-detail-dialog ' +
        resource +
        '-detail-dialog' +
        (resource === 'services' && editing ? ' service-form-dialog' : '')
      }
      onClose={() => router.replace(closeHref, { scroll: false })}
    >
      {editing ? (
        <DialogCloseContext.Provider value={() => setEditing(false)}>
          {form}
        </DialogCloseContext.Provider>
      ) : (
        <>
          <div className="modal-body detail-preview-body">{children}</div>
          <DetailFooter
            resource={resource}
            href={href}
            onEdit={() => setEditing(true)}
          />
        </>
      )}
    </Modal>
  );
}
