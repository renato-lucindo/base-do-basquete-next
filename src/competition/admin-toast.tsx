import { useCallback, useEffect, useRef, useState } from "react";
import "./admin-toast.css";

export type AdminToastNotice = { id: number; message: string };

export function useAdminToast() {
  const [toast, setToast] = useState<AdminToastNotice | null>(null);
  const nextId = useRef(0);
  const notify = useCallback((message: string) => {
    nextId.current += 1;
    setToast({ id: nextId.current, message });
  }, []);
  const dismiss = useCallback(() => setToast(null), []);
  return { toast, notify, dismiss };
}

export function AdminToast({
  toast,
  onDismiss,
}: {
  toast: AdminToastNotice | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);
  if (!toast) return null;
  return (
    <div className="admin-toast" role="status" aria-atomic="true">
      <span>{toast.message}</span>
      <button
        type="button"
        className="admin-toast-dismiss"
        aria-label="Fechar notificação"
        onClick={onDismiss}
      >
        Fechar
      </button>
    </div>
  );
}
