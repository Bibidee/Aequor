"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAequor } from "@/lib/context/AequorContext";
import { useWallet } from "@/lib/context/WalletContext";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { buildCasePacket } from "@/lib/aequor/casePacketBuilder";
import { generateId } from "@/lib/utils/format";
import type { ModerationCase } from "@/lib/genlayer/types";
import { getClient } from "@/lib/genlayer/client";
import { getContractAddress } from "@/lib/genlayer/contract";
import { Shield, Hash, AlertTriangle } from "lucide-react";

const CONTENT_TYPES = [
  { value: "GAME_CHAT", label: "Game Chat" },
  { value: "MATCH_LOG", label: "Match Log" },
  { value: "FORUM_POST", label: "Forum Post" },
  { value: "DIRECT_MESSAGE", label: "Direct Message (hashed)" },
  { value: "GAME_CLIP_HASH", label: "Game Clip (hash only)" },
  { value: "SCREENSHOT_HASH", label: "Screenshot (hash only)" },
  { value: "OTHER", label: "Other" },
];

const ACTIONS = [
  { value: "WARNING", label: "Warning" },
  { value: "EDUCATIONAL_NOTICE", label: "Educational Notice" },
  { value: "CONTENT_HIDE", label: "Hide Content" },
  { value: "CONTENT_REMOVE", label: "Remove Content" },
  { value: "TEMP_MUTE_1H", label: "Mute 1 Hour" },
  { value: "TEMP_MUTE_24H", label: "Mute 24 Hours" },
  { value: "TEMP_SUSPEND_7D", label: "Suspend 7 Days" },
  { value: "PERMANENT_BAN_REVIEW", label: "Permanent Ban Review" },
  { value: "ESCALATE_TO_HUMAN", label: "Escalate to Human" },
];

