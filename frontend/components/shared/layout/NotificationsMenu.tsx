'use client';
import Link from 'next/link';
import { Icon } from '@/components/shared/ui/Icon';
import { DialogFooter } from '@/components/shared/ui/DialogFooter';
import { DialogHeader } from '@/components/shared/ui/DialogHeader';
import { useNotifications } from '@/hooks/useNotifications';
import type { Order } from '@/types';
import { NotificationItem } from './NotificationItem';
import { SHELL_COPY } from './data';

const copy = SHELL_COPY.notifications;

export function NotificationsMenu({
  orders,
  initialRead = [],
}: {
  orders: Order[];
  initialRead?: string[];
}) {
  const notifications = useNotifications(orders, initialRead);

  return (
    <div className="notification-anchor" ref={notifications.anchor}>
      <button
        className="notification-button"
        type="button"
        aria-label={copy.trigger}
        aria-expanded={notifications.open}
        onClick={notifications.toggle}
      >
        <Icon name="bell" />
        {notifications.unread > 0 && <i />}
      </button>
      <div
        className="notification-popover"
        data-open={notifications.open}
        aria-hidden={!notifications.open}
        inert={!notifications.open}
        role="dialog"
        aria-label={copy.panel}
      >
        <DialogHeader
          title={copy.title}
          subtitle={`${copy.headerNote} · ${notifications.unread} belum dibaca`}
          onClose={notifications.close}
        />
        <div className="notification-toolbar">
          <div className="dialog-tabs">
            <button
              className={!notifications.unreadOnly ? 'active' : ''}
              aria-pressed={!notifications.unreadOnly}
              onClick={() => notifications.setUnreadOnly(false)}
            >
              {copy.all}
            </button>
            <button
              className={notifications.unreadOnly ? 'active' : ''}
              aria-pressed={notifications.unreadOnly}
              onClick={() => notifications.setUnreadOnly(true)}
            >
              {copy.unread}
            </button>
          </div>
          <button
            className="quiet-action"
            disabled={!notifications.unread || notifications.isPending}
            onClick={notifications.markAllRead}
          >
            {copy.markAll}
          </button>
          {notifications.error && (
            <span className="error-message" role="alert" aria-live="polite">
              {notifications.error}
            </span>
          )}
        </div>
        <div className="notification-list">
          {notifications.shown.map((order) => (
            <NotificationItem
              key={order.id}
              order={order}
              unread={
                notifications.readStatusLoaded &&
                !notifications.read.includes(order.id)
              }
              onOpen={(selected) => {
                notifications.markRead([selected.id]);
                notifications.close();
              }}
            />
          ))}
          {!notifications.shown.length && (
            <p className="notification-empty">
              {notifications.unreadOnly ? copy.emptyUnread : copy.empty}
            </p>
          )}
        </div>
        <DialogFooter className="notification-footer">
          <span>{copy.footer}</span>
          <Link
            className="button"
            href="/pesanan"
            onClick={notifications.close}
          >
            {copy.seeAll}
          </Link>
        </DialogFooter>
      </div>
    </div>
  );
}
