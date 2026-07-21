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
    <aside
      className={`status-notice status-${tone}`}
      aria-label={title}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <strong>{title}</strong>
      <span>{children}</span>
    </aside>
  );
}
