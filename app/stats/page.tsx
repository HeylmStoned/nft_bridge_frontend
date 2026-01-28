"use client";

import { Header } from "../../components/Header";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Rabbit,
  Users,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";

/** Stats are fetched via our API proxy (/api/stats) so the backend URL and key stay server-side. */
type StatsResponse = {
  bridges: { completed: number; pending: number; failed: number; avgTimeSeconds: number };
  tokens: { uniqueBridged: number };
  users: { unique: number };
};

type RecentRow = {
  token_id: string;
  chain: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  unlock_tx_hash: string | null;
  duration_seconds: number | null;
};

async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch("/api/stats");
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

async function fetchRecent(): Promise<RecentRow[]> {
  const res = await fetch("/api/stats/recent?limit=15");
  if (!res.ok) throw new Error("Failed to fetch recent");
  return res.json();
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${(seconds / 60).toFixed(1)}m`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  if (diffM < 1) return "just now";
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString();
}

export default function StatsPage() {
  const { data: stats, isPending: statsPending, error: statsError } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  const { data: recent = [], isPending: recentPending } = useQuery({
    queryKey: ["stats-recent"],
    queryFn: fetchRecent,
  });

  return (
    <div className="app-shell">
      <div className="fixed bottom-0 right-0 z-50 pointer-events-none hidden md:block">
        <Image
          src="/bunn1.png"
          alt=""
          width={600}
          height={600}
          className="opacity-90"
        />
      </div>

      <Header active="stats" />

      <main className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-10 px-4 sm:px-6 py-6 sm:py-10 fade-in relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-5 hidden md:block">
          <Image
            src="/bunn1.png"
            alt=""
            width={200}
            height={200}
            className="absolute -left-20 top-20 rotate-12"
            style={{ filter: "grayscale(100%)" }}
          />
        </div>

        <section className="space-y-4 sm:space-y-6">
          <span className="badge">Stats</span>
          <h1 className="hero-title text-3xl sm:text-4xl leading-tight">
            Bridge stats
          </h1>
          <p className="hero-subtitle text-sm sm:text-base">
            How many Bad Bunnz have been bridged and recent activity.
          </p>
        </section>

        {statsError && (
          <div className="grid-surface text-red-700 bg-red-50/80 border-red-200" role="alert">
            <p>Could not load stats. The bridge API may be unavailable.</p>
          </div>
        )}

        {(statsPending || stats) && (
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid-surface rounded-2xl border border-black/10 bg-white/90 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-500">
                <Rabbit className="h-3.5 w-3.5" />
                Bunnz bridged
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-semibold tabular-nums">
                {statsPending ? "—" : stats?.tokens.uniqueBridged ?? 0}
              </p>
            </div>
            <div className="grid-surface rounded-2xl border border-black/10 bg-white/90 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-semibold tabular-nums text-emerald-700">
                {statsPending ? "—" : stats?.bridges.completed ?? 0}
              </p>
            </div>
            <div className="grid-surface rounded-2xl border border-black/10 bg-white/90 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                Pending
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-semibold tabular-nums text-amber-700">
                {statsPending ? "—" : stats?.bridges.pending ?? 0}
              </p>
            </div>
            <div className="grid-surface rounded-2xl border border-black/10 bg-white/90 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-500">
                <Users className="h-3.5 w-3.5" />
                Unique users
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-semibold tabular-nums">
                {statsPending ? "—" : stats?.users.unique ?? 0}
              </p>
            </div>
          </div>
        )}

        {stats && (
          <div className="grid-surface rounded-2xl border border-black/10 bg-white/90 p-4 sm:p-5 shadow-sm max-w-md">
            <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-500">
              <BarChart3 className="h-3.5 w-3.5" />
              Avg bridge time
            </div>
            <p className="mt-2 text-xl font-semibold tabular-nums">
              {stats.bridges.avgTimeSeconds > 0
                ? `${stats.bridges.avgTimeSeconds.toFixed(1)}s`
                : "—"}
            </p>
            {stats.bridges.failed > 0 && (
              <p className="mt-2 text-sm text-slate-500 flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                {stats.bridges.failed} failed
              </p>
            )}
          </div>
        )}

        <div className="grid-surface">
            <h2 className="text-lg font-semibold mb-4">Recent activity</h2>
            {recentPending ? (
              <p className="text-slate-500 text-sm">Loading…</p>
            ) : recent.length === 0 ? (
              <p className="text-slate-500 text-sm">No bridge activity yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wider text-slate-500">
                      <th className="pb-2 pr-4">Token</th>
                      <th className="pb-2 pr-4">Chain</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Duration</th>
                      <th className="pb-2">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((row, i) => (
                      <tr key={`${row.token_id}-${row.chain}-${i}`} className="border-b border-black/5">
                        <td className="py-2 pr-4 font-mono">#{row.token_id}</td>
                        <td className="py-2 pr-4">{row.chain}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={
                              row.status === "unlocked"
                                ? "text-emerald-600"
                                : row.status === "failed"
                                  ? "text-red-600"
                                  : "text-amber-600"
                            }
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2 pr-4 tabular-nums">{formatDuration(row.duration_seconds)}</td>
                        <td className="py-2 text-slate-500">{formatDate(row.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
      </main>
    </div>
  );
}
