import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-8 text-center border-2 border-dashed border-border-ink", className)}>
      {icon && <div className="mb-4 text-muted-ink">{icon}</div>}
      <h3 className="font-heading font-bold text-lg text-ink mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-ink font-body max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
