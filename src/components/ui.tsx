import { useEffect, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { statusTone, type OrderStatus } from "../data/orders";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`status-badge ${statusTone(status)}`}>
      <i />
      {status}
    </span>
  );
}
export function MetricCard({
  label,
  value,
  unit,
  note,
  icon,
  tone = "green",
}: {
  label: string;
  value: number | string;
  unit?: string;
  note: string;
  icon: IconName;
  tone?: "green" | "blue" | "amber";
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <div>
        <p className="metric-label">{label}</p>
        <div className="metric-value">
          {value}
          <span>{unit}</span>
        </div>
        <span className={`metric-note ${tone === "blue" ? "green" : tone}`}>
          {note}
        </span>
      </div>
      <span className={`metric-icon ${tone}`}>
        <Icon name={icon} />
      </span>
    </article>
  );
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  className = "",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = old;
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""} ${className}`}
      aria-labelledby="modal-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-header">
        <div>
          <h2 id="modal-title">{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className="close-button"
          aria-label="Tutup dialog"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
