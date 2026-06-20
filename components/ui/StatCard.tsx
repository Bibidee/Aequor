import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "lime" | "blue" | "purple" | "coral" | "green" | "red" | "default";
  className?: string;
}

export function StatCard({ label, value, sub, accent = "default", className }: StatCardProps) {
  const accentClass = {
    lime: "border-l-signal-lime",
    blue: "border-l-judgement-blue",
    purple: "border-l-appeal-purple",
    coral: "border-l-warning-coral",
    green: "border-l-success-green",
    red: "border-l-danger-red",
    default: "border-l-ink",
  }[accent];

  return (
    <div className={cn("bg-panel-cream border-2 border-ink border-l-4 p-4", accentClass, className)}>
      <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">{label}</div>
      <div className="text-2xl font-heading font-bold text-ink">{value}</div>
      {sub && <div className="text-xs text-muted-ink mt-1 font-body">{sub}</div>}
    </div>
  );
}
