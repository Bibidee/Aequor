"use client";

import { cn } from "@/lib/utils/cn";
import { Zap } from "lucide-react";

interface ValidatorTapeProps {
  status: "idle" | "pending" | "finalized" | "error";
  txHash?: string;
  className?: string;
}

const VALIDATORS = ["V-1", "V-2", "V-3", "V-4", "V-5"];

export function ValidatorTape({ status, txHash, className }: ValidatorTapeProps) {
  return (
    <div className={cn("border-2 border-ink bg-deep-panel p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className="text-signal-lime" />
        <span className="font-stamp text-xs uppercase tracking-widest text-canvas">GenLayer Validator Trace</span>
        <span className={cn(
          "ml-auto font-stamp text-xs uppercase tracking-widest px-2 py-0.5 border",
          status === "idle" && "text-canvas/40 border-canvas/20",
          status === "pending" && "text-signal-lime border-signal-lime animate-pulse",
          status === "finalized" && "text-success-green border-success-green",
          status === "error" && "text-danger-red border-danger-red",
        )}>
          {status === "idle" ? "Awaiting Review" : status === "pending" ? "Consensus In Progress…" : status === "finalized" ? "Consensus Finalized" : "Error"}
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {VALIDATORS.map((v, i) => (
          <div key={v} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className={cn(
              "w-10 h-10 border-2 flex items-center justify-center font-stamp text-xs font-bold",
              status === "idle" && "border-canvas/20 text-canvas/30",
              status === "pending" && i <= 2 && "border-signal-lime text-signal-lime animate-pulse-lime",
              status === "pending" && i > 2 && "border-canvas/20 text-canvas/30",
              status === "finalized" && "border-success-green text-success-green",
              status === "error" && "border-danger-red text-danger-red",
            )}>
              {v}
            </div>
            <span className={cn(
              "text-[9px] font-stamp uppercase",
              status === "finalized" ? "text-success-green" : "text-canvas/30"
            )}>
              {status === "finalized" ? "✓" : status === "pending" && i <= 2 ? "…" : "—"}
            </span>
          </div>
        ))}

        <div className="flex-1 h-0.5 bg-canvas/10 mx-2" />
        <div className={cn(
          "px-3 py-2 border-2 font-stamp text-xs shrink-0",
          status === "finalized" ? "border-signal-lime text-signal-lime bg-signal-lime/10" : "border-canvas/20 text-canvas/30"
        )}>
          {status === "finalized" ? "CONSENSUS" : "PENDING"}
        </div>
      </div>

      {txHash && (
        <div className="mt-3 pt-3 border-t border-canvas/10 flex items-center gap-2">
          <span className="text-[10px] font-stamp uppercase text-canvas/30">TX</span>
          <a
            href={`https://explorer-studio.genlayer.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-signal-lime hover:underline truncate"
            title={txHash}
          >
            {txHash}
          </a>
        </div>
      )}
    </div>
  );
}
