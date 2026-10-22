type StatusBadgeProps = {
  children: string;
  tone?: "neutral" | "success" | "warning";
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}
