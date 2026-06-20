"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAequor } from "@/lib/context/AequorContext";
import { CaseTicket } from "@/components/cases/CaseTicket";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Scale } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function ArbitrationPage() {
  const { cases } = useAequor();

  const open = cases.filter((c) => ["SUBMITTED", "UNDER_REVIEW"].includes(c.status));
  const ruled = cases.filter((c) => c.status === "RULED");
  const appealed = cases.filter((c) => ["APPEALED", "APPEAL_REVERSED", "APPEAL_REDUCED"].includes(c.status));

  return (
    <AppShell title="Arbitration" subtitle="Case review and verdict console">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Open" value={open.length} accent="blue" />
          <StatCard label="Ruled" value={ruled.length} accent="green" />
          <StatCard label="Appealed" value={appealed.length} accent="purple" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-stamp text-xs uppercase tracking-widest text-muted-ink">All Cases</div>
            <Link href="/intake"><Button variant="lime" size="sm">+ New Case</Button></Link>
          </div>
          {cases.length === 0 ? (
            <EmptyState
              title="No cases yet"
              description="Submit a moderation case to begin GenLayer arbitration."
              icon={<Scale size={32} />}
              action={<Link href="/intake"><Button variant="primary">Submit Case</Button></Link>}
            />
          ) : (
            <div className="space-y-2">
              {cases.map((c) => <CaseTicket key={c.id} case_={c} />)}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
