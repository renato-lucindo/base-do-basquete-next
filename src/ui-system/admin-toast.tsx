import { useEffect, useState } from "react";
import { Icon } from "./components";
import "./admin-toast.css";

const variants = {
  success: { label: "Concluído", icon: "check" },
  error: { label: "Erro", icon: "close" },
  warning: { label: "Atenção", icon: "warning" },
} as const;

export type ToastTone = keyof typeof variants;

export function AdminToast({
  message,
  tone = "success",
  announce = true,
}: {
  message: string;
  tone?: ToastTone;
  announce?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    setDismissed(false);
  }, [message, tone]);

  useEffect(() => {
    if (!message || tone !== "success" || focused || dismissed) return;
    const timer = window.setTimeout(() => setDismissed(true), 6000);
    return () => window.clearTimeout(timer);
  }, [message, tone, focused, dismissed]);

  const variant = variants[tone];
  return (
    <div
      className="admin-toast-announcer"
      aria-live={announce ? "polite" : "off"}
      aria-atomic="true"
    >
      {message && !dismissed && (
        <div
          className="admin-toast"
          data-tone={tone}
          role="region"
          aria-label="Notificação"
        >
          <span className="admin-toast-icon">
            <Icon name={variant.icon} />
          </span>
          <div className="admin-toast-text">
            <strong>{variant.label}</strong> — {message}
          </div>
          <button
            type="button"
            className="admin-toast-close"
            aria-label="Dispensar notificação"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onClick={() => {
              setFocused(false);
              setDismissed(true);
            }}
          >
            <Icon name="close" />
          </button>
        </div>
      )}
    </div>
  );
}
