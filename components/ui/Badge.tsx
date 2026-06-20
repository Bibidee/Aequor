import { cn } from "@/lib/utils/cn";

type BadgeVariant = "default" | "lime" | "blue" | "purple" | "coral" | "grey" | "green" | "red" | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-stamp text-xs font-bold uppercase tracking-widest px-2 py-0.5 border",
        {
          "bg-ink text-canvas border-ink": variant === "default",
          "bg-signal-lime text-ink border-signal-lime": variant === "lime",
          "bg-judgement-blue text-white border-judgement-blue": variant === "blue",
          "bg-appeal-purple text-white border-appeal-purple": variant === "purple",
          "bg-warning-coral text-white border-warning-coral": variant === "coral",
          "bg-dismiss-grey text-white border-dismiss-grey": variant === "grey",
          "bg-success-green text-white border-success-green": variant === "green",
          "bg-danger-red text-white border-danger-red": variant === "red",
          "bg-transparent text-ink border-ink": variant === "outline",
        },
        className
      )}
    >
      {children}
    </span>
  );
}

export function DecisionBadge({ decision }: { decision: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    NO_VIOLATION: "green",
    VIOLATION_FOUND: "red",
    INSUFFICIENT_CONTEXT: "grey",
    MALICIOUS_REPORT_SUSPECTED: "coral",
    NEEDS_HUMAN_ESCALATION: "coral",
    POLICY_AMBIGUOUS: "purple",
  };
  const labelMap: Record<string, string> = {
    NO_VIOLATION: "No Violation",
    VIOLATION_FOUND: "Violation Found",
    INSUFFICIENT_CONTEXT: "Insufficient Context",
    MALICIOUS_REPORT_SUSPECTED: "Malicious Report",
    NEEDS_HUMAN_ESCALATION: "Escalate",
    POLICY_AMBIGUOUS: "Ambiguous",
  };
  return <Badge variant={variantMap[decision] ?? "grey"}>{labelMap[decision] ?? decision}</Badge>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    NONE: "grey",
    LOW: "outline",
    MEDIUM: "coral",
    HIGH: "red",
    CRITICAL: "red",
  };
  return <Badge variant={variantMap[severity] ?? "grey"}>{severity}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    DRAFT: "grey",
    SUBMITTED: "blue",
    UNDER_REVIEW: "lime",
    RULED: "green",
    APPEALED: "purple",
    APPEAL_REVERSED: "coral",
    APPEAL_REDUCED: "coral",
    CLOSED: "default",
  };
  const labelMap: Record<string, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    UNDER_REVIEW: "Under Review",
    RULED: "Ruled",
    APPEALED: "Appealed",
    APPEAL_REVERSED: "Reversed",
    APPEAL_REDUCED: "Reduced",
    CLOSED: "Closed",
  };
  return <Badge variant={variantMap[status] ?? "grey"}>{labelMap[status] ?? status}</Badge>;
}
