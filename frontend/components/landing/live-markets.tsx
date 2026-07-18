"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Radio, Clock, CheckCircle2, AlertCircle, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

type Side = { goals: number; corners: number; yellow: number; red: number };
type Score = { running: boolean; minute: number; home: Side; away: Side };
type Fixture = {
  fixtureId: string;
  competition: string;
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  startTime: number;
  isWorldCup: boolean;
  tradeable?: boolean;
  kickingOff?: boolean;
  score?: Score | null;
};
type FeedData = { source: string; live: Fixture[]; upcoming: Fixture[]; finished: Fixture[] };

function kickoff(ms: number): string {
  if (!ms) return "TBD";
  const diff = ms - Date.now();
  if (diff <= 0) return "Kicking off";
  // Within 6 hours: live countdown in hours/minutes.
  if (diff < 6 * 3_600_000) {
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return h > 0 ? `in ${h}h ${m}m` : `in ${Math.max(1, m)}m`;
  }
  // Otherwise: the actual kickoff date & time.
  return new Date(ms).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LiveMarkets() {
  const [data, setData] = useState<FeedData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/fixtures")
        .then((r) => r.json())
        .then((d: FeedData) => alive && setData(d))
        .catch(() => alive && setFailed(true));
    load();
    const id = setInterval(load, 6000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const live = data?.live ?? [];
  const upcoming = data?.upcoming ?? [];
  const finished = data?.finished ?? [];

  return (
    <section id="markets" className="scroll-mt-20 border-y border-border bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-long">
              <Radio className="h-3.5 w-3.5" />
              Live from TxODDS TxLINE
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">World Cup markets</h2>
            <p className="mt-3 text-muted">
              Real fixtures, scores and stats from the TxODDS feed. Trade the live match, or browse what&apos;s next.
            </p>
          </div>
          <Link
            href="/trade"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] brand-gradient px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-long focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Open terminal <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {failed && (
          <div className="mt-10 flex items-center gap-2 rounded-[var(--radius-card)] border border-border bg-background p-6 text-sm text-muted">
            <AlertCircle className="h-4 w-4 text-short" /> Couldn&apos;t load the fixtures feed right now.
          </div>
        )}

        {!failed && !data && <SkeletonGrid />}

        {/* LIVE NOW */}
        {live.length > 0 && (
          <Group icon={<span className="h-2 w-2 rounded-full bg-short animate-live-dot" />} title="Live now">
            <div className="grid gap-4 lg:grid-cols-2">
              {live.map((f) => (
                <LiveCard key={f.fixtureId} f={f} />
              ))}
            </div>
          </Group>
        )}

        {/* UPCOMING */}
        {upcoming.length > 0 && (
          <Group icon={<Clock className="h-4 w-4 text-accent" />} title="Upcoming">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((f) => (
                <UpcomingCard key={f.fixtureId} f={f} />
              ))}
            </div>
          </Group>
        )}

        {/* RESULTS */}
        {finished.length > 0 && (
          <Group icon={<CheckCircle2 className="h-4 w-4 text-muted" />} title="Results">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {finished.map((f) => (
                <ResultCard key={f.fixtureId} f={f} />
              ))}
            </div>
          </Group>
        )}
      </div>
    </section>
  );
}

function Group({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function Badge({ code, tone }: { code: string; tone: "long" | "accent" }) {
  return (
    <span
      className={cn(
        "tnum grid h-11 w-11 place-items-center rounded-[10px] text-xs font-bold",
        tone === "long" ? "bg-long/12 text-long ring-1 ring-long/25" : "bg-accent/12 text-accent ring-1 ring-accent/25",
      )}
    >
      {code}
    </span>
  );
}

function StatLine({ score }: { score: Score }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
      <span className="inline-flex items-center gap-1">
        <Flag className="h-3 w-3 text-faint" /> Corners{" "}
        <span className="tnum text-foreground">
          {score.home.corners}–{score.away.corners}
        </span>
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-3 w-2 rounded-[2px] bg-live" />
        <span className="tnum text-foreground">
          {score.home.yellow}–{score.away.yellow}
        </span>
      </span>
    </div>
  );
}

function LiveCard({ f }: { f: Fixture }) {
  const s = f.score;
  return (
    <Link
      href="/trade"
      className="group rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-long focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex h-full flex-col gap-4 rounded-[var(--radius-card)] border border-long/40 bg-background p-5 glow-long transition group-hover:brightness-110">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-short">
            <span className="h-1.5 w-1.5 rounded-full bg-short animate-live-dot" /> Live
            {s ? ` · ${s.minute}'` : ""}
          </span>
          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
            {f.competition}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Badge code={f.homeCode} tone="long" />
            <span className="text-sm text-foreground">{f.home}</span>
          </div>
          <div className="tnum text-2xl font-bold tabular-nums">
            {s ? s.home.goals : "–"}
            <span className="mx-1.5 text-faint">:</span>
            {s ? s.away.goals : "–"}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-sm text-foreground">{f.away}</span>
            <Badge code={f.awayCode} tone="accent" />
          </div>
        </div>

        {s && <StatLine score={s} />}

        <span className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] brand-gradient py-2.5 text-sm font-semibold text-background">
          Trade this match live <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function UpcomingCard({ f }: { f: Fixture }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-[var(--radius-card)] border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
          {f.competition}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-faint">
          <Clock className="h-3 w-3" /> {f.kickingOff ? "Kicking off" : kickoff(f.startTime)}
        </span>
      </div>
      <div className="my-5 flex items-center justify-center gap-4">
        <TeamStack code={f.homeCode} name={f.home} tone="long" />
        <span className="text-xs font-medium text-faint">vs</span>
        <TeamStack code={f.awayCode} name={f.away} tone="accent" />
      </div>
      <span className="text-center text-xs text-faint">Market opens at kick-off</span>
    </div>
  );
}

function ResultCard({ f }: { f: Fixture }) {
  const s = f.score;
  return (
    <div className="flex h-full flex-col justify-between rounded-[var(--radius-card)] border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
          {f.competition}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-faint">Full time</span>
      </div>
      <div className="my-4 flex items-center justify-between gap-2">
        <TeamStack code={f.homeCode} name={f.home} tone="long" />
        <div className="tnum text-xl font-bold tabular-nums">
          {s ? s.home.goals : "–"}
          <span className="mx-1.5 text-faint">:</span>
          {s ? s.away.goals : "–"}
        </div>
        <TeamStack code={f.awayCode} name={f.away} tone="accent" />
      </div>
      {s ? (
        <div className="border-t border-border pt-3">
          <StatLine score={s} />
        </div>
      ) : (
        <span className="text-center text-xs text-faint">Result pending</span>
      )}
    </div>
  );
}

function TeamStack({ code, name, tone }: { code: string; name: string; tone: "long" | "accent" }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <Badge code={code} tone={tone} />
      <span className="max-w-[6rem] truncate text-center text-xs text-muted">{name}</span>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-[188px] animate-pulse rounded-[var(--radius-card)] border border-border bg-background p-5">
          <div className="h-4 w-24 rounded bg-elevated" />
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="h-11 w-11 rounded-[10px] bg-elevated" />
            <div className="h-11 w-11 rounded-[10px] bg-elevated" />
          </div>
          <div className="mt-8 h-8 rounded bg-elevated" />
        </div>
      ))}
    </div>
  );
}
