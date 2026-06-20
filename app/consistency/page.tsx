"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAequor } from "@/lib/context/AequorContext";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge, DecisionBadge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { timeAgo } from "@/lib/utils/dates";
import { BarChart2, AlertTriangle } from "lucide-react";

export default function ConsistencyPage() {
  const { cases, appeals } = useAequor();

  const ruledCases = cases.filter((c) => c.verdict);
  const reversals = appeals.filter((a) => a.outcome?.outcome === "REVERSED" || a.outcome?.outcome === "REDUCED");

  // Group by rule
  const byRule: Record<string, typeof ruledCases> = {};
  for (const c of ruledCases) {
    const key = c.selectedRuleId;
    if (!byRule[key]) byRule[key] = [];
    byRule[key].push(c);
  }

  // Decision distribution per rule
  const ruleStats = Object.entries(byRule).map(([ruleId, ruleCases]) => {
    const decisions: Record<string, number> = {};
    for (const c of ruleCases) {
      const d = c.verdict!.decision;
      decisions[d] = (decisions[d] ?? 0) + 1;
    }
    const violationRate = Math.round(((decisions["VIOLATION_FOUND"] ?? 0) / ruleCases.length) * 100);
    return { ruleId, count: ruleCases.length, decisions, violationRate };
  });

  const ambiguousRules = ruleStats.filter((r) => r.decisions["POLICY_AMBIGUOUS"] > 0 || r.decisions["INSUFFICIENT_CONTEXT"] > 0);

  return (
    <AppShell title="Consistency" subtitle="Cross-case fairness and policy drift analysis">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Ruled Cases" value={ruledCases.length} accent="blue" />
          <StatCard label="Unique Rules Applied" value={Object.keys(byRule).length} accent="default" />
          <StatCard label="Appeal Reversals" value={reversals.length} accent={reversals.length > 0 ? "coral" : "green"} />
          <StatCard label="Ambiguous Rules" value={ambiguousRules.length} accent={ambiguousRules.length > 0 ? "coral" : "green"} />
        </div>

        {ambiguousRules.length > 0 && (
          <div className="border-2 border-warning-coral p-4 bg-panel-cream flex items-start gap-3">
            <AlertTriangle size={16} className="text-warning-coral shrink-0 mt-0.5" />
            <div>
              <div className="font-stamp text-xs uppercase tracking-widest text-warning-coral mb-2">Policy Ambiguity Alerts</div>
              {ambiguousRules.map((r) => (
                <div key={r.ruleId} className="font-body text-sm text-ink">
                  <Badge variant="coral">{r.ruleId}</Badge> — {r.decisions["POLICY_AMBIGUOUS"] ?? 0} ambiguous, {r.decisions["INSUFFICIENT_CONTEXT"] ?? 0} insufficient context
                </div>
              ))}
            </div>
          </div>
        )}

        {ruleStats.length === 0 ? (
          <div className="border-2 border-dashed border-border-ink p-12 text-center">
            <BarChart2 size={32} className="text-muted-ink mx-auto mb-3" />
            <div className="font-heading font-bold">No ruled cases yet</div>
            <div className="font-body text-sm text-muted-ink">Submit and review cases to see consistency data.</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="font-stamp text-xs uppercase tracking-widest text-muted-ink">Rule Outcome Spread</div>
            {ruleStats.map((rs) => (
              <Card key={rs.ruleId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="blue">{rs.ruleId}</Badge>
                      <span className="font-stamp text-xs text-muted-ink uppercase">{rs.count} cases</span>
                    </div>
                    <span className="font-stamp text-xs text-ink">
                      Violation rate: <span className="font-bold">{rs.violationRate}%</span>
                    </span>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="flex gap-3 flex-wrap mb-4">
                    {Object.entries(rs.decisions).map(([decision, count]) => (
                      <div key={decision} className="flex items-center gap-1.5">
                        <DecisionBadge decision={decision} />
                        <span className="font-stamp text-xs text-muted-ink">×{count}</span>
                      </div>
                    ))}
                  </div>
                  {/* Visual bar */}
                  <div className="h-3 bg-border-ink/20 border border-border-ink overflow-hidden">
                    {Object.entries(rs.decisions).map(([decision, count]) => {
                      const pct = (count / rs.count) * 100;
                      const color = decision === "VIOLATION_FOUND" ? "bg-danger-red" :
                        decision === "NO_VIOLATION" ? "bg-success-green" :
                        decision === "POLICY_AMBIGUOUS" ? "bg-appeal-purple" :
                        "bg-dismiss-grey";
                      return <div key={decision} className={`h-full inline-block ${color}`} style={{ width: `${pct}%` }} />;
                    })}
                  </div>

                  {/* Similar cases */}
                  <div className="mt-4 space-y-2">
                    {byRule[rs.ruleId].map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs border border-border-ink p-2 bg-canvas">
                        <span className="font-mono text-muted-ink">{c.id}</span>
                        {c.verdict && <DecisionBadge decision={c.verdict.decision} />}
                        <span className="text-muted-ink font-body">{timeAgo(c.submittedAt)}</span>
                      </div>
                    ))}
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
