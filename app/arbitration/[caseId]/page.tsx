"use client";

import { use, useState, useEffect, useRef } from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAequor } from "@/lib/context/AequorContext";
import { GenLayerReviewPanel } from "@/components/arbitration/GenLayerReviewPanel";
import { EvidenceStack } from "@/components/cases/EvidenceStack";
import { CaseTimeline } from "@/components/cases/CaseTimeline";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ModerationVerdict } from "@/lib/genlayer/types";
import type { TimelineChainData, TimelineTxHashes } from "@/components/cases/CaseTimeline";
import Link from "next/link";
import { useWallet } from "@/lib/context/WalletContext";
import { ArrowLeft, FileText } from "lucide-react";
import { readCaseFromContract } from "@/lib/genlayer/contractReader";

export default function ArbitrationCasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  const { getCaseById, updateCase, getRulebookByCommunity } = useAequor();
  const { address } = useWallet();
  const [hydrated, setHydrated] = useState(false);
  const [chainAppealStatus, setChainAppealStatus] = useState<string | null>(null);
  const [chainAppealVerdict, setChainAppealVerdict] = useState<string | null>(null);
  const [chainAppealReasoning, setChainAppealReasoning] = useState<string | null>(null);
  const [chainReviewStatus, setChainReviewStatus] = useState<string | null>(null);
  const appealPollingRef = useRef(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    let cancelled = false;
    async function checkAppealOnChain() {
      try {
        const onChain = await readCaseFromContract(caseId);
        if (!onChain || cancelled) return;
        const status = onChain.appealStatus as string | undefined;
        const reviewSt = onChain.reviewStatus as string | undefined;
        if (reviewSt) setChainReviewStatus(reviewSt);
        if (status === "APPEAL_RESOLVED") {
          const verdict = (onChain.appealVerdict as string) ?? "";
          const reasoning = (onChain.appealReasoningSummary as string) ?? "";
          setChainAppealStatus("APPEAL_RESOLVED");
          setChainAppealVerdict(verdict);
          setChainAppealReasoning(reasoning);
          updateCase(caseId, { appealStatus: "APPEAL_RESOLVED", appealVerdict: verdict, appealReasoningSummary: reasoning });
        } else if (status === "APPEAL_PENDING" && !appealPollingRef.current) {
          appealPollingRef.current = true;
          setChainAppealStatus("APPEAL_PENDING");
          for (let i = 0; i < 90; i++) {
            if (cancelled) break;
            await new Promise((r) => setTimeout(r, 8_000));
            if (cancelled) break;
            const polled = await readCaseFromContract(caseId);
            if (!polled || cancelled) break;
            if (polled.appealStatus === "APPEAL_RESOLVED") {
              const verdict = (polled.appealVerdict as string) ?? "";
              const reasoning = (polled.appealReasoningSummary as string) ?? "";
              setChainAppealStatus("APPEAL_RESOLVED");
              setChainAppealVerdict(verdict);
              setChainAppealReasoning(reasoning);
              updateCase(caseId, { appealStatus: "APPEAL_RESOLVED", appealVerdict: verdict, appealReasoningSummary: reasoning });
              break;
            }
          }
          appealPollingRef.current = false;
        }
      } catch {
        // contract read failure — ignore silently on case page
      }
    }
    checkAppealOnChain();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const case_ = getCaseById(caseId);

  if (!hydrated) return <div className="p-8 font-stamp text-xs uppercase tracking-widest text-muted-ink">Loading…</div>;
  if (!case_) return notFound();

  const rulebook = getRulebookByCommunity(case_.communityId);
  const rule = rulebook?.rulebook[case_.selectedRuleId];

  const handleReviewStarted = () => {
    updateCase(caseId, { status: "UNDER_REVIEW" });
  };

  const handleVerdictReceived = (verdict: ModerationVerdict) => {
    updateCase(caseId, { verdict, status: "RULED" });
  };

  return (
    <AppShell title={`Case ${case_.id}`} subtitle={case_.contextSummary.slice(0, 60) + "…"}>
      <div className="p-6">
        <div className="mb-4">
          <Link href="/arbitration" className="inline-flex items-center gap-1 font-stamp text-xs uppercase tracking-widest text-muted-ink hover:text-ink transition-colors">
            <ArrowLeft size={12} /> Back to Cases
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Case summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText size={14} />
                  <span className="font-stamp text-xs uppercase tracking-widest">Case Summary</span>
                  <StatusBadge status={case_.status} />
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Community</div>
                    <div className="font-body text-sm text-ink">{case_.communityId}</div>
                  </div>
                  <div>
                    <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Content Type</div>
                    <div className="font-body text-sm text-ink">{case_.contentType}</div>
                  </div>
                  <div>
                    <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Rule Applied</div>
                    <Badge variant="blue">{case_.selectedRuleId}</Badge>
                  </div>
                  <div>
                    <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Requested Action</div>
                    <div className="font-body text-sm text-ink">{case_.requestedAction}</div>
                  </div>
                </div>
                {case_.respondentDiscord && (
                  <div className="col-span-2 grid grid-cols-2 gap-4 border-t border-border-ink pt-3">
                    <div>
                      <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Respondent</div>
                      <div className="font-body text-sm text-ink">{case_.respondentDiscord}</div>
                    </div>
                    {case_.respondentWallet && (
                      <div>
                        <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Respondent Wallet</div>
                        <div className="font-mono text-xs text-ink truncate">{case_.respondentWallet}</div>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Context Summary</div>
                  <div className="font-body text-sm text-ink leading-relaxed">{case_.contextSummary}</div>
                </div>
                {case_.priorActionSummary && (
                  <div>
                    <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Prior Action Summary</div>
                    <div className="font-body text-sm text-muted-ink">{case_.priorActionSummary}</div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Matched rule */}
            {rule && (
              <Card>
                <CardHeader><span className="font-stamp text-xs uppercase tracking-widest">Rulebook Match</span></CardHeader>
                <CardBody className="space-y-2">
                  <div className="font-heading font-bold text-sm">{rule.title}</div>
                  <div className="font-body text-sm text-muted-ink">{rule.description}</div>
                  <div className="flex gap-2 flex-wrap">
                    {rule.severityRange.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                    {rule.defaultActions.map((a) => <Badge key={a} variant="blue">{a}</Badge>)}
                  </div>
                  {rule.contextNotes && <div className="text-xs font-body text-muted-ink italic">{rule.contextNotes}</div>}
                </CardBody>
              </Card>
            )}

            {/* Evidence */}
            <EvidenceStack hashes={case_.evidenceHashes} contentType={case_.contentType} />

            {/* GenLayer review */}
            <GenLayerReviewPanel case_={case_} onVerdictReceived={handleVerdictReceived} onReviewStarted={handleReviewStarted} />

            {/* Appeal section */}
            {case_.verdict && (case_.status === "RULED" || case_.appealStatus === "APPEAL_AVAILABLE") && (() => {
              const hasRespondentWallet = !!case_.respondentWallet;
              const isRespondent = hasRespondentWallet && address?.toLowerCase() === case_.respondentWallet?.toLowerCase();
              const isOldCase = !case_.respondentDiscord && !case_.respondentWallet;

              if (isOldCase) return (
                <div className="border-2 border-border-ink p-4 bg-panel-cream">
                  <div className="font-stamp text-xs uppercase tracking-widest text-muted-ink mb-1">Appeal Unavailable</div>
                  <div className="font-body text-sm text-muted-ink">This case was created before respondent identity was recorded.</div>
                </div>
              );

              if (!hasRespondentWallet) return (
                <div className="border-2 border-border-ink p-4 bg-panel-cream">
                  <div className="font-stamp text-xs uppercase tracking-widest text-muted-ink mb-1">Appeal Unavailable</div>
                  <div className="font-body text-sm text-muted-ink">No respondent wallet was recorded for this case.</div>
                </div>
              );

              if (isRespondent) return (
                <div className="border-2 border-appeal-purple p-4 bg-panel-cream flex items-center justify-between">
                  <div>
                    <div className="font-stamp text-xs uppercase tracking-widest text-appeal-purple mb-1">Dispute This Ruling</div>
                    <div className="font-body text-sm text-muted-ink">You are the respondent ({case_.respondentDiscord}). You may file an appeal.</div>
                  </div>
                  <Link href={`/appeals?caseId=${case_.id}`}>
                    <Button variant="outline" size="sm" className="border-appeal-purple text-appeal-purple hover:bg-appeal-purple hover:text-white">
                      Submit Appeal
                    </Button>
                  </Link>
                </div>
              );

              return (
                <div className="border-2 border-border-ink p-4 bg-panel-cream">
                  <div className="font-stamp text-xs uppercase tracking-widest text-muted-ink mb-1">Appeal Available to Respondent Only</div>
                  <div className="font-body text-sm text-muted-ink">Only {case_.respondentDiscord}&apos;s recorded wallet can appeal this ruling.</div>
                </div>
              );
            })()}

            {/* Appeal pending — polling in progress */}
            {chainAppealStatus === "APPEAL_PENDING" && (
              <div className="border-2 border-appeal-purple p-4 bg-panel-cream space-y-2">
                <div className="font-stamp text-xs uppercase tracking-widest text-appeal-purple animate-pulse">Appeal Review In Progress</div>
                <div className="font-body text-sm text-muted-ink">GenLayer validators are reviewing the appeal. This page will update automatically when the result is ready.</div>
              </div>
            )}

            {/* Appeal resolved — from chain (refresh-safe) or localStorage */}
            {(() => {
              const resolvedOnChain = chainAppealStatus === "APPEAL_RESOLVED" && chainAppealVerdict;
              const resolvedInStorage = case_.appealStatus === "APPEAL_RESOLVED" && case_.appealVerdict;
              const verdict = chainAppealVerdict || case_.appealVerdict;
              const reasoning = chainAppealReasoning || case_.appealReasoningSummary;
              if (!resolvedOnChain && !resolvedInStorage) return null;
              return (
                <div className="border-2 border-appeal-purple p-4 bg-panel-cream space-y-2">
                  <div className="font-stamp text-xs uppercase tracking-widest text-appeal-purple">Appeal Ruling</div>
                  <div className="font-heading font-bold text-sm text-ink">{verdict}</div>
                  {reasoning && (
                    <div className="font-body text-sm text-muted-ink">{reasoning}</div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Right: timeline + inspector */}
          <div className="space-y-4">
            <Card>
              <CardHeader><span className="font-stamp text-xs uppercase tracking-widest">Case Timeline</span></CardHeader>
              <CardBody>
                <CaseTimeline
                case_={case_}
                chainData={{
                  appealStatus: chainAppealStatus,
                  appealVerdict: chainAppealVerdict,
                  appealReasoningSummary: chainAppealReasoning,
                  reviewStatus: chainReviewStatus,
                } satisfies TimelineChainData}
              />
              </CardBody>
            </Card>

            <Card className="bg-deep-panel border-deep-panel">
              <CardHeader className="border-canvas/10">
                <span className="font-stamp text-xs uppercase tracking-widest text-canvas/60">Case IDs</span>
              </CardHeader>
              <CardBody className="space-y-2">
                <div>
                  <div className="font-stamp text-[10px] uppercase text-canvas/40 mb-0.5">Case ID</div>
                  <div className="font-mono text-xs text-canvas/80 break-all">{case_.id}</div>
                </div>
                <div>
                  <div className="font-stamp text-[10px] uppercase text-canvas/40 mb-0.5">Evidence Hash</div>
                  <div className="font-mono text-xs text-canvas/80 break-all">{case_.evidenceHash || "—"}</div>
                </div>
                <div>
                  <div className="font-stamp text-[10px] uppercase text-canvas/40 mb-0.5">Reporter Hash</div>
                  <div className="font-mono text-xs text-canvas/80 break-all">{case_.reporterHash}</div>
                </div>
                <div>
                  <div className="font-stamp text-[10px] uppercase text-canvas/40 mb-0.5">Reported Hash</div>
                  <div className="font-mono text-xs text-canvas/80 break-all">{case_.reportedUserHash}</div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
