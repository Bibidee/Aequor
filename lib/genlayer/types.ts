export type Decision =
  | "NO_VIOLATION"
  | "VIOLATION_FOUND"
  | "INSUFFICIENT_CONTEXT"
  | "MALICIOUS_REPORT_SUSPECTED"
  | "NEEDS_HUMAN_ESCALATION"
  | "POLICY_AMBIGUOUS";

export type Severity = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RecommendedAction =
  | "NO_ACTION"
  | "EDUCATIONAL_NOTICE"
  | "WARNING"
  | "CONTENT_HIDE"
  | "CONTENT_REMOVE"
  | "TEMP_MUTE_1H"
  | "TEMP_MUTE_24H"
  | "TEMP_SUSPEND_7D"
  | "PERMANENT_BAN_REVIEW"
  | "ESCALATE_TO_HUMAN"
  | "RESTORE_CONTENT"
  | "REDUCE_ACTION"
  | "UPHOLD_ACTION";

export type AppealOutcome =
  | "UPHELD"
  | "REDUCED"
  | "REVERSED"
  | "REVIEW_AGAIN_WITH_MORE_CONTEXT"
  | "ESCALATED";

export type CaseStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "RULED"
  | "APPEALED"
  | "APPEAL_REVERSED"
  | "APPEAL_REDUCED"
  | "CLOSED";

export interface StatementOfReasons {
  policyBasis: string;
  factsConsidered: string[];
  whyActionIsProportional: string;
  appealAvailable: boolean;
}

export interface ModerationVerdict {
  decision: Decision;
  ruleMatched: string;
  severity: Severity;
  recommendedAction: RecommendedAction;
  confidence: number;
  reasoning: string;
  statementOfReasons: StatementOfReasons;
  safetyFlags: string[];
  consistencyNotes: string;
  reviewedAt?: string;
}

export interface ModerationCase {
  id: string;
  communityId: string;
  reporterHash: string;
  reportedUserHash: string;
  contentType: string;
  selectedRuleId: string;
  contextSummary: string;
  evidenceHashes: string[];
  evidenceHash: string;
  requestedAction: string;
  priorActionSummary: string;
  localeContext: string;
  status: CaseStatus;
  verdict?: ModerationVerdict;
  appealId?: string;
  reportQuality?: ReportQuality;
  submittedAt: string;
  submittedBy: string;
  packet: CasePacket;
}

export interface CasePacket {
  caseId: string;
  communityId: string;
  rulebookVersion?: string;
  reportedUserHash: string;
  reporterHash: string;
  contentType: string;
  selectedRuleId: string;
  reportedContentExcerpt: string;
  contextSummary: string;
  priorActionSummary: string;
  evidenceHashes: string[];
  requestedAction: string;
  localeContext: string;
  submittedAt: string;
}

export interface AppealRecord {
  id: string;
  caseId: string;
  reason: string;
  missingContext: string;
  counterEvidenceSummary: string;
  requestedOutcome: AppealOutcome;
  status: "SUBMITTED" | "REVIEWED";
  outcome?: AppealOutcomeRecord;
  submittedAt: string;
  submittedBy: string;
}

export interface AppealOutcomeRecord {
  outcome: AppealOutcome;
  reasoning: string;
  originalDecision: string;
  revisedAction: string;
  confidence: number;
  notes: string;
  reviewedAt: string;
}

export interface ReportQuality {
  quality: "LEGITIMATE" | "LOW_QUALITY" | "POTENTIALLY_MALICIOUS" | "MALICIOUS" | "INSUFFICIENT_INFORMATION";
  flags: string[];
  confidence: number;
  notes: string;
}

export interface Community {
  id: string;
  owner: string;
  name: string;
  category: "GAME" | "FORUM" | "DAO" | "CREATOR" | "EDUCATION" | "MARKETPLACE" | "OTHER";
  moderationStyle: "STRICT" | "BALANCED" | "RESTORATIVE" | "COMPETITIVE" | "CHILD_SAFE";
  rulebookHash: string;
  appealWindowHours: number;
  createdAt: string;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
  allowedExamples: string[];
  violationExamples: string[];
  severityRange: string[];
  defaultActions: string[];
  escalationTriggers: string[];
  contextNotes: string;
}

export interface Rulebook {
  communityId: string;
  rulebook: Record<string, Rule>;
  rulebookHash: string;
  registeredAt: string;
}

export interface ProtocolStats {
  totalCommunities: number;
  totalCases: number;
  totalAppeals: number;
  totalReversals: number;
  humanEscalations: number;
}
