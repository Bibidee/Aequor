"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { ValidatorTape } from "./ValidatorTape";
import { VerdictStamp } from "./VerdictStamp";
import { StatementOfReasonsCard } from "./StatementOfReasonsCard";
import type { ModerationCase, ModerationVerdict } from "@/lib/genlayer/types";
import { getClientReady } from "@/lib/genlayer/client";
import { getContractAddress } from "@/lib/genlayer/contract";
import { waitForTxFinality } from "@/lib/genlayer/txWaiter";
import { readCaseFromContract } from "@/lib/genlayer/contractReader";
import { normalizeVerdict } from "@/lib/genlayer/normalizeVerdict";
import { actionLabel } from "@/lib/utils/format";
import { Zap, AlertTriangle } from "lucide-react";

const LS_PREFIX = "aequor:reviewTx:";

function saveTxHash(caseId: string, step: "review" | "verdict", hash: string) {
  localStorage.setItem(`aequor:tx:${caseId}:${step}`, hash);
}

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
  const pollingRef = useRef(false);

  const alreadyRuled = !!verdict;

  const pollContractForVerdict = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      for (let i = 0; i < 60; i++) {
        const onChain = await readCaseFromContract(case_.id);
        console.log("[Aequor] Contract poll:", onChain?.status, onChain?.verdict ? "has verdict" : "no verdict");
        if (onChain?.verdict && onChain.status === "RULED") {
          const v = normalizeVerdict(onChain.verdict);
          if (v?.decision) {
            setVerdict(v);
            setStatus("finalized");
            onVerdictReceived?.(v);
            localStorage.removeItem(LS_PREFIX + case_.id);
            // The review tx hash IS the verdict tx hash — alias it
            const reviewHash = localStorage.getItem(`aequor:tx:${case_.id}:review`);
            if (reviewHash) saveTxHash(case_.id, "verdict", reviewHash);
            return;
          }
        }
        await new Promise((r) => setTimeout(r, 8_000));
      }
      setError("Timed out waiting for verdict from contract.");
      setStatus("error");
    } finally {
      pollingRef.current = false;
    }
  }, [case_.id, onVerdictReceived]);

  // On mount: check contract state and recover pending tx
  useEffect(() => {
    if (alreadyRuled) return;

    let cancelled = false;

    (async () => {
      // First check contract — maybe already resolved
      const onChain = await readCaseFromContract(case_.id);
      if (cancelled) return;

      if (onChain?.verdict && onChain.status === "RULED") {
        const v = normalizeVerdict(onChain.verdict);
        if (v?.decision) {
          setVerdict(v);
          setStatus("finalized");
          onVerdictReceived?.(v);
          localStorage.removeItem(LS_PREFIX + case_.id);
          return;
        }
      }

      // Check for pending tx recovery
      const savedTx = localStorage.getItem(LS_PREFIX + case_.id);
      if (savedTx) {
        setTxHash(savedTx);
        setStatus("pending");
        onReviewStarted?.();
        pollContractForVerdict();
      }
    })();

    return () => { cancelled = true; };
  }, [case_.id]);

  const triggerReview = useCallback(async () => {
    setStatus("pending");
    setError(null);
    try {
      const client = await getClientReady();
      const contractAddr = getContractAddress();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = await (client as any).writeContract({
        address: contractAddr,
        functionName: "review_case",
        args: [case_.id],
      });
      const hash = typeof tx === "string" ? tx : String(tx);
      setTxHash(hash);
      localStorage.setItem(LS_PREFIX + case_.id, hash);
      saveTxHash(case_.id, "review", hash);
      onReviewStarted?.();

      // Wait for tx finality first
      await waitForTxFinality(hash as `0x${string}`);

      // Then poll contract getter for the stored verdict
      await pollContractForVerdict();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
      setStatus("error");
    }
  }, [case_.id, onReviewStarted, pollContractForVerdict]);

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
          <div className="text-xs text-muted-ink mt-1 font-body">Polling contract every 8 seconds. This may take 1–3 minutes on Studionet.</div>
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
