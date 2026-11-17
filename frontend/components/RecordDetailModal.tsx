'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { resources } from '@/lib/resources';
import type { Resource } from '@/types';
import { displayId } from '@/lib/display';
import { Modal } from '@/components/shared/ui/Modal';
import { DialogBody } from '@/components/shared/ui/DialogBody';
import { DialogFooter } from '@/components/shared/ui/DialogFooter';
import { Button, buttonVariants } from '@/components/shared/ui';
import { cn } from '@/lib/cn';
import {
  DialogCloseContext,
  useDialogClose,
} from '@/components/shared/ui/DialogContext';
import { UiIcon, type UiIconName } from '@/components/shared/ui/UiIcon';

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
    <DialogFooter className="items-center gap-10 max-sm:flex-wrap">
      {resource === 'customers' &&
        (href ? (
          <a
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'mr-auto border-line-strong bg-accent-soft text-accent max-sm:mr-0 max-sm:basis-full',
            )}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <UiIcon name="chat" /> Hubungi WA
          </a>
        ) : (
          <button
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'mr-auto border-line-strong bg-accent-soft text-accent max-sm:mr-0 max-sm:basis-full',
            )}
            type="button"
            disabled
            title="WhatsApp belum terhubung untuk kontak ini"
          >
            <UiIcon name="chat" />
            Hubungi WA
          </button>
        ))}
      <>
        <Button variant="ghost" onClick={() => close?.()}>
          Tutup
        </Button>
        <Button type="button" onClick={onEdit}>
          <UiIcon name="edit" />
          {'Ubah ' + resources[resource].singular}
        </Button>
      </>
    </DialogFooter>
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
      width={
        resource === 'services' && editing
          ? 1000
          : resource === 'faqs'
            ? 540
            : undefined
      }
      className={'record-detail-dialog ' + resource + '-detail-dialog'}
      onClose={() => router.replace(closeHref, { scroll: false })}
    >
      {editing ? (
        <DialogCloseContext.Provider value={() => setEditing(false)}>
          {form}
        </DialogCloseContext.Provider>
      ) : (
        <>
          <DialogBody className="flex flex-col gap-20 p-24">
            {children}
          </DialogBody>
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
