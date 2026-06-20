"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileInput,
  Scale,
  ArrowLeftRight,
  BarChart2,
  Eye,
  FlaskConical,
  Settings,
} from "lucide-react";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/communities", label: "Communities", icon: Users },
  { href: "/rulebooks", label: "Rulebooks", icon: BookOpen },
  { href: "/intake", label: "Case Intake", icon: FileInput },
  { href: "/arbitration", label: "Arbitration", icon: Scale },
  { href: "/appeals", label: "Appeals", icon: ArrowLeftRight },
  { href: "/consistency", label: "Consistency", icon: BarChart2 },
  { href: "/transparency", label: "Transparency", icon: Eye },
  { href: "/playground", label: "Playground", icon: FlaskConical },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-deep-panel border-r-2 border-ink flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 px-4 py-4 border-b-2 border-ink/40">
        <div className="w-7 h-7 bg-signal-lime border-2 border-ink flex items-center justify-center">
          <span className="font-stamp font-bold text-ink text-xs">Æ</span>
        </div>
        <span className="font-heading font-bold text-canvas text-sm tracking-wide">AEQUOR</span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-xs font-stamp uppercase tracking-widest transition-colors",
                active
                  ? "bg-signal-lime text-ink border-r-3 border-signal-lime"
                  : "text-canvas/60 hover:text-canvas hover:bg-white/5"
              )}
            >
              <Icon size={14} strokeWidth={active ? 2.5 : 1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* GenLayer tag */}
      <div className="px-4 py-3 border-t-2 border-ink/40">
        <div className="text-[10px] font-stamp text-canvas/30 uppercase tracking-widest">
          Powered by GenLayer
        </div>
      </div>
    </aside>
  );
}
