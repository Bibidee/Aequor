export function shortAddress(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function decisionLabel(decision: string): string {
  const map: Record<string, string> = {
    NO_VIOLATION: "No Violation",
    VIOLATION_FOUND: "Violation Found",
    INSUFFICIENT_CONTEXT: "Insufficient Context",
    MALICIOUS_REPORT_SUSPECTED: "Malicious Report",
    NEEDS_HUMAN_ESCALATION: "Human Escalation",
    POLICY_AMBIGUOUS: "Policy Ambiguous",
  };
  return map[decision] ?? decision;
}

export function severityLabel(s: string): string {
  const map: Record<string, string> = {
    NONE: "None",
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  };
  return map[s] ?? s;
}

export function actionLabel(a: string): string {
  const map: Record<string, string> = {
    NO_ACTION: "No Action",
    EDUCATIONAL_NOTICE: "Educational Notice",
    WARNING: "Warning",
    CONTENT_HIDE: "Hide Content",
    CONTENT_REMOVE: "Remove Content",
    TEMP_MUTE_1H: "Mute 1h",
    TEMP_MUTE_24H: "Mute 24h",
    TEMP_SUSPEND_7D: "Suspend 7 days",
    PERMANENT_BAN_REVIEW: "Permanent Ban Review",
    ESCALATE_TO_HUMAN: "Escalate to Human",
    RESTORE_CONTENT: "Restore Content",
    REDUCE_ACTION: "Reduce Action",
    UPHOLD_ACTION: "Uphold Action",
  };
  return map[a] ?? a;
}

export function appealOutcomeLabel(o: string): string {
  const map: Record<string, string> = {
    UPHELD: "Upheld",
    REDUCED: "Reduced",
    REVERSED: "Reversed",
    REVIEW_AGAIN_WITH_MORE_CONTEXT: "Needs More Context",
    ESCALATED: "Escalated",
  };
  return map[o] ?? o;
}

export function confidencePercent(c: number): string {
  return `${Math.round(c * 100)}%`;
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
