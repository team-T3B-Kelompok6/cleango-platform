'use client';
import { UiIcon } from './UiIcon';
import Link from 'next/link';
import { useState, useRef } from 'react';
import { Icon } from './Icon';
import { useOutsideDismiss } from './useOutsideDismiss';
import type { Order } from '@/types';
export function Notifications({ orders }: { orders: Order[] }) {
  const [open, setOpen] = useState(false),
    [read, setRead] = useState<string[]>([]),
    [unreadOnly, setUnreadOnly] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideDismiss(ref, open, () => setOpen(false));
  const recent = orders.slice(0, 8),
    unread = recent.filter((order) => !read.includes(order.id)).length;
  const shown = recent.filter(
    (order) => !unreadOnly || !read.includes(order.id),
  );
  return (
    <div className="notification-anchor" ref={ref}>
      <button
        className="notification-button"
        type="button"
        aria-label="Lihat notifikasi"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name="bell" />
        {unread > 0 && <i />}
      </button>
      <div
        className="notification-popover"
        data-open={open}
        aria-hidden={!open}
        inert={!open}
        role="dialog"
        aria-label="Notifikasi"
      >
        <div className="modal-header">
          <div>
            <h2>Notifikasi</h2>
            <p>Aktivitas pesanan terbaru · {unread} belum dibaca</p>
          </div>
          <button
            className="close-button"
            type="button"
            aria-label="Tutup notifikasi"
            onClick={() => setOpen(false)}
          >
            <UiIcon name="close" />
          </button>
        </div>
        <div className="notification-toolbar">
          <div className="dialog-tabs">
            <button
              className={!unreadOnly ? 'active' : ''}
              aria-pressed={!unreadOnly}
              onClick={() => setUnreadOnly(false)}
            >
              Semua
            </button>
            <button
              className={unreadOnly ? 'active' : ''}
              aria-pressed={unreadOnly}
              onClick={() => setUnreadOnly(true)}
            >
              Belum dibaca
            </button>
          </div>
          <button
            className="quiet-action"
            disabled={!unread}
            onClick={() => setRead(recent.map((order) => order.id))}
          >
            Tandai semua dibaca
          </button>
        </div>
        <div className="notification-list">
          {shown.map((order) => (
            <Link
              href={'/pesanan/' + encodeURIComponent(order.id)}
              key={order.id}
              className={
                'notification-row ' + (!read.includes(order.id) ? 'unread' : '')
              }
              onClick={() => {
                setRead((previous) => [...previous, order.id]);
                setOpen(false);
              }}
            >
              {!read.includes(order.id) && (
                <i className="notification-unread" />
              )}
              <span
                className={
                  'notification-symbol ' +
                  (order.status === 'Menunggu Assign' ? 'attention' : '')
                }
              >
                <Icon name={order.status === 'Selesai' ? 'check' : 'package'} />
              </span>
              <span className="notification-copy">
                <span className="notification-row-title">
                  {order.status}
                  <small>{order.date}</small>
                </span>
                <span>
                  {order.customer} · {order.service}
                </span>
                <em>Lihat pesanan #{order.id}</em>
              </span>
            </Link>
          ))}
          {!shown.length && (
            <p className="notification-empty">
              {unreadOnly
                ? 'Semua aktivitas sudah dibaca.'
                : 'Belum ada aktivitas pesanan.'}
            </p>
          )}
        </div>
        <div className="modal-footer notification-footer">
          <span>Dari aktivitas pesanan terbaru</span>
          <Link
            className="button"
            href="/pesanan"
            onClick={() => setOpen(false)}
          >
            Lihat semua pesanan
          </Link>
        </div>
      </div>
    </div>
  );
}
