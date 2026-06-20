"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAequor } from "@/lib/context/AequorContext";
import { useWallet } from "@/lib/context/WalletContext";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { CaseTicket } from "@/components/cases/CaseTicket";
import type { AppealRecord } from "@/lib/genlayer/types";
import { generateId, appealOutcomeLabel } from "@/lib/utils/format";
import { timeAgo } from "@/lib/utils/dates";
import { getClient } from "@/lib/genlayer/client";
import { getContractAddress } from "@/lib/genlayer/contract";
import { waitForTx } from "@/lib/genlayer/txWaiter";
import { ArrowLeftRight, Plus } from "lucide-react";

const OUTCOMES = [
  { value: "REVERSED", label: "Reversed — decision was wrong" },
  { value: "REDUCED", label: "Reduced — action too harsh" },
  { value: "UPHELD", label: "Uphold — I want another review" },
];

function AppealsInner() {
  const { cases, appeals, addAppeal, updateAppeal, updateCase, getCaseById } = useAequor();
  const { address } = useWallet();
  const searchParams = useSearchParams();
  const prefilledCaseId = searchParams.get("caseId") ?? "";

  const [showForm, setShowForm] = useState(!!prefilledCaseId);
  const [caseId, setCaseId] = useState(prefilledCaseId);
  const [form, setForm] = useState({ reason: "", missingContext: "", counterEvidenceSummary: "", requestedOutcome: "REVERSED" });
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appealableCases = cases.filter((c) => c.status === "RULED" && c.verdict?.statementOfReasons?.appealAvailable);

  const handleSubmitAppeal = async () => {
    if (!caseId || !form.reason) { setError("Case and reason are required."); return; }
    setSubmitting(true); setError(null);
    const appealId = generateId("appeal");
    const appeal: AppealRecord = {
      id: appealId,
      caseId,
      reason: form.reason,
      missingContext: form.missingContext,
      counterEvidenceSummary: form.counterEvidenceSummary,
      requestedOutcome: form.requestedOutcome as AppealRecord["requestedOutcome"],
      status: "SUBMITTED",
      submittedAt: new Date().toISOString(),
      submittedBy: address ?? "0xlocal",
    };

    try {
      if (address) {
        const client = getClient();
        const contractAddr = getContractAddress();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any).writeContract({
          address: contractAddr,
          functionName: "submit_appeal",
          args: [appealId, caseId, JSON.stringify(form)],
        });
      }
    } catch { /* local */ }

    addAppeal(appeal);
    updateCase(caseId, { status: "APPEALED", appealId });
    setShowForm(false);
    setForm({ reason: "", missingContext: "", counterEvidenceSummary: "", requestedOutcome: "REVERSED" });
    setSubmitting(false);
  };

  const handleReviewAppeal = async (appealId: string) => {
    setReviewingId(appealId);
    try {
      const client = getClient();
      const contractAddr = getContractAddress();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = await (client as any).writeContract({
        address: contractAddr,
        functionName: "review_appeal",
        args: [appealId],
      });
      const result = await waitForTx(tx as `0x${string}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const outcome = (result as any)?.outcome;
      if (outcome) {
        updateAppeal(appealId, { status: "REVIEWED", outcome });
        const appeal = appeals.find((a) => a.id === appealId);
        if (appeal) {
          updateCase(appeal.caseId, {
            status: outcome.outcome === "REVERSED" ? "APPEAL_REVERSED" : outcome.outcome === "REDUCED" ? "APPEAL_REDUCED" : "APPEALED",
          });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <AppShell title="Appeals" subtitle="Submit and review moderation appeals">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="font-stamp text-xs uppercase tracking-widest text-muted-ink">{appeals.length} appeals · {appeals.filter((a) => a.outcome?.outcome === "REVERSED").length} reversed</div>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="border-appeal-purple text-appeal-purple">
            <Plus size={14} /> File Appeal
          </Button>
        </div>

        {showForm && (
          <Card variant="lime-accent">
            <CardHeader><span className="font-stamp text-xs uppercase tracking-widest">File Appeal</span></CardHeader>
            <CardBody className="space-y-4">
              <div>
                <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Case to Appeal</div>
                <select className="border-2 border-ink bg-canvas px-3 py-2 text-sm font-body text-ink outline-none w-full" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
                  <option value="">— Select Case —</option>
                  {appealableCases.map((c) => <option key={c.id} value={c.id}>{c.id} — {c.selectedRuleId}</option>)}
                </select>
              </div>
              {caseId && getCaseById(caseId) && (
                <CaseTicket case_={getCaseById(caseId)!} compact />
              )}
              <Select label="Requested Outcome" value={form.requestedOutcome} onChange={(e) => setForm({ ...form, requestedOutcome: e.target.value })} options={OUTCOMES} />
              <Textarea label="Reason for Appeal" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} placeholder="Why do you believe the decision was incorrect?" />
              <Textarea label="Missing Context" value={form.missingContext} onChange={(e) => setForm({ ...form, missingContext: e.target.value })} rows={3} placeholder="What context was not considered in the original review?" />
              <Textarea label="Counter-Evidence Summary" value={form.counterEvidenceSummary} onChange={(e) => setForm({ ...form, counterEvidenceSummary: e.target.value })} rows={2} placeholder="Summary of any counter-evidence (hashes can be added separately)." />
              {error && <div className="text-sm text-danger-red font-stamp">{error}</div>}
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleSubmitAppeal} disabled={submitting} className="border-appeal-purple text-appeal-purple">
                  {submitting ? "Submitting…" : "Submit Appeal"}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardBody>
          </Card>
        )}

        {appeals.length === 0 ? (
          <div className="border-2 border-dashed border-border-ink p-12 text-center">
            <ArrowLeftRight size={32} className="text-muted-ink mx-auto mb-3" />
            <div className="font-heading font-bold">No appeals filed</div>
            <div className="font-body text-sm text-muted-ink">Appeals can be filed for ruled cases.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {appeals.map((a) => (
              <Card key={a.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-stamp text-xs text-muted-ink uppercase">{a.id}</span>
                        <Badge variant={a.status === "REVIEWED" ? "green" : "blue"}>{a.status}</Badge>
                        {a.outcome && (
                          <Badge variant={
                            a.outcome.outcome === "REVERSED" ? "green" :
                            a.outcome.outcome === "REDUCED" ? "blue" :
                            a.outcome.outcome === "UPHELD" ? "red" : "grey"
                          }>
                            {appealOutcomeLabel(a.outcome.outcome)}
                          </Badge>
                        )}
                      </div>
                      <div className="font-stamp text-xs text-muted-ink uppercase">Case: {a.caseId}</div>
                      <div className="font-body text-sm text-ink">{a.reason}</div>
                      {a.outcome && (
                        <div className="border-l-2 border-appeal-purple pl-3 space-y-1 mt-2">
                          <div className="font-stamp text-xs uppercase tracking-widest text-appeal-purple">GenLayer Appeal Review</div>
                          <div className="font-body text-sm text-ink">{a.outcome.reasoning}</div>
                          {a.outcome.notes && <div className="text-xs text-muted-ink font-body italic">{a.outcome.notes}</div>}
                        </div>
                      )}
                      <div className="text-xs text-muted-ink font-body">{timeAgo(a.submittedAt)}</div>
                    </div>
                    {a.status === "SUBMITTED" && (
                      <Button variant="outline" size="sm" onClick={() => handleReviewAppeal(a.id)} disabled={reviewingId === a.id} className="border-appeal-purple text-appeal-purple shrink-0">
                        {reviewingId === a.id ? "Reviewing…" : "GenLayer Review"}
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AppealsPage() {
  return (
    <Suspense fallback={<div className="p-6 font-stamp text-xs text-muted-ink uppercase">Loading…</div>}>
      <AppealsInner />
    </Suspense>
  );
}
