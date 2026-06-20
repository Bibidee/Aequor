"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { VerdictStamp } from "@/components/arbitration/VerdictStamp";
import { StatementOfReasonsCard } from "@/components/arbitration/StatementOfReasonsCard";
import { ValidatorTape } from "@/components/arbitration/ValidatorTape";
import { EvidenceStack } from "@/components/cases/EvidenceStack";
import { SEED_CASES, SEED_RULES } from "@/lib/aequor/seed";
import { useAequor } from "@/lib/context/AequorContext";
import { useWallet } from "@/lib/context/WalletContext";
import { getClient } from "@/lib/genlayer/client";
import { getContractAddress } from "@/lib/genlayer/contract";
import { waitForTx } from "@/lib/genlayer/txWaiter";
import { normalizeVerdict } from "@/lib/genlayer/normalizeVerdict";
import type { ModerationVerdict } from "@/lib/genlayer/types";
import { FlaskConical, Zap, BookOpen, FileText, Hash, Scale, CheckCircle, ArrowRight } from "lucide-react";

const DEMO_CASE = SEED_CASES[0];
const DEMO_RULE = SEED_RULES["harassment.targeted_insult"];
const DEMO_VERDICT = DEMO_CASE.verdict!;

const STEPS = [
  { num: "01", label: "Rulebook", icon: BookOpen },
  { num: "02", label: "Case Packet", icon: FileText },
  { num: "03", label: "Evidence Hashes", icon: Hash },
  { num: "04", label: "GenLayer Review Method", icon: Zap },
  { num: "05", label: "Validator Trace", icon: Scale },
  { num: "06", label: "Structured Ruling", icon: CheckCircle },
  { num: "07", label: "Statement of Reasons", icon: BookOpen },
  { num: "08", label: "Appeal Simulation", icon: ArrowRight },
];

