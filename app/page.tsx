"use client";

import Link from "next/link";
import { useWallet } from "@/lib/context/WalletContext";
import { Button } from "@/components/ui/Button";
import { Scale, BookOpen, ArrowRight, Zap, Shield, Eye, CheckCircle, AlertTriangle } from "lucide-react";

export default function LandingPage() {
  const { address, connect, isConnecting } = useWallet();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Top nav */}
      <nav className="border-b-2 border-ink px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-signal-lime border-2 border-ink flex items-center justify-center">
            <span className="font-stamp font-bold text-ink text-sm">Æ</span>
          </div>
          <span className="font-heading font-bold text-ink text-lg tracking-wide">AEQUOR</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/overview" className="font-stamp text-xs uppercase tracking-widest text-muted-ink hover:text-ink transition-colors">Console</Link>
          <Link href="/playground" className="font-stamp text-xs uppercase tracking-widest text-muted-ink hover:text-ink transition-colors">Playground</Link>
          {address ? (
            <Link href="/overview"><Button variant="lime" size="sm">Launch Console</Button></Link>
          ) : (
            <Button variant="lime" size="sm" onClick={connect} disabled={isConnecting}>
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </Button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="px-8 py-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 border-2 border-judgement-blue px-3 py-1 mb-6">
              <Zap size={12} className="text-judgement-blue" />
              <span className="font-stamp text-xs uppercase tracking-widest text-judgement-blue">GenLayer-Native · Studionet</span>
            </div>
            <h1 className="font-heading font-bold text-5xl lg:text-6xl text-ink leading-tight mb-6">
              Moderation rulings people can actually understand.
            </h1>
            <p className="font-body text-lg text-muted-ink leading-relaxed mb-8 max-w-md">
              Aequor uses GenLayer consensus to review community and game moderation cases against written rulebooks, producing transparent decisions, appeal trails, and consistency metrics.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/overview">
                <Button variant="primary" size="lg">Launch Console <ArrowRight size={16} /></Button>
              </Link>
              <Link href="/playground">
                <Button variant="outline" size="lg">View Demo</Button>
              </Link>
            </div>
          </div>

          {/* Hero verdict card mock */}
          <div className="relative">
            <div className="border-2 border-ink bg-deep-panel p-6 space-y-4 transform rotate-1">
              <div className="flex items-center gap-2 border-b border-canvas/10 pb-3">
                <Zap size={12} className="text-signal-lime" />
                <span className="font-stamp text-xs uppercase tracking-widest text-canvas/60">GenLayer Validator Trace</span>
                <span className="ml-auto font-stamp text-xs text-success-green border border-success-green px-2">CONSENSUS</span>
              </div>
              <div className="border-4 border-danger-red px-6 py-3 font-stamp font-bold text-xl uppercase tracking-widest text-danger-red text-center">
                VIOLATION FOUND
              </div>
              <div className="space-y-2">
                {[
                  ["Rule Matched", "harassment.targeted_insult"],
                  ["Severity", "MEDIUM"],
                  ["Action", "TEMP_MUTE_24H"],
                  ["Confidence", "82%"],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-xs font-stamp">
                    <span className="text-canvas/40 uppercase">{label}</span>
                    <span className="text-canvas/80">{val}</span>
                  </div>
                ))}
              </div>
              <div className="border border-canvas/10 p-3 text-xs font-body text-canvas/50 italic">
                "The submitted messages directly target another player with repeated insults after a prior warning…"
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={12} className="text-appeal-purple" />
                <span className="text-xs font-stamp text-appeal-purple uppercase tracking-widest">Appeal Available</span>
              </div>
            </div>
            <div className="absolute -bottom-3 -right-3 border-2 border-signal-lime bg-signal-lime px-3 py-1 font-stamp text-xs font-bold text-ink uppercase transform -rotate-1">
              Statement of Reasons →
            </div>
          </div>
        </div>
      </section>

      {/* Problem section */}
      <section className="border-t-2 border-b-2 border-ink py-16 bg-deep-panel">
        <div className="px-8 max-w-6xl mx-auto">
          <div className="text-xs font-stamp uppercase tracking-widest text-canvas/40 mb-3">The Problem</div>
          <h2 className="font-heading font-bold text-3xl text-canvas mb-8">Moderation needs reasons, not black boxes.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Scale, title: "Due Process", text: "Users deserve to know which rule was applied, why the action was proportional, and how to appeal." },
              { icon: BookOpen, title: "Rulebook-Linked", text: "Every decision must link back to a specific community rule. No vague 'violated terms of service'." },
              { icon: Eye, title: "Consistency", text: "Identical situations should receive proportional treatment. Drift must be detectable and correctable." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="border border-canvas/10 p-5 bg-canvas/5">
                <Icon size={20} className="text-signal-lime mb-3" />
                <h3 className="font-heading font-bold text-canvas mb-2">{title}</h3>
                <p className="font-body text-sm text-canvas/60 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GenLayer section */}
      <section className="py-16 border-b-2 border-ink">
        <div className="px-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-xs font-stamp uppercase tracking-widest text-judgement-blue mb-3">GenLayer Arbitration</div>
            <h2 className="font-heading font-bold text-3xl text-ink mb-4">AI-validator consensus replaces guesswork.</h2>
            <p className="font-body text-muted-ink leading-relaxed mb-6">
              GenLayer Intelligent Contracts interpret your community rulebook, evaluate submitted evidence, and produce structured rulings through validator consensus — not a single AI decision.
            </p>
            <ul className="space-y-3">
              {[
                "Was the rule actually violated?",
                "Was the enforcement action proportional?",
                "Does the appeal introduce enough new context?",
                "Is this report malicious or low-quality?",
                "Is the ruling consistent with prior cases?",
              ].map((q) => (
                <li key={q} className="flex items-center gap-2 text-sm font-body text-ink">
                  <CheckCircle size={14} className="text-judgement-blue shrink-0" />
                  {q}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-2 border-judgement-blue p-6 bg-panel-cream space-y-3">
            <div className="font-stamp text-xs uppercase tracking-widest text-judgement-blue mb-4">GenLayer Contract Methods</div>
            {[
              ["review_case()", "Evaluates case against rulebook"],
              ["review_appeal()", "Reviews appeal with new context"],
              ["review_report_quality()", "Flags malicious reports"],
              ["compare_case_consistency()", "Checks for policy drift"],
            ].map(([method, desc]) => (
              <div key={method} className="flex items-start gap-3 border border-border-ink p-2.5 bg-canvas">
                <span className="font-mono text-xs text-judgement-blue shrink-0">{method}</span>
                <span className="font-body text-xs text-muted-ink">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="px-8 max-w-6xl mx-auto text-center">
          <h2 className="font-heading font-bold text-4xl text-ink mb-4">
            Fair moderation should have reasons, appeals, and consistency.
          </h2>
          <p className="font-body text-muted-ink mb-8">Aequor brings GenLayer consensus to community and game moderation disputes.</p>
          <div className="flex items-center gap-4 justify-center flex-wrap">
            <Link href="/overview"><Button variant="primary" size="lg">Launch Console <ArrowRight size={16} /></Button></Link>
            <Link href="/playground"><Button variant="outline" size="lg">Open Playground</Button></Link>
          </div>
        </div>
      </section>

      <footer className="border-t-2 border-ink px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-signal-lime border border-ink flex items-center justify-center">
            <span className="font-stamp text-ink text-[10px]">Æ</span>
          </div>
          <span className="font-stamp text-xs text-muted-ink uppercase tracking-widest">Aequor · GenLayer-Native Moderation Arbitration</span>
        </div>
        <div className="flex items-center gap-1">
          <Shield size={12} className="text-muted-ink" />
          <span className="font-stamp text-xs text-muted-ink uppercase">No external AI · No tokens · Rulebook-linked</span>
        </div>
      </footer>
    </div>
  );
}
