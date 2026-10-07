import { type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function AdminHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title admin-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function AdminPanel({
  title,
  eyebrow,
  children,
  aside,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          {eyebrow && <small>{eyebrow}</small>}
          <h2>{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function AdminEmpty({
  title = "Belum ada data yang sesuai",
  description = "Coba ubah kata kunci atau filter yang dipilih.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state admin-empty">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function AdminBadge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "amber" | "blue" | "gray";
}) {
  return <span className={`admin-badge ${tone}`}>{children}</span>;
}

export function ActionButton({
  children,
  icon = "arrow",
  onClick,
}: {
  children: ReactNode;
  icon?: IconName;
  onClick: () => void;
}) {
  return (
    <button className="button primary admin-add" onClick={onClick}>
      <Icon name={icon} />
      {children}
    </button>
  );
}

export const containsSearch = (search: string, ...values: unknown[]) =>
  values.join(" ").toLowerCase().includes(search.trim().toLowerCase());
