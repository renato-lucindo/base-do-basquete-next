import { useEffect, useId, useRef, type ReactNode } from "react";
import "./admin-dialog.css";

export function AdminDialog({
  title,
  open,
  busy,
  onClose,
  children,
  className = "",
  closeLabel,
  footer,
  closeOnBackdrop = false,
}: {
  title: string;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const node = dialog.current;
    if (!node || !open) {
      node?.close();
      return;
    }
    const origin =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!node.open) node.showModal();
    return () => {
      node.close();
      queueMicrotask(() => {
        if (
          origin?.isConnected &&
          !origin.closest("[hidden], [inert]") &&
          !document.querySelector("dialog[open]")
        )
          origin.focus({ preventScroll: true });
      });
    };
  }, [open]);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={id}
      className={`admin-dialog ${className}`}
      onClick={(event) => {
        if (!closeOnBackdrop || busy || event.target !== event.currentTarget)
          return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header className="admin-dialog-header">
        <h3 id={id}>{title}</h3>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={onClose}
          aria-label={closeLabel ?? "Fechar diálogo"}
        >
          {closeLabel ?? "Fechar"}
        </button>
      </header>
      <div className="admin-dialog-body">{children}</div>
      {footer && <footer className="admin-dialog-footer">{footer}</footer>}
    </dialog>
  );
}