export default function PlaygroundPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [liveStatus, setLiveStatus] = useState<"idle" | "pending" | "finalized" | "error">("idle");
  const [liveVerdict, setLiveVerdict] = useState<ModerationVerdict | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const { getRulebookByCommunity } = useAequor();
  const { address } = useWallet();

  const handleLiveReview = async () => {
    if (!address) { setError("Connect wallet first to trigger live GenLayer review."); return; }
    setLiveStatus("pending");
    setError(null);
    try {
      const client = getClient();
      const contractAddr = getContractAddress();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = await (client as any).writeContract({
        address: contractAddr,
        functionName: "review_case",
        args: [DEMO_CASE.id],
      });
      setTxHash(tx);
      const result = await waitForTx(tx as `0x${string}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = normalizeVerdict((result as any)?.verdict ?? result);
      if (v) setLiveVerdict(v);
      setLiveStatus("finalized");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
      setLiveStatus("error");
    }
  };

  const rulebook = getRulebookByCommunity("arena_guild");

  return (
    <AppShell title="Playground" subtitle="GenLayer arbitration demo inspector">
      <div className="p-6 space-y-6">
        <div className="border-2 border-signal-lime p-4 bg-deep-panel flex items-center gap-3">
          <FlaskConical size={16} className="text-signal-lime" />
          <div>
            <div className="font-stamp text-xs uppercase tracking-widest text-signal-lime mb-0.5">Demo Mode</div>
            <div className="font-body text-sm text-canvas/70">
              Walk through a complete GenLayer moderation arbitration with a safe, non-harmful example case. All demo evidence is fictional and serves only to illustrate the arbitration process.
            </div>
          </div>
        </div>

        {/* Step navigator */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STEPS.map((step, i) => (
            <button
              key={step.num}
              onClick={() => setActiveStep(i)}
              className={`flex items-center gap-1.5 px-3 py-2 border-2 shrink-0 font-stamp text-xs uppercase tracking-widest transition-colors ${
                activeStep === i
                  ? "bg-signal-lime border-signal-lime text-ink"
                  : "border-ink bg-canvas text-muted-ink hover:text-ink"
              }`}
            >
              <span className="font-bold">{step.num}</span>
              <span className="hidden md:inline">{step.label}</span>
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-96">
          {activeStep === 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookOpen size={14} />
                  <span className="font-stamp text-xs uppercase tracking-widest">01 / Rulebook</span>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="font-body text-sm text-muted-ink mb-2">
                  The community rulebook is the foundation of every GenLayer review. Validators interpret evidence against the written rules.
                </div>
                <div className="border-2 border-judgement-blue p-4 bg-canvas space-y-4">
                  <div className="font-stamp text-xs uppercase tracking-widest text-judgement-blue">Rule: {DEMO_RULE.id}</div>
                  <div className="font-heading font-bold text-lg">{DEMO_RULE.title}</div>
                  <div className="font-body text-sm text-ink">{DEMO_RULE.description}</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="font-stamp text-xs uppercase tracking-widest text-success-green mb-2">Allowed</div>
                      {DEMO_RULE.allowedExamples.map((e, i) => <div key={i} className="text-xs font-body text-muted-ink">✓ {e}</div>)}
                    </div>
                    <div>
                      <div className="font-stamp text-xs uppercase tracking-widest text-danger-red mb-2">Violation</div>
                      {DEMO_RULE.violationExamples.map((e, i) => <div key={i} className="text-xs font-body text-muted-ink">✗ {e}</div>)}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {DEMO_RULE.defaultActions.map((a) => <Badge key={a} variant="blue">{a}</Badge>)}
                  </div>
                  <div className="text-xs font-body text-muted-ink italic border-l-2 border-dismiss-grey pl-2">{DEMO_RULE.contextNotes}</div>
                </div>
                <Button variant="lime" size="sm" onClick={() => setActiveStep(1)}>Next: Case Packet <ArrowRight size={14} /></Button>
              </CardBody>
            </Card>
          )}

          {activeStep === 1 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText size={14} />
                  <span className="font-stamp text-xs uppercase tracking-widest">02 / Case Packet</span>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="font-body text-sm text-muted-ink">This is the structured packet sent to GenLayer. No raw private chat logs. Focused context and hashes only.</div>
                <div className="bg-deep-panel p-4 font-mono text-xs text-canvas/80 overflow-x-auto">
                  <pre>{JSON.stringify({
                    caseId: DEMO_CASE.id,
                    communityId: DEMO_CASE.communityId,
                    contentType: DEMO_CASE.contentType,
                    selectedRuleId: DEMO_CASE.selectedRuleId,
                    reportedContentExcerpt: "[REDACTED — evidence hash committed]",
                    contextSummary: DEMO_CASE.contextSummary,
                    priorActionSummary: DEMO_CASE.priorActionSummary,
                    evidenceHashes: DEMO_CASE.evidenceHashes,
                    requestedAction: DEMO_CASE.requestedAction,
                    localeContext: DEMO_CASE.localeContext,
                  }, null, 2)}</pre>
                </div>
                <Button variant="lime" size="sm" onClick={() => setActiveStep(2)}>Next: Evidence Hashes <ArrowRight size={14} /></Button>
              </CardBody>
            </Card>
          )}

          {activeStep === 2 && (
            <div className="space-y-4">
              <EvidenceStack hashes={DEMO_CASE.evidenceHashes} contentType={DEMO_CASE.contentType} />
              <Card>
                <CardBody>
                  <div className="font-body text-sm text-muted-ink">
                    Evidence items were hashed using SHA-256 before the case was submitted. GenLayer validators receive hashes and summaries — not the raw content.
                  </div>
                </CardBody>
              </Card>
              <Button variant="lime" size="sm" onClick={() => setActiveStep(3)}>Next: GenLayer Review Method <ArrowRight size={14} /></Button>
            </div>
          )}

          {activeStep === 3 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-judgement-blue" />
                  <span className="font-stamp text-xs uppercase tracking-widest">04 / GenLayer Review Method</span>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="font-body text-sm text-muted-ink">
                  The <span className="font-mono text-judgement-blue">review_case(case_id)</span> method on the AequorModeration contract is called. GenLayer validators run the same prompt against the case packet and reach consensus.
                </div>
                <div className="border-2 border-judgement-blue p-4 bg-canvas space-y-2">
                  <div className="font-stamp text-xs uppercase tracking-widest text-judgement-blue mb-2">Contract: AequorModeration</div>
                  {[
                    ["Method", "review_case(case_id)"],
                    ["Input", "Case packet + rulebook"],
                    ["Execution", "GenLayer AI-validator consensus"],
                    ["Output", "Structured JSON verdict"],
                    ["On-chain", "Verdict hash + statement of reasons"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-4 text-xs">
                      <span className="font-stamp text-muted-ink uppercase w-20 shrink-0">{k}</span>
                      <span className="font-body text-ink">{v}</span>
                    </div>
                  ))}
                </div>
                {!address && (
                  <div className="text-xs font-stamp text-warning-coral border border-warning-coral p-2">
                    Connect wallet above to trigger live GenLayer review in step 05.
                  </div>
                )}
                <Button variant="lime" size="sm" onClick={() => setActiveStep(4)}>Next: Validator Trace <ArrowRight size={14} /></Button>
              </CardBody>
            </Card>
          )}

          {activeStep === 4 && (
            <div className="space-y-4">
              <ValidatorTape status={liveStatus} txHash={txHash} />
              <Card>
                <CardBody className="space-y-3">
                  <div className="font-body text-sm text-muted-ink">
                    GenLayer distributes the review prompt to multiple validators. Each independently evaluates the case. The Equivalence Principle determines consensus.
                  </div>
                  {error && <div className="text-sm font-stamp text-danger-red">{error}</div>}
                  <div className="flex gap-3">
                    <Button variant="lime" onClick={handleLiveReview} disabled={liveStatus === "pending" || !address}>
                      <Zap size={14} />
                      {liveStatus === "pending" ? "Validators running…" : liveStatus === "finalized" ? "Re-run Review" : "Trigger Live GenLayer Review"}
                    </Button>
                    {liveStatus === "finalized" && (
                      <Button variant="outline" size="sm" onClick={() => setActiveStep(5)}>View Ruling <ArrowRight size={14} /></Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          {activeStep === 5 && (
            <div className="space-y-4">
              <VerdictStamp
                decision={liveVerdict?.decision ?? DEMO_VERDICT.decision}
                severity={liveVerdict?.severity ?? DEMO_VERDICT.severity}
                confidence={liveVerdict?.confidence ?? DEMO_VERDICT.confidence}
              />
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant={liveVerdict ? "lime" : "grey"}>{liveVerdict ? "Live Verdict" : "Demo Verdict"}</Badge>
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  <div>
                    <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Reasoning</div>
                    <div className="font-body text-sm text-ink leading-relaxed">{liveVerdict?.reasoning ?? DEMO_VERDICT.reasoning}</div>
                  </div>
                  <div>
                    <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Consistency Notes</div>
                    <div className="font-body text-sm text-muted-ink italic">{liveVerdict?.consistencyNotes ?? DEMO_VERDICT.consistencyNotes}</div>
                  </div>
                </CardBody>
              </Card>
              <Button variant="lime" size="sm" onClick={() => setActiveStep(6)}>Next: Statement of Reasons <ArrowRight size={14} /></Button>
            </div>
          )}

          {activeStep === 6 && (
            <div className="space-y-4">
              <StatementOfReasonsCard statement={liveVerdict?.statementOfReasons ?? DEMO_VERDICT.statementOfReasons} />
              <Button variant="lime" size="sm" onClick={() => setActiveStep(7)}>Next: Appeal Simulation <ArrowRight size={14} /></Button>
            </div>
          )}

          {activeStep === 7 && (
            <Card variant="lime-accent">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ArrowRight size={14} />
                  <span className="font-stamp text-xs uppercase tracking-widest">08 / Appeal Simulation</span>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="font-body text-sm text-muted-ink">
                  After a verdict is issued, the affected party can file an appeal. GenLayer re-evaluates the case with the new context provided.
                </div>
                <div className="border-2 border-appeal-purple p-4 bg-canvas space-y-3">
                  <div className="font-stamp text-xs uppercase tracking-widest text-appeal-purple">Demo Appeal</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-stamp text-xs text-muted-ink uppercase mb-1">Reason</div>
                      <div className="font-body text-ink">The message was taken out of context. It was part of a long-running in-joke between friends in the chat.</div>
                    </div>
                    <div>
                      <div className="font-stamp text-xs text-muted-ink uppercase mb-1">Missing Context</div>
                      <div className="font-body text-ink">Prior relationship between the two players was not considered. Both have played together for 3 years.</div>
                    </div>
                  </div>
                </div>
                <div className="border-2 border-success-green p-4 bg-canvas space-y-2">
                  <div className="font-stamp text-xs uppercase tracking-widest text-success-green mb-1">Simulated Appeal Outcome</div>
                  <div className="font-heading font-bold text-ink">REDUCED</div>
                  <div className="font-body text-sm text-muted-ink">
                    The appeal introduces new context suggesting the exchange was part of a prior friendly relationship. The violation is upheld but the 24-hour mute is reduced to a warning given this context.
                  </div>
                </div>
                <div className="text-xs font-body text-muted-ink border-l-2 border-dismiss-grey pl-3">
                  In a live scenario, <span className="font-mono text-ink">review_appeal(appeal_id)</span> would trigger a new GenLayer consensus pass using the original verdict plus the appeal context.
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setActiveStep(0)}>Restart Demo</Button>
                  <a href="/intake"><Button variant="lime">Try Real Case <ArrowRight size={14} /></Button></a>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