export default function IntakePage() {
  const { communities, rulebooks, addCase } = useAequor();
  const { address } = useWallet();
  const router = useRouter();

  const [form, setForm] = useState({
    communityId: communities[0]?.id ?? "",
    contentType: "GAME_CHAT",
    selectedRuleId: "",
    reportedContentExcerpt: "",
    contextSummary: "",
    priorActionSummary: "",
    requestedAction: "WARNING",
    localeContext: "English",
    evidenceText1: "",
    evidenceText2: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rulebook = rulebooks[form.communityId];
  const ruleOptions = rulebook
    ? [{ value: "", label: "— Select Rule —" }, ...Object.values(rulebook.rulebook).map((r) => ({ value: r.id, label: `${r.id} — ${r.title}` }))]
    : [{ value: "", label: "No rulebook registered" }];

  const handleSubmit = async () => {
    if (!form.communityId || !form.selectedRuleId || !form.contextSummary) {
      setError("Community, rule, and context summary are required.");
      return;
    }
    if (!address) {
      setError("Connect your wallet to submit a case on-chain.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const caseId = generateId("case");
      const { packet, evidenceHashes, evidenceHash } = await buildCasePacket(caseId, {
        communityId: form.communityId,
        contentType: form.contentType,
        selectedRuleId: form.selectedRuleId,
        reportedContentExcerpt: form.reportedContentExcerpt,
        contextSummary: form.contextSummary,
        priorActionSummary: form.priorActionSummary,
        requestedAction: form.requestedAction,
        localeContext: form.localeContext,
        reporterHash: await import("@/lib/aequor/evidenceHasher").then((m) => m.hashString(`reporter_${address ?? "anon"}`)),
        reportedUserHash: await import("@/lib/aequor/evidenceHasher").then((m) => m.hashString(`reported_${Date.now()}`)),
        rawEvidenceTexts: [form.evidenceText1, form.evidenceText2].filter(Boolean),
      });

      const newCase: ModerationCase = {
        id: caseId,
        communityId: form.communityId,
        reporterHash: packet.reporterHash,
        reportedUserHash: packet.reportedUserHash,
        contentType: form.contentType,
        selectedRuleId: form.selectedRuleId,
        contextSummary: form.contextSummary,
        evidenceHashes,
        evidenceHash,
        requestedAction: form.requestedAction,
        priorActionSummary: form.priorActionSummary,
        localeContext: form.localeContext,
        status: "SUBMITTED",
        submittedAt: new Date().toISOString(),
        submittedBy: address ?? "0xlocal",
        packet,
      };

      const client = getClient();
      const contractAddr = getContractAddress();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client as any).writeContract({
        address: contractAddr,
        functionName: "submit_case",
        args: [caseId, JSON.stringify(packet), evidenceHash],
      });

      addCase(newCase);
      router.push(`/arbitration/${caseId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Case Intake" subtitle="Submit a moderation case for GenLayer review">
      <div className="p-6 max-w-2xl space-y-6">
        {/* Privacy notice */}
        <div className="border-2 border-ink bg-deep-panel text-canvas p-4 flex items-start gap-3">
          <Shield size={16} className="text-signal-lime shrink-0 mt-0.5" />
          <div>
            <div className="font-stamp text-xs uppercase tracking-widest text-signal-lime mb-1">Evidence Notice</div>
            <div className="font-body text-xs text-canvas/70">
              Raw evidence is not stored on-chain. Aequor sends a structured case packet with content summaries and cryptographic hashes to GenLayer. Sensitive private content stays off-chain.
            </div>
          </div>
        </div>

        <Card>
          <CardHeader><span className="font-stamp text-xs uppercase tracking-widest">Case Details</span></CardHeader>
          <CardBody className="space-y-4">
            <Select label="Community" value={form.communityId} onChange={(e) => setForm({ ...form, communityId: e.target.value, selectedRuleId: "" })} options={communities.map((c) => ({ value: c.id, label: c.name }))} />
            <Select label="Content Type" value={form.contentType} onChange={(e) => setForm({ ...form, contentType: e.target.value })} options={CONTENT_TYPES} />
            <Select label="Applicable Rule" value={form.selectedRuleId} onChange={(e) => setForm({ ...form, selectedRuleId: e.target.value })} options={ruleOptions} />
            <Select label="Requested Action" value={form.requestedAction} onChange={(e) => setForm({ ...form, requestedAction: e.target.value })} options={ACTIONS} />
            <Input label="Locale / Context" value={form.localeContext} onChange={(e) => setForm({ ...form, localeContext: e.target.value })} placeholder="English, gaming slang, competitive context" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><span className="font-stamp text-xs uppercase tracking-widest">Context & Evidence</span></CardHeader>
          <CardBody className="space-y-4">
            <Textarea label="Reported Content Excerpt (will be summarized, not stored raw)" value={form.reportedContentExcerpt} onChange={(e) => setForm({ ...form, reportedContentExcerpt: e.target.value })} rows={3} placeholder="Brief excerpt of the reported content." />
            <Textarea label="Context Summary" value={form.contextSummary} onChange={(e) => setForm({ ...form, contextSummary: e.target.value })} rows={3} placeholder="Describe what happened and the context." />
            <Textarea label="Prior Action Summary" value={form.priorActionSummary} onChange={(e) => setForm({ ...form, priorActionSummary: e.target.value })} rows={2} placeholder="Any previous warnings or actions against this user." />
            <div>
              <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-2">Evidence Items (will be hashed)</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Hash size={12} className="text-muted-ink shrink-0" />
                  <Textarea value={form.evidenceText1} onChange={(e) => setForm({ ...form, evidenceText1: e.target.value })} rows={2} placeholder="Evidence item 1 — paste text, URLs, or identifiers to hash" className="flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <Hash size={12} className="text-muted-ink shrink-0" />
                  <Textarea value={form.evidenceText2} onChange={(e) => setForm({ ...form, evidenceText2: e.target.value })} rows={2} placeholder="Evidence item 2 (optional)" className="flex-1" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <AlertTriangle size={10} className="text-muted-ink" />
                <span className="text-[10px] font-body text-muted-ink">For screenshots or clips: paste the file path or identifier. The hash is what gets committed to GenLayer, not the content.</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {error && <div className="border-2 border-danger-red p-3 text-sm font-stamp text-danger-red">{error}</div>}

        <div className="flex gap-3">
          <Button variant="lime" size="lg" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Building packet…" : "Submit Case for GenLayer Review"}
          </Button>
          <Badge variant="blue">GenLayer</Badge>
        </div>
      </div>
    </AppShell>
  );
}
