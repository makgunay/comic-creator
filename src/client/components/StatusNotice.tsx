import type { ReactNode } from "react";

export function StatusNotice({
  title,
  children,
  tone = "info",
}: {
  title: string;
  children: ReactNode;
  tone?: "info" | "error";
}) {
  return (
    <aside className={`status-notice status-${tone}`} aria-label={title}>
      <strong>{title}</strong>
      <span>{children}</span>
    </aside>
  );
}
