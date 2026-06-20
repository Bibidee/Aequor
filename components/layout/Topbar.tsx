"use client";

import { useWallet } from "@/lib/context/WalletContext";
import { shortAddress } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { Wallet, Zap } from "lucide-react";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { address, isConnecting, connect, disconnect } = useWallet();

  return (
    <header className="h-14 border-b-2 border-ink bg-canvas flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 bg-signal-lime" />
        <div>
          <h1 className="font-heading font-bold text-sm text-ink leading-none">{title}</h1>
          {subtitle && <p className="text-xs text-muted-ink font-body mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {address ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 border-2 border-success-green bg-panel-cream px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse" />
              <span className="font-stamp text-xs text-ink">{shortAddress(address)}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <Button variant="lime" size="sm" onClick={connect} disabled={isConnecting}>
            <Wallet size={14} />
            {isConnecting ? "Connecting…" : "Connect Wallet"}
          </Button>
        )}
        <div className="flex items-center gap-1 border-2 border-judgement-blue px-2 py-1">
          <Zap size={10} className="text-judgement-blue" />
          <span className="text-[10px] font-stamp text-judgement-blue uppercase">GenLayer</span>
        </div>
      </div>
    </header>
  );
}
