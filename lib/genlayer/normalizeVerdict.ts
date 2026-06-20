import type { ModerationVerdict } from "./types";

export function normalizeVerdict(raw: unknown): ModerationVerdict | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  return {
    decision: (v.decision as ModerationVerdict["decision"]) ?? "INSUFFICIENT_CONTEXT",
    ruleMatched: (v.ruleMatched as string) ?? "",
    severity: (v.severity as ModerationVerdict["severity"]) ?? "NONE",
    recommendedAction: (v.recommendedAction as ModerationVerdict["recommendedAction"]) ?? "ESCALATE_TO_HUMAN",
    confidence: typeof v.confidence === "number" ? v.confidence : 0,
    reasoning: (v.reasoning as string) ?? "",
    statementOfReasons: {
      policyBasis: (v.statementOfReasons as Record<string, unknown>)?.policyBasis as string ?? "",
      factsConsidered: ((v.statementOfReasons as Record<string, unknown>)?.factsConsidered as string[]) ?? [],
      whyActionIsProportional: (v.statementOfReasons as Record<string, unknown>)?.whyActionIsProportional as string ?? "",
      appealAvailable: ((v.statementOfReasons as Record<string, unknown>)?.appealAvailable as boolean) ?? true,
    },
    safetyFlags: (v.safetyFlags as string[]) ?? [],
    consistencyNotes: (v.consistencyNotes as string) ?? "",
    reviewedAt: (v.reviewedAt as string) ?? "",
  };
}
