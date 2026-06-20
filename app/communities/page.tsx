"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAequor } from "@/lib/context/AequorContext";
import { useWallet } from "@/lib/context/WalletContext";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/dates";
import { generateId } from "@/lib/utils/format";
import { nowIso } from "@/lib/utils/dates";
import type { Community } from "@/lib/genlayer/types";
import { Users, Plus } from "lucide-react";
import { getClient } from "@/lib/genlayer/client";
import { getContractAddress } from "@/lib/genlayer/contract";

const CATEGORIES = [
  { value: "GAME", label: "Game / Esports" },
  { value: "FORUM", label: "Forum / Discussion" },
  { value: "DAO", label: "DAO / Web3 Community" },
  { value: "CREATOR", label: "Creator Community" },
  { value: "EDUCATION", label: "Education" },
  { value: "MARKETPLACE", label: "Marketplace" },
  { value: "OTHER", label: "Other" },
];

const STYLES = [
  { value: "STRICT", label: "Strict" },
  { value: "BALANCED", label: "Balanced" },
  { value: "RESTORATIVE", label: "Restorative" },
  { value: "COMPETITIVE", label: "Competitive" },
  { value: "CHILD_SAFE", label: "Child-Safe" },
];

export default function CommunitiesPage() {
  const { communities, addCommunity, setActiveCommunityId } = useAequor();
  const { address } = useWallet();
  const [showForm, setShowForm] = useState(communities.length === 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: "GAME",
    moderationStyle: "BALANCED",
    appealWindowHours: "72",
  });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    if (!address) { setError("Connect your wallet to register a community on-chain."); return; }
    setSubmitting(true);
    setError(null);
    const id = generateId("comm");
    const community: Community = {
      id,
      owner: address,
      name: form.name.trim(),
      category: form.category as Community["category"],
      moderationStyle: form.moderationStyle as Community["moderationStyle"],
      rulebookHash: "",
      appealWindowHours: parseInt(form.appealWindowHours) || 72,
      createdAt: nowIso(),
    };

    try {
      const client = getClient();
      const contractAddr = getContractAddress();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client as any).writeContract({
        address: contractAddr,
        functionName: "register_community",
        args: [id, JSON.stringify({ name: community.name, category: community.category, moderationStyle: community.moderationStyle, appealWindowHours: community.appealWindowHours }), ""],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed. Check your wallet and network.");
      setSubmitting(false);
      return;
    }

    addCommunity(community);
    setActiveCommunityId(id);
    setShowForm(false);
    setForm({ name: "", category: "GAME", moderationStyle: "BALANCED", appealWindowHours: "72" });
    setSubmitting(false);
  };

  return (
    <AppShell title="Communities" subtitle="Register and manage community profiles">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="font-stamp text-xs uppercase tracking-widest text-muted-ink">{communities.length} communities registered</div>
          <Button variant="lime" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> New Community
          </Button>
        </div>

        {showForm && (
          <Card variant="lime-accent">
            <CardHeader>
              <span className="font-stamp text-xs uppercase tracking-widest">Register Community</span>
            </CardHeader>
            <CardBody className="space-y-4">
              <Input label="Community Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Arena Guild" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORIES} />
                <Select label="Moderation Style" value={form.moderationStyle} onChange={(e) => setForm({ ...form, moderationStyle: e.target.value })} options={STYLES} />
                <Input label="Appeal Window (hours)" type="number" value={form.appealWindowHours} onChange={(e) => setForm({ ...form, appealWindowHours: e.target.value })} />
              </div>
              {error && <div className="text-sm text-danger-red font-stamp">{error}</div>}
              <div className="flex gap-3">
                <Button variant="primary" onClick={handleCreate} disabled={submitting || !form.name.trim()}>
                  {submitting ? "Registering…" : "Register Community"}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardBody>
          </Card>
        )}

        {communities.length === 0 && !showForm && (
          <div className="border-2 border-dashed border-signal-lime bg-panel-cream p-10 text-center space-y-4">
            <Users size={40} className="mx-auto text-signal-lime" />
            <div className="font-heading font-bold text-lg text-ink">Register your first community</div>
            <div className="font-body text-sm text-muted-ink max-w-sm mx-auto">
              Every case needs a community and rulebook. Start here — register your community, then add your moderation rules before submitting cases.
            </div>
            <Button variant="lime" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Register Community
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {communities.map((c) => (
            <Card key={c.id} className="hover:border-judgement-blue transition-colors cursor-pointer" onClick={() => setActiveCommunityId(c.id)}>
              <CardBody>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 border-2 border-ink bg-canvas flex items-center justify-center shrink-0">
                    <Users size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-bold text-sm">{c.name}</span>
                      <Badge variant="outline">{c.category}</Badge>
                      <Badge variant="grey">{c.moderationStyle}</Badge>
                    </div>
                    <div className="font-mono text-xs text-muted-ink mt-1">{c.id}</div>
                    <div className="text-xs text-muted-ink font-body mt-1">
                      Appeal window: {c.appealWindowHours}h · Registered {formatDate(c.createdAt)}
                    </div>
                    {c.rulebookHash && (
                      <div className="font-mono text-[10px] text-muted-ink mt-1 truncate">
                        Rulebook: {c.rulebookHash}
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
