import type { ReactNode } from 'react';

export function DialogNote({
  title,
  children,
  tip = false,
}: {
  title?: string;
  children: ReactNode;
  tip?: boolean;
}) {
  if (!title || tip || title.includes('Boo')) return null;
  return (
    <aside className="customer-notes">
      <div>
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
    </aside>
  );
}
