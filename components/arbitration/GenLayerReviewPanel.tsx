"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { ValidatorTape } from "./ValidatorTape";
import { VerdictStamp } from "./VerdictStamp";
import { StatementOfReasonsCard } from "./StatementOfReasonsCard";
import type { ModerationCase, ModerationVerdict } from "@/lib/genlayer/types";
import { getClient } from "@/lib/genlayer/client";
import { getContractAddress } from "@/lib/genlayer/contract";
import { waitForTx } from "@/lib/genlayer/txWaiter";
import { normalizeVerdict } from "@/lib/genlayer/normalizeVerdict";
import { actionLabel } from "@/lib/utils/format";
import { Zap, AlertTriangle } from "lucide-react";

interface Props {
  case_: ModerationCase;
  onVerdictReceived?: (verdict: ModerationVerdict) => void;
  onReviewStarted?: () => void;
}

export function GenLayerReviewPanel({ case_, onVerdictReceived, onReviewStarted }: Props) {
  const [status, setStatus] = useState<"idle" | "pending" | "finalized" | "error">("idle");
  const [verdict, setVerdict] = useState<ModerationVerdict | null>(case_.verdict ?? null);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const alreadyRuled = !!case_.verdict && status === "idle";

  const triggerReview = useCallback(async () => {
    setStatus("pending");
    setError(null);
    try {
      const client = getClient();
      const contractAddr = getContractAddress();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = await (client as any).writeContract({
        address: contractAddr,
        functionName: "review_case",
        args: [case_.id],
      });
      setTxHash(tx);
      onReviewStarted?.();
      const result = await waitForTx(tx as `0x${string}`);
      // Contract returns {caseId, ok, verdict: {...}} — unwrap verdict
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = result as any;
      const verdictRaw = raw?.verdict ?? raw?.result?.verdict ?? raw;
      const v = normalizeVerdict(verdictRaw);
      if (v?.decision) {
        setVerdict(v);
        onVerdictReceived?.(v);
      }
      setStatus("finalized");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
      setStatus("error");
    }
  }, [case_.id, onVerdictReceived]);

  return (
    <div className="space-y-4">
      <ValidatorTape
        status={alreadyRuled ? "finalized" : status}
        txHash={txHash}
      />

      {!alreadyRuled && status === "idle" && (
        <div className="flex items-center justify-between p-4 border-2 border-judgement-blue bg-panel-cream">
          <div>
            <div className="font-stamp text-xs uppercase tracking-widest text-judgement-blue mb-1">GenLayer Review Ready</div>
            <div className="text-sm font-body text-muted-ink">Triggers AI-validator consensus review of this case against the community rulebook.</div>
          </div>
          <Button variant="lime" onClick={triggerReview} className="shrink-0">
            <Zap size={14} />
            Start Review
          </Button>
        </div>
      )}

      {status === "pending" && (
        <div className="p-4 border-2 border-signal-lime bg-panel-cream text-center">
          <div className="font-stamp text-xs uppercase tracking-widest text-signal-lime animate-pulse">
            GenLayer validators are evaluating this case…
          </div>
          <div className="text-xs text-muted-ink mt-1 font-body">Checking every 10 seconds. This may take 1–3 minutes on Studionet.</div>
        </div>
      )}

      {error && (
        <div className="p-4 border-2 border-danger-red bg-panel-cream flex items-center gap-3">
          <AlertTriangle size={16} className="text-danger-red shrink-0" />
          <div>
            <div className="font-stamp text-xs uppercase tracking-widest text-danger-red mb-1">Review Error</div>
            <div className="text-sm font-body text-ink">{error}</div>
          </div>
        </div>
      )}

      {verdict && (
        <div className="space-y-4 animate-slide-up">
          <VerdictStamp decision={verdict.decision} severity={verdict.severity} confidence={verdict.confidence} />

          <div className="p-4 border-2 border-ink bg-panel-cream space-y-3">
            <div>
              <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Recommended Action</div>
              <div className="font-heading font-bold text-lg text-ink">{actionLabel(verdict.recommendedAction)}</div>
            </div>
            <div>
              <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Reasoning</div>
              <div className="text-sm font-body text-ink leading-relaxed">{verdict.reasoning}</div>
            </div>
            {verdict.consistencyNotes && (
              <div>
                <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Consistency Notes</div>
                <div className="text-sm font-body text-muted-ink italic">{verdict.consistencyNotes}</div>
              </div>
            )}
          </div>

          {verdict.statementOfReasons && (
            <StatementOfReasonsCard statement={verdict.statementOfReasons} />
          )}
        </div>
      )}
    </div>
  );
}
