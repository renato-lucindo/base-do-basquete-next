import type { ReactNode } from "react";
import type { Prototype } from "./prototype/model";

export type ScreenProps = {
  data: Prototype;
  update: (next: Prototype) => void;
  commit: (next: Prototype, label?: string) => Promise<boolean>;
  notify: (text: string, error?: boolean) => void;
  go: (route: string) => void;
  dispute: string;
  openCompetition: (id: string) => void;
  openGame: (id: string) => void;
};
export function Field({
  label,
  id,
  children,
  hint,
}: {
  label: string;
  id: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
export function disputeLabel(data: Prototype, id: string) {
  const d = data.competition.disputes.find((d) => d.id === id);
  return d
    ? `${d.sex} · ${d.category}${d.division ? ` · ${d.division}` : ""}`
    : "Destino não disponível";
}
export function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
