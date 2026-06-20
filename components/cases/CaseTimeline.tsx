import type { ModerationCase } from "@/lib/genlayer/types";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

interface TimelineEvent {
  label: string;
  date?: string;
  done: boolean;
  active?: boolean;
  color?: string;
}

export function CaseTimeline({ case_ }: { case_: ModerationCase }) {
  const s = case_.status;
  const events: TimelineEvent[] = [
    {
      label: "Report Submitted",
      date: case_.submittedAt,
      done: true,
    },
    {
      label: "Under GenLayer Review",
      done: ["RULED", "APPEALED", "APPEAL_REVERSED", "APPEAL_REDUCED", "CLOSED"].includes(s),
      active: s === "UNDER_REVIEW",
    },
    {
      label: "Verdict Issued",
      date: case_.verdict?.reviewedAt,
      done: ["RULED", "APPEALED", "APPEAL_REVERSED", "APPEAL_REDUCED", "CLOSED"].includes(s),
      active: s === "RULED",
    },
    {
      label: "Appeal Filed",
      done: ["APPEAL_REVERSED", "APPEAL_REDUCED", "CLOSED"].includes(s),
      active: s === "APPEALED",
      color: "appeal",
    },
    {
      label: "Appeal Reviewed",
      done: ["APPEAL_REVERSED", "APPEAL_REDUCED", "CLOSED"].includes(s),
      active: s === "APPEAL_REVERSED" || s === "APPEAL_REDUCED",
      color: "appeal",
    },
    {
      label: "Closed",
      done: s === "CLOSED",
      active: false,
    },
  ];

  return (
    <div className="space-y-0">
      {events.map((ev, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-3 h-3 border-2 rounded-full shrink-0 mt-0.5",
              ev.done && ev.color === "appeal" ? "bg-appeal-purple border-appeal-purple" :
              ev.done ? "bg-judgement-blue border-judgement-blue" :
              ev.active && ev.color === "appeal" ? "bg-appeal-purple/40 border-appeal-purple animate-pulse" :
              ev.active ? "bg-signal-lime border-signal-lime animate-pulse" :
              "bg-canvas border-border-ink"
            )} />
            {i < events.length - 1 && (
              <div className={cn("w-0.5 h-6", ev.done ? "bg-border-ink" : "bg-border-ink/30")} />
            )}
          </div>
          <div className="pb-3">
            <div className={cn(
              "text-xs font-stamp uppercase tracking-widest",
              ev.done ? "text-ink" : "text-muted-ink"
            )}>
              {ev.label}
            </div>
            {ev.date && <div className="text-xs font-body text-muted-ink">{formatDate(ev.date)}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
