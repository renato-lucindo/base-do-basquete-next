import { useEffect, useState } from "react";
import "./admin-toast.css";

export function AdminToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(!!message);
  useEffect(() => {
    setVisible(!!message);
    if (!message) return;
    const timer = window.setTimeout(() => setVisible(false), 6000);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message || !visible) return null;
  return (
    <div
      className="admin-toast"
      role="region"
      aria-label="Notificação"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="admin-toast-text">
        <strong>Concluído — {message}</strong>
      </div>
      <button
        type="button"
        className="admin-toast-close"
        aria-label="Dispensar notificação"
        onClick={() => setVisible(false)}
      >
        ×
      </button>
    </div>
  );
}
