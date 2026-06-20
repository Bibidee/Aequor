"use client";

import { cn } from "@/lib/utils/cn";
import type { Decision, Severity } from "@/lib/genlayer/types";
import { decisionLabel, severityLabel } from "@/lib/utils/format";

interface VerdictStampProps {
  decision: Decision;
  severity: Severity;
  confidence: number;
  className?: string;
}

const DECISION_STYLES: Record<Decision, { bg: string; border: string; text: string; rotate: string }> = {
  NO_VIOLATION: { bg: "bg-success-green", border: "border-success-green", text: "text-white", rotate: "-rotate-1" },
  VIOLATION_FOUND: { bg: "bg-danger-red", border: "border-danger-red", text: "text-white", rotate: "rotate-1" },
  INSUFFICIENT_CONTEXT: { bg: "bg-dismiss-grey", border: "border-dismiss-grey", text: "text-white", rotate: "-rotate-0.5" },
  MALICIOUS_REPORT_SUSPECTED: { bg: "bg-warning-coral", border: "border-warning-coral", text: "text-white", rotate: "rotate-1" },
  NEEDS_HUMAN_ESCALATION: { bg: "bg-warning-coral", border: "border-warning-coral", text: "text-white", rotate: "-rotate-1" },
  POLICY_AMBIGUOUS: { bg: "bg-appeal-purple", border: "border-appeal-purple", text: "text-white", rotate: "rotate-0.5" },
};

export function VerdictStamp({ decision, severity, confidence, className }: VerdictStampProps) {
  const styles = DECISION_STYLES[decision] ?? DECISION_STYLES["INSUFFICIENT_CONTEXT"];
  return (
    <div className={cn("animate-stamp inline-flex flex-col items-center gap-1", className)}>
      <div className={cn(
        "border-4 px-6 py-3 font-stamp font-bold text-xl uppercase tracking-widest transform",
        styles.bg, styles.border, styles.text, styles.rotate
      )}>
        {decisionLabel(decision)}
      </div>
      <div className="flex items-center gap-3 mt-1">
        <span className="font-stamp text-xs text-muted-ink uppercase tracking-widest">
          Severity: <span className="text-ink font-bold">{severityLabel(severity)}</span>
        </span>
        <span className="text-muted-ink">·</span>
        <span className="font-stamp text-xs text-muted-ink uppercase tracking-widest">
          Confidence: <span className="text-ink font-bold">{Math.round(confidence * 100)}%</span>
        </span>
      </div>
    </div>
  );
}
