"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

type NavPage = "bridge" | "stats";

export function Header({ active }: { active?: NavPage }) {
  return (
    <header className="relative border-b border-black/5 bg-white/70 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4">
        <nav className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center sm:justify-start">
          <span className="pill text-xs sm:text-sm">WORLD</span>
          <span className="pill text-xs sm:text-sm">BUNNZIFICATION</span>
          <span className="text-slate-400 hidden sm:inline">·</span>
          <Link
            href="/"
            className={`text-xs sm:text-sm font-medium transition-colors ${
              active === "bridge" ? "text-foreground underline" : "text-slate-500 hover:text-foreground"
            }`}
          >
            Bridge
          </Link>
          <Link
            href="/stats"
            className={`text-xs sm:text-sm font-medium transition-colors ${
              active === "stats" ? "text-foreground underline" : "text-slate-500 hover:text-foreground"
            }`}
          >
            Stats
          </Link>
        </nav>
        <ConnectButton />
      </div>
    </header>
  );
}
