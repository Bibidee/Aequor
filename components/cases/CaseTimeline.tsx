import type { ModerationCase } from "@/lib/genlayer/types";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

const EXPLORER = "https://explorer-studio.genlayer.com";

function makeTxUrl(hash: string | null | undefined): string | null {
  return hash ? `${EXPLORER}/tx/${hash}` : null;
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function normalizeStatus(value: unknown): string {
  return String(value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export interface TimelineTxHashes {
  report?: string | null;
  review?: string | null;
  verdict?: string | null;
  appeal?: string | null;
  appealVerdict?: string | null;
  closed?: string | null;
}

export interface TimelineChainData {
  appealStatus?: string | null;
  appealVerdict?: string | null;
  appealReasoningSummary?: string | null;
  reviewStatus?: string | null;
}

interface TimelineStep {
  label: string;
  date?: string;
  state: "completed" | "active" | "upcoming";
  color?: "appeal";
  txHash?: string | null;
}

type Phase =
  | "REPORT_SUBMITTED"
  | "UNDER_REVIEW"
  | "VERDICT_ISSUED"
  | "APPEAL_PENDING"
  | "APPEAL_RESOLVED";

function derivePhase(
  case_: ModerationCase,
  chainData?: TimelineChainData
): Phase {
  // Chain state overrides local state for status fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = case_ as any;
  const reviewStatus = normalizeStatus(
    chainData?.reviewStatus ?? raw.review_status ?? case_.reviewStatus
  );
  const appealStatus = normalizeStatus(
    chainData?.appealStatus ?? raw.appeal_status ?? case_.appealStatus
  );
  const appealVerdict =
    chainData?.appealVerdict ??
    raw.appeal_verdict ??
    case_.appealVerdict ??
    chainData?.appealReasoningSummary ??
    raw.appeal_reasoning_summary ??
    case_.appealReasoningSummary;

  const hasAppealVerdict = !!appealVerdict;
  const hasOriginalVerdict = !!(case_.verdict || raw.reasoning_summary);

  if (hasAppealVerdict || appealStatus === "APPEAL_RESOLVED") return "APPEAL_RESOLVED";

  if (
    appealStatus === "APPEAL_PENDING" ||
    appealStatus === "APPEAL_SUBMITTED" ||
    appealStatus === "APPEAL_FILED" ||
    appealStatus === "APPEAL_UNDER_REVIEW" ||
    case_.status === "APPEALED"
  )
    return "APPEAL_PENDING";

  if (
    hasOriginalVerdict ||
    reviewStatus === "RESOLVED" ||
    reviewStatus === "VERDICT_ISSUED" ||
    case_.status === "RULED" ||
    case_.status === "APPEAL_REVERSED" ||
    case_.status === "APPEAL_REDUCED"
  )
    return "VERDICT_ISSUED";

  if (
    reviewStatus === "PENDING" ||
    reviewStatus === "UNDER_REVIEW" ||
    case_.status === "UNDER_REVIEW"
  )
    return "UNDER_REVIEW";

  return "REPORT_SUBMITTED";
}

function TxLink({ hash }: { hash?: string | null }) {
  if (!hash) return null;
  const url = makeTxUrl(hash);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-[10px] text-muted-ink hover:text-judgement-blue transition-colors underline underline-offset-2 decoration-dotted"
      title={hash}
    >
      tx {shortHash(hash)}
    </a>
  );
}

export function CaseTimeline({
  case_,
  chainData,
  txHashes: txHashesProp,
}: {
  case_: ModerationCase;
  chainData?: TimelineChainData;
  txHashes?: TimelineTxHashes;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = case_ as any;
  const caseId = case_.id;

  const lsGet = (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(`aequor:tx:${caseId}:${key}`);
  };

  const txHashes: TimelineTxHashes = {
    report:
      raw.reportTxHash ?? raw.report_tx_hash ?? raw.createdTxHash ?? raw.created_tx_hash ??
      txHashesProp?.report ?? lsGet("report"),
    review:
      raw.reviewTxHash ?? raw.review_tx_hash ?? raw.reviewStartedTxHash ?? raw.review_started_tx_hash ??
      txHashesProp?.review ?? lsGet("review"),
    verdict:
      raw.verdictTxHash ?? raw.verdict_tx_hash ?? raw.resolvedTxHash ?? raw.resolved_tx_hash ??
      raw.reviewResolvedTxHash ?? raw.review_resolved_tx_hash ??
      txHashesProp?.verdict ?? lsGet("verdict"),
    appeal:
      raw.appealTxHash ?? raw.appeal_tx_hash ?? raw.appealSubmittedTxHash ?? raw.appeal_submitted_tx_hash ??
      txHashesProp?.appeal ?? lsGet("appeal"),
    appealVerdict:
      raw.appealVerdictTxHash ?? raw.appeal_verdict_tx_hash ??
      raw.appealResolvedTxHash ?? raw.appeal_resolved_tx_hash ??
      raw.appealReviewTxHash ?? raw.appeal_review_tx_hash ??
      txHashesProp?.appealVerdict ?? lsGet("appealVerdict"),
    closed:
      raw.closeTxHash ?? raw.close_tx_hash ?? raw.closedTxHash ?? raw.closed_tx_hash ??
      txHashesProp?.closed ?? lsGet("closed"),
  };

  const phase = derivePhase(case_, chainData);

  const PHASES: Phase[] = [
    "REPORT_SUBMITTED",
    "UNDER_REVIEW",
    "VERDICT_ISSUED",
    "APPEAL_PENDING",
    "APPEAL_RESOLVED",
  ];
  const phaseIndex = PHASES.indexOf(phase);

  function stepState(requiredPhase: Phase, activePhase?: Phase): "completed" | "active" | "upcoming" {
    const reqIdx = PHASES.indexOf(requiredPhase);
    if (activePhase) {
      const actIdx = PHASES.indexOf(activePhase);
      if (phaseIndex > actIdx) return "completed";
      if (phaseIndex === actIdx) return "active";
      return "upcoming";
    }
    if (phaseIndex > reqIdx) return "completed";
    if (phaseIndex === reqIdx) return "completed";
    return "upcoming";
  }

  const steps: TimelineStep[] = [
    {
      label: "Report Submitted",
      date: case_.submittedAt,
      state: "completed",
      txHash: txHashes.report,
    },
    {
      label: "Under GenLayer Review",
      state:
        phase === "REPORT_SUBMITTED"
          ? "upcoming"
          : phase === "UNDER_REVIEW"
          ? "active"
          : "completed",
      txHash: txHashes.review,
    },
    {
      label: "Verdict Issued",
      date: case_.verdict?.reviewedAt,
      state: (["REPORT_SUBMITTED", "UNDER_REVIEW"] as Phase[]).includes(phase)
        ? "upcoming"
        : "completed",
      txHash: txHashes.verdict,
    },
    {
      label: "Appeal Filed",
      state: (["REPORT_SUBMITTED", "UNDER_REVIEW", "VERDICT_ISSUED"] as Phase[]).includes(phase)
        ? "upcoming"
        : "completed",
      color: "appeal",
      txHash: txHashes.appeal,
    },
    {
      label: "Appeal Reviewed",
      state: (["REPORT_SUBMITTED", "UNDER_REVIEW", "VERDICT_ISSUED"] as Phase[]).includes(phase)
        ? "upcoming"
        : phase === "APPEAL_PENDING"
        ? "active"
        : "completed",
      color: "appeal",
      txHash: txHashes.appealVerdict,
    },
    {
      label: "Closed",
      state: phase === "APPEAL_RESOLVED" ? "completed" : "upcoming",
      txHash: txHashes.closed ?? (phase === "APPEAL_RESOLVED" ? txHashes.appealVerdict : undefined),
    },
  ];

  // Suppress appeal steps (label, dot) from rendering if appeal not relevant
  const appealPhases: Phase[] = ["APPEAL_PENDING", "APPEAL_RESOLVED"];
  const appealActive = appealPhases.includes(phase);

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        // Dim appeal steps that aren't reachable yet
        const isAppealStep = i >= 3;
        const dimmed = isAppealStep && !appealActive && step.state === "upcoming";

        return (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-3 h-3 border-2 rounded-full shrink-0 mt-0.5",
                  step.state === "completed" && step.color === "appeal"
                    ? "bg-appeal-purple border-appeal-purple"
                    : step.state === "completed"
                    ? "bg-judgement-blue border-judgement-blue"
                    : step.state === "active" && step.color === "appeal"
                    ? "bg-appeal-purple/40 border-appeal-purple animate-pulse"
                    : step.state === "active"
                    ? "bg-signal-lime border-signal-lime animate-pulse"
                    : "bg-canvas border-border-ink"
                )}
              />
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 h-6",
                    step.state === "completed" ? "bg-border-ink" : "bg-border-ink/30"
                  )}
                />
              )}
            </div>
            <div className="pb-3 min-w-0">
              <div
                className={cn(
                  "text-xs font-stamp uppercase tracking-widest",
                  step.state !== "upcoming" ? "text-ink" : dimmed ? "text-border-ink" : "text-muted-ink"
                )}
              >
                {step.label}
              </div>
              {step.date && (
                <div className="text-xs font-body text-muted-ink">{formatDate(step.date)}</div>
              )}
              {step.txHash && <TxLink hash={step.txHash} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
