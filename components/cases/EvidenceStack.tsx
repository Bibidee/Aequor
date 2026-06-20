import { Hash, Shield } from "lucide-react";

interface EvidenceStackProps {
  hashes: string[];
  contentType?: string;
}

export function EvidenceStack({ hashes, contentType }: EvidenceStackProps) {
  return (
    <div className="border-2 border-ink bg-deep-panel p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-signal-lime" />
        <span className="font-stamp text-xs uppercase tracking-widest text-canvas">Evidence Stack</span>
        {contentType && (
          <span className="ml-auto font-stamp text-xs text-canvas/50 uppercase">{contentType}</span>
        )}
      </div>
      <div className="text-[10px] font-body text-canvas/50 mb-2">
        Raw evidence is not stored on-chain. Only cryptographic hashes are committed to GenLayer.
      </div>
      <div className="space-y-1.5">
        {hashes.map((h, i) => (
          <div key={i} className="flex items-center gap-2 border border-canvas/10 p-2 bg-canvas/5">
            <Hash size={10} className="text-signal-lime shrink-0" />
            <span className="font-mono text-[10px] text-canvas/70 break-all">{h}</span>
          </div>
        ))}
        {hashes.length === 0 && (
          <div className="text-[10px] font-stamp text-canvas/30 uppercase">No evidence hashes committed</div>
        )}
      </div>
    </div>
  );
}
