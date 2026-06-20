import Link from "next/link";
import type { ModerationCase } from "@/lib/genlayer/types";
import { StatusBadge, DecisionBadge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/utils/dates";
import { FileText, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CaseTicketProps {
  case_: ModerationCase;
  compact?: boolean;
}

export function CaseTicket({ case_, compact }: CaseTicketProps) {
  return (
    <Link href={`/arbitration/${case_.id}`} className={cn(
      "block border-2 border-ink bg-panel-cream hover:bg-canvas transition-colors group",
      compact ? "p-3" : "p-4"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 border-2 border-ink flex items-center justify-center shrink-0 bg-canvas">
            <FileText size={14} className="text-ink" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-stamp text-xs text-muted-ink uppercase tracking-widest">{case_.id}</span>
              <StatusBadge status={case_.status} />
              {case_.verdict && <DecisionBadge decision={case_.verdict.decision} />}
            </div>
            <div className={cn("font-body text-ink mt-1 line-clamp-2", compact ? "text-xs" : "text-sm")}>
              {case_.contextSummary}
            </div>
            {!compact && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs font-stamp text-muted-ink uppercase">{case_.contentType}</span>
                <span className="text-muted-ink">·</span>
                <span className="text-xs font-stamp text-muted-ink uppercase">{case_.selectedRuleId}</span>
                <span className="text-muted-ink">·</span>
                <span className="text-xs font-body text-muted-ink">{timeAgo(case_.submittedAt)}</span>
              </div>
            )}
          </div>
        </div>
        <ArrowRight size={16} className="text-muted-ink shrink-0 group-hover:text-ink transition-colors mt-1" />
      </div>
    </Link>
  );
}
