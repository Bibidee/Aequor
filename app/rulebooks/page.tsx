"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAequor } from "@/lib/context/AequorContext";
import { useWallet } from "@/lib/context/WalletContext";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { Rule, Rulebook } from "@/lib/genlayer/types";
import { generateId } from "@/lib/utils/format";
import { nowIso } from "@/lib/utils/dates";
import { hashEvidencePacket } from "@/lib/aequor/evidenceHasher";
import { Plus, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { getClient } from "@/lib/genlayer/client";
import { getContractAddress } from "@/lib/genlayer/contract";

const EMPTY_RULE: Omit<Rule, "id"> = {
  title: "",
  description: "",
  allowedExamples: [""],
  violationExamples: [""],
  severityRange: [],
  defaultActions: [],
  escalationTriggers: [""],
  contextNotes: "",
};

export default function RulebooksPage() {
  const { communities, rulebooks, addRulebook, activeCommunityId } = useAequor();
  const { address } = useWallet();
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRule, setNewRule] = useState<Omit<Rule, "id">>({ ...EMPTY_RULE });
  const [selectedCommunity, setSelectedCommunity] = useState(activeCommunityId ?? communities[0]?.id ?? "");

  const currentRulebook = rulebooks[selectedCommunity];
  const rules = currentRulebook ? Object.values(currentRulebook.rulebook) : [];

  const handleAddRule = async () => {
    if (!newRule.title || !selectedCommunity) return;
    if (!address) { setError("Connect your wallet to register a rulebook on-chain."); return; }
    setSubmitting(true);
    const id = generateId("rule").replace("rule_", "").replace(/_/g, ".");
    const rule: Rule = { ...newRule, id };
    const updatedRulebook: Record<string, Rule> = {
      ...(currentRulebook?.rulebook ?? {}),
      [id]: rule,
    };
    const rulebookHash = await hashEvidencePacket(updatedRulebook as unknown as Record<string, unknown>);

    const rb: Rulebook = {
      communityId: selectedCommunity,
      rulebook: updatedRulebook,
      rulebookHash,
      registeredAt: nowIso(),
    };

    try {
      const client = getClient();
      const contractAddr = getContractAddress();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client as any).writeContract({
        address: contractAddr,
        functionName: "register_rulebook",
        args: [selectedCommunity, JSON.stringify(updatedRulebook), rulebookHash],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed. Check your wallet and network.");
      setSubmitting(false);
      return;
    }

    addRulebook(selectedCommunity, rb);
    setNewRule({ ...EMPTY_RULE });
    setShowRuleForm(false);
    setSubmitting(false);
  };

  return (
    <AppShell title="Rulebooks" subtitle="Community rule registry">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <select
            className="border-2 border-ink bg-canvas px-3 py-2 text-sm font-body text-ink outline-none focus:border-judgement-blue"
            value={selectedCommunity}
            onChange={(e) => setSelectedCommunity(e.target.value)}
          >
            {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button variant="lime" size="sm" onClick={() => setShowRuleForm(!showRuleForm)}>
            <Plus size={14} /> Add Rule
          </Button>
        </div>

        {currentRulebook && (
          <div className="flex items-center gap-2 border border-border-ink p-2 bg-panel-cream">
            <span className="font-stamp text-xs uppercase tracking-widest text-muted-ink">Rulebook Hash:</span>
            <span className="font-mono text-xs text-ink truncate">{currentRulebook.rulebookHash}</span>
          </div>
        )}

        {showRuleForm && (
          <Card variant="lime-accent">
            <CardHeader><span className="font-stamp text-xs uppercase tracking-widest">New Rule</span></CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Rule Title" value={newRule.title} onChange={(e) => setNewRule({ ...newRule, title: e.target.value })} placeholder="Targeted Harassment" />
              </div>
              <Textarea label="Description" value={newRule.description} onChange={(e) => setNewRule({ ...newRule, description: e.target.value })} rows={3} placeholder="Repeated targeted insults directed at a specific player." />
              <Textarea label="Allowed Examples (one per line)" value={newRule.allowedExamples.join("\n")} onChange={(e) => setNewRule({ ...newRule, allowedExamples: e.target.value.split("\n") })} rows={2} />
              <Textarea label="Violation Examples (one per line)" value={newRule.violationExamples.join("\n")} onChange={(e) => setNewRule({ ...newRule, violationExamples: e.target.value.split("\n") })} rows={2} />
              <Input label="Severity Range (comma separated)" value={newRule.severityRange.join(", ")} onChange={(e) => setNewRule({ ...newRule, severityRange: e.target.value.split(",").map((s) => s.trim()) })} placeholder="LOW, MEDIUM, HIGH" />
              <Input label="Default Actions (comma separated)" value={newRule.defaultActions.join(", ")} onChange={(e) => setNewRule({ ...newRule, defaultActions: e.target.value.split(",").map((s) => s.trim()) })} placeholder="WARNING, TEMP_MUTE_1H" />
              <Textarea label="Context Notes" value={newRule.contextNotes} onChange={(e) => setNewRule({ ...newRule, contextNotes: e.target.value })} rows={2} />
              {error && <div className="text-sm text-danger-red font-stamp">{error}</div>}
              <div className="flex gap-3">
                <Button variant="primary" onClick={handleAddRule} disabled={submitting || !newRule.title}>
                  {submitting ? "Saving to GenLayer…" : "Add Rule"}
                </Button>
                <Button variant="ghost" onClick={() => { setShowRuleForm(false); setError(null); }}>Cancel</Button>
              </div>
            </CardBody>
          </Card>
        )}

        {rules.length === 0 ? (
          <div className="border-2 border-dashed border-border-ink p-12 text-center">
            <BookOpen size={32} className="text-muted-ink mx-auto mb-3" />
            <div className="font-heading font-bold text-ink mb-1">No rules yet</div>
            <div className="font-body text-sm text-muted-ink">Add rules to define what your community considers a violation.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="border-2 border-ink bg-panel-cream">
                <button
                  className="w-full flex items-center justify-between p-4 text-left"
                  onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-judgement-blue" />
                    <div>
                      <div className="font-heading font-bold text-sm">{rule.title}</div>
                      <div className="font-mono text-xs text-muted-ink">{rule.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rule.severityRange.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                    {expandedRule === rule.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </button>
                {expandedRule === rule.id && (
                  <div className="px-4 pb-4 border-t-2 border-ink space-y-3 pt-3">
                    <p className="font-body text-sm text-ink">{rule.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="font-stamp text-xs uppercase tracking-widest text-success-green mb-2">Allowed Examples</div>
                        <ul className="space-y-1">{rule.allowedExamples.filter(Boolean).map((e, i) => <li key={i} className="text-xs font-body text-muted-ink">✓ {e}</li>)}</ul>
                      </div>
                      <div>
                        <div className="font-stamp text-xs uppercase tracking-widest text-danger-red mb-2">Violation Examples</div>
                        <ul className="space-y-1">{rule.violationExamples.filter(Boolean).map((e, i) => <li key={i} className="text-xs font-body text-muted-ink">✗ {e}</li>)}</ul>
                      </div>
                    </div>
                    <div>
                      <div className="font-stamp text-xs uppercase tracking-widest text-muted-ink mb-1">Default Actions</div>
                      <div className="flex gap-2 flex-wrap">{rule.defaultActions.map((a) => <Badge key={a} variant="blue">{a}</Badge>)}</div>
                    </div>
                    {rule.contextNotes && (
                      <div>
                        <div className="font-stamp text-xs uppercase tracking-widest text-muted-ink mb-1">Context Notes</div>
                        <div className="font-body text-xs text-muted-ink italic">{rule.contextNotes}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
