import { useEffect } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

type Props = {
  title: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
};

export function Modal({ title, onClose, className = "", children }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${className}`}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label={`Close ${title.toLowerCase()}`}
            onClick={onClose}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type ConfirmProps = {
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  return (
    <Modal title={title} onClose={onCancel} className="confirm-modal">
      <p className="modal-message">{message}</p>
      <div className="form-actions">
        <button className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button
          autoFocus
          className="danger-button"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
