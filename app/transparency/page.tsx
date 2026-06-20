"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAequor } from "@/lib/context/AequorContext";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Eye } from "lucide-react";

const COLORS = ["#C7372F", "#2E9D68", "#8B8A84", "#7A3FFC", "#FF6B4A"];

export default function TransparencyPage() {
  const { cases, appeals } = useAequor();

  const total = cases.length;
  const ruled = cases.filter((c) => c.verdict).length;
  const appealCount = appeals.length;
  const reversals = appeals.filter((a) => a.outcome?.outcome === "REVERSED").length;
  const reductions = appeals.filter((a) => a.outcome?.outcome === "REDUCED").length;
  const escalations = cases.filter((c) => c.verdict?.decision === "NEEDS_HUMAN_ESCALATION").length;
  const ambiguous = cases.filter((c) => c.verdict?.decision === "POLICY_AMBIGUOUS").length;

  const appealRate = total > 0 ? Math.round((appealCount / total) * 100) : 0;
  const reversalRate = appealCount > 0 ? Math.round(((reversals + reductions) / appealCount) * 100) : 0;

  // By rule
  const byRule: Record<string, { total: number; violations: number }> = {};
  for (const c of cases) {
    if (!byRule[c.selectedRuleId]) byRule[c.selectedRuleId] = { total: 0, violations: 0 };
    byRule[c.selectedRuleId].total++;
    if (c.verdict?.decision === "VIOLATION_FOUND") byRule[c.selectedRuleId].violations++;
  }
  const ruleChartData = Object.entries(byRule).map(([name, v]) => ({
    name: name.split(".").pop() ?? name,
    fullName: name,
    total: v.total,
    violations: v.violations,
  }));

  // Decision pie
  const decisionCounts: Record<string, number> = {};
  for (const c of cases.filter((c) => c.verdict)) {
    const d = c.verdict!.decision;
    decisionCounts[d] = (decisionCounts[d] ?? 0) + 1;
  }
  const pieData = Object.entries(decisionCounts).map(([name, value]) => ({ name, value }));

  return (
    <AppShell title="Transparency" subtitle="Public aggregate moderation metrics">
      <div className="p-6 space-y-6">
        <div className="border-2 border-success-green p-3 bg-panel-cream flex items-center gap-2">
          <Eye size={14} className="text-success-green" />
          <span className="font-stamp text-xs uppercase tracking-widest text-success-green">
            Public metrics only — no private case details are shown here.
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Reports" value={total} accent="blue" />
          <StatCard label="Ruled Cases" value={ruled} accent="green" />
          <StatCard label="Appeal Rate" value={`${appealRate}%`} accent={appealRate > 20 ? "coral" : "green"} sub={`${appealCount} appeals filed`} />
          <StatCard label="Reversal Rate" value={`${reversalRate}%`} accent={reversalRate > 25 ? "coral" : "green"} sub={`${reversals} reversed, ${reductions} reduced`} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Human Escalations" value={escalations} accent={escalations > 0 ? "coral" : "default"} />
          <StatCard label="Policy Ambiguity" value={ambiguous} accent={ambiguous > 0 ? "purple" : "default"} />
          <StatCard label="Total Appeals" value={appealCount} accent="purple" />
          <StatCard label="Total Communities" value={1} accent="default" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {ruleChartData.length > 0 && (
            <Card>
              <CardHeader><span className="font-stamp text-xs uppercase tracking-widest">Cases by Rule</span></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ruleChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "Space Mono" }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: "#FFF9EC", border: "2px solid #11100E", fontFamily: "Sora" }}
                      labelFormatter={(l) => ruleChartData.find((d) => d.name === l)?.fullName ?? l}
                    />
                    <Bar dataKey="total" fill="#315CFF" name="Total" />
                    <Bar dataKey="violations" fill="#C7372F" name="Violations" />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          )}

          {pieData.length > 0 && (
            <Card>
              <CardHeader><span className="font-stamp text-xs uppercase tracking-widest">Decision Distribution</span></CardHeader>
              <CardBody>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#FFF9EC", border: "2px solid #11100E" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="font-stamp text-xs text-ink">{d.name.replace(/_/g, " ")}</span>
                        <Badge variant="outline">{d.value}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Actions taken */}
        {ruled > 0 && (
          <Card>
            <CardHeader><span className="font-stamp text-xs uppercase tracking-widest">Actions Recommended</span></CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-3">
                {(() => {
                  const actions: Record<string, number> = {};
                  for (const c of cases) {
                    if (c.verdict) {
                      const a = c.verdict.recommendedAction;
                      actions[a] = (actions[a] ?? 0) + 1;
                    }
                  }
                  return Object.entries(actions).map(([action, count]) => (
                    <div key={action} className="border-2 border-ink p-3 bg-canvas text-center min-w-24">
                      <div className="font-stamp text-lg font-bold text-ink">{count}</div>
                      <div className="font-stamp text-[10px] uppercase text-muted-ink">{action.replace(/_/g, " ")}</div>
                    </div>
                  ));
                })()}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
