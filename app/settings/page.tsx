"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useWallet } from "@/lib/context/WalletContext";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { shortAddress } from "@/lib/utils/format";
import { Wallet, Zap, Shield, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const { address, connect, disconnect, switchNetwork, isConnecting } = useWallet();

  return (
    <AppShell title="Settings" subtitle="Wallet, network, and community defaults">
      <div className="p-6 max-w-xl space-y-6">
        {/* Wallet */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet size={14} />
              <span className="font-stamp text-xs uppercase tracking-widest">Wallet Connection</span>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {address ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success-green" />
                  <span className="font-stamp text-xs uppercase tracking-widest text-success-green">Connected</span>
                </div>
                <div className="border-2 border-ink p-3 font-mono text-sm text-ink">{address}</div>
                <div className="flex gap-3">
                  <Button variant="secondary" size="sm" onClick={switchNetwork}>Switch to GenLayer Studionet</Button>
                  <Button variant="danger" size="sm" onClick={disconnect}>Disconnect</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="font-body text-sm text-muted-ink">Connect an injected wallet (MetaMask, Rabby, or compatible EVM wallet) to interact with the AequorModeration contract on GenLayer Studionet.</div>
                <Button variant="lime" onClick={connect} disabled={isConnecting}>
                  <Wallet size={14} />
                  {isConnecting ? "Connecting…" : "Connect Injected Wallet"}
                </Button>
                <div className="text-xs font-stamp text-muted-ink uppercase">No Privy · No email login · No WalletConnect</div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* GenLayer network */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-judgement-blue" />
              <span className="font-stamp text-xs uppercase tracking-widest">GenLayer Network</span>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="grid grid-cols-1 gap-2 text-sm">
              {[
                ["Network", "GenLayer Studionet"],
                ["Contract", process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || "Not deployed"],
                ["RPC", process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "Default Studionet"],
                ["Chain ID", process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || "Auto"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border border-border-ink p-2 bg-canvas">
                  <span className="font-stamp text-xs uppercase text-muted-ink">{label}</span>
                  <span className="font-mono text-xs text-ink truncate max-w-48">{value}</span>
                </div>
              ))}
            </div>
            <div className="text-xs font-body text-muted-ink">
              Set <span className="font-mono">NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS</span> in <span className="font-mono">.env.local</span> after deploying the AequorModeration contract.
            </div>
          </CardBody>
        </Card>

        {/* Safety */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield size={14} />
              <span className="font-stamp text-xs uppercase tracking-widest">Safety & Abuse Boundaries</span>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="space-y-2">
              {[
                "Raw evidence is never stored on-chain",
                "High-risk content routes to human review",
                "Appeals are always available for ruled cases",
                "AI automation is disclosed in every ruling",
                "No user ranking or shame boards",
                "No external AI APIs — GenLayer only",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm font-body text-ink">
                  <div className="w-1.5 h-1.5 bg-success-green rounded-full shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* High-risk content routing */}
        <div className="border-2 border-warning-coral p-4 bg-panel-cream flex items-start gap-3">
          <AlertTriangle size={16} className="text-warning-coral shrink-0 mt-0.5" />
          <div>
            <div className="font-stamp text-xs uppercase tracking-widest text-warning-coral mb-1">High-Risk Content Policy</div>
            <div className="font-body text-sm text-muted-ink">
              For cases involving severe illegal content categories, Aequor does not render or analyse raw content. Those cases are automatically routed to manual/legal escalation and the system shows:<br />
              <span className="font-mono text-xs text-ink mt-1 block border border-border-ink p-1.5">High-risk evidence withheld. Manual/legal escalation required.</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
