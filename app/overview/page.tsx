"use client";

import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";
import { CaseTicket } from "@/components/cases/CaseTicket";
import { useAequor } from "@/lib/context/AequorContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { Scale } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function OverviewPage() {
  const { cases, appeals } = useAequor();

  const openCases = cases.filter((c) => ["SUBMITTED", "UNDER_REVIEW"].includes(c.status));
  const pendingReviews = cases.filter((c) => c.status === "UNDER_REVIEW");
  const appealsWaiting = appeals.filter((a) => a.status === "SUBMITTED");
  const reversals = appeals.filter((a) => a.outcome?.outcome === "REVERSED" || a.outcome?.outcome === "REDUCED");
  const reversalRate = appeals.length > 0 ? Math.round((reversals.length / appeals.length) * 100) : 0;
  const ruledCases = cases.filter((c) => c.verdict);
  const humanEscalations = ruledCases.filter((c) => c.verdict?.decision === "NEEDS_HUMAN_ESCALATION");

  const recentCases = [...cases].slice(0, 8);

  return (
    <AppShell title="Overview" subtitle="Moderation arbitration console">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Open Cases" value={openCases.length} accent="blue" sub="Submitted or under review" />
          <StatCard label="Pending Reviews" value={pendingReviews.length} accent="lime" sub="Awaiting GenLayer consensus" />
          <StatCard label="Appeals Waiting" value={appealsWaiting.length} accent="purple" sub="Submitted, not yet reviewed" />
          <StatCard label="Reversal Rate" value={`${reversalRate}%`} accent={reversalRate > 30 ? "coral" : "green"} sub={`${reversals.length} of ${appeals.length} appeals`} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Cases" value={cases.length} accent="default" />
          <StatCard label="Ruled Cases" value={ruledCases.length} accent="green" />
          <StatCard label="Human Escalations" value={humanEscalations.length} accent="coral" />
          <StatCard label="Total Appeals" value={appeals.length} accent="purple" />
        </div>

        {/* Case queue */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-signal-lime" />
              <h2 className="font-heading font-bold text-sm uppercase tracking-widest">Live Case Queue</h2>
            </div>
            <Link href="/intake">
              <Button variant="lime" size="sm">+ New Case</Button>
            </Link>
          </div>
          {recentCases.length === 0 ? (
            <EmptyState
              title="No cases yet"
              description="Submit your first moderation case to get started."
              icon={<Scale size={32} />}
              action={<Link href="/intake"><Button variant="primary">Submit Case</Button></Link>}
            />
          ) : (
            <div className="space-y-2">
              {recentCases.map((c) => <CaseTicket key={c.id} case_={c} />)}
            </div>
          )}
        </div>

        {/* Notice */}
        <div className="border-2 border-judgement-blue bg-panel-cream p-4 flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-judgement-blue mt-2 shrink-0" />
          <div>
            <div className="font-stamp text-xs uppercase tracking-widest text-judgement-blue mb-1">GenLayer Note</div>
            <div className="font-body text-sm text-muted-ink">
              Moderation arbitration uses GenLayer AI-validator consensus. Raw evidence is never stored on-chain — only cryptographic hashes and structured summaries. Automation is disclosed in every ruling.
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
