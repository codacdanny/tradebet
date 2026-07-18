"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Radio, Clock, Flag, CheckCircle2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Side = { goals: number; corners: number; yellow: number; red: number };
type Score = { running: boolean; minute: number; home: Side; away: Side };
type Fixture = {
  fixtureId: string;
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  competition: string;
  startTime: number;
  isWorldCup: boolean;
  tradeable?: boolean;
  kickingOff?: boolean;
  score?: Score | null;
};
type Data = { source: string; live: Fixture[]; upcoming: Fixture[]; finished: Fixture[] };

function kickoff(ms: number): string {
  if (!ms) return "TBD";
  const diff = ms - Date.now();
  if (diff <= 0) return "Kicking off";
  // Within 6 hours: a live countdown. Otherwise: the actual kickoff date & time.
  if (diff < 6 * 3_600_000) {
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return h > 0 ? `in ${h}h ${m}m` : `in ${Math.max(1, m)} min`;
  }
  return new Date(ms).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MarketsHub() {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/fixtures")
        .then((r) => r.json())
        .then((d) => alive && setData(d))
        .catch(() => alive && setFailed(true));
    load();
    const id = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <section id="markets" className="scroll-mt-20 border-y border-border bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-long">
              <Radio className="h-3.5 w-3.5" /> Live from TxODDS TxLINE
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Match markets</h2>
            <p className="mt-3 max-w-2xl text-muted">
              Every match, straight from the TxODDS feed. Trade the live one on-chain, watch what&apos;s next,
              and review full-time results.
            </p>
          </div>
          <Link
            href="/trade"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] brand-gradient px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-long focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Open trading terminal <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {failed && <Note>Couldn&apos;t reach the fixtures feed right now.</Note>}
        {!failed && !data && (
          <div className="mt-10 space-y-8">
            <div className="h-40 animate-pulse rounded-[var(--radius-card)] border border-border bg-background" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-[var(--radius-card)] border border-border bg-background" />
              ))}
            </div>
          </div>
        )}

        {data && (
          <div className="mt-10 space-y-12">
            {/* TOP: live match, or the next one to kick off */}
            {data.live.length ? (
              <Group
                icon={<span className="h-2 w-2 rounded-full bg-short animate-live-dot" />}
                title="Live now"
                hint="On-chain · real-time"
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  {data.live.map((f) => (
                    <LiveCard key={f.fixtureId} f={f} />
                  ))}
                </div>
              </Group>
            ) : data.upcoming.length ? (
              <Group icon={<TrendingUp className="h-4 w-4 text-long" />} title="Up next" hint="Pre-match market · trade now">
                <FeaturedNext f={data.upcoming.find((f) => f.isWorldCup) ?? data.upcoming[0]} />
              </Group>
            ) : null}

            {/* UPCOMING */}
            {(() => {
              const feat = data.upcoming.find((f) => f.isWorldCup) ?? data.upcoming[0];
              const rest = data.live.length ? data.upcoming : data.upcoming.filter((f) => f.fixtureId !== feat?.fixtureId);
              return rest.length ? (
                <Group icon={<Clock className="h-4 w-4 text-accent" />} title="Upcoming" hint="Opens at kickoff">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {rest.map((f) => (
                      <UpcomingCard key={f.fixtureId} f={f} />
                    ))}
                  </div>
                </Group>
              ) : null;
            })()}

            {/* RESULTS */}
            <Group icon={<CheckCircle2 className="h-4 w-4 text-muted" />} title="Results" hint="Full time · TxODDS stats">
              {data.finished.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.finished.map((f) => (
                    <ResultCard key={f.fixtureId} f={f} />
                  ))}
                </div>
              ) : (
                <Empty>No completed matches yet.</Empty>
              )}
            </Group>
          </div>
        )}
      </div>
    </section>
  );
}

function Group({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2.5">
        {icon}
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <span className="ml-1 text-xs text-faint">{hint}</span>
      </div>
      {children}
    </div>
  );
}

function LiveCard({ f }: { f: Fixture }) {
  const s = f.score;
  return (
    <Link
      href="/trade"
      className="group relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-card)] border border-long/40 bg-background p-5 glow-long transition hover:border-long/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-long"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-short">
          <span className="h-1.5 w-1.5 rounded-full bg-short animate-live-dot" /> Live
          {s ? ` · ${s.minute}'` : ""}
        </span>
        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
          {f.competition}
        </span>
      </div>

      <div className="my-4 flex items-center justify-center gap-5">
        <Team code={f.homeCode} name={f.home} tone="long" />
        <div className="tnum text-3xl font-bold tabular-nums">
          {s ? s.home.goals : "0"}
          <span className="mx-2 text-faint">:</span>
          {s ? s.away.goals : "0"}
        </div>
        <Team code={f.awayCode} name={f.away} tone="accent" />
      </div>

      {s && (
        <div className="mb-3 flex items-center justify-center gap-4 text-[11px] text-muted">
          <StatChip icon={<Flag className="h-3 w-3" />} label={`${s.home.corners}–${s.away.corners}`} title="Corners" />
          <StatChip icon={<span className="h-2.5 w-2 rounded-[1px] bg-live" />} label={`${s.home.yellow}–${s.away.yellow}`} title="Yellow cards" />
        </div>
      )}

      <span className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] brand-gradient py-2.5 text-sm font-semibold text-background">
        <TrendingUp className="h-4 w-4" /> Trade live now
      </span>
    </Link>
  );
}

function FeaturedNext({ f }: { f: Fixture }) {
  return (
    <Link
      href="/trade"
      className="group flex flex-col items-center gap-6 rounded-[var(--radius-card)] border border-accent/30 bg-background p-6 glow-accent transition hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:flex-row sm:justify-between sm:p-7"
    >
      <div className="flex items-center gap-6">
        <Team code={f.homeCode} name={f.home} tone="long" />
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-muted">{f.competition}</div>
          <div className="my-1 font-display text-base font-semibold text-faint">vs</div>
          <div className="inline-flex items-center gap-1 text-sm text-accent">
            <Clock className="h-3.5 w-3.5" /> {f.kickingOff ? "Kicking off" : kickoff(f.startTime)}
          </div>
        </div>
        <Team code={f.awayCode} name={f.away} tone="accent" />
      </div>
      <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-control)] brand-gradient px-6 py-3 text-sm font-semibold text-background sm:w-auto">
        <TrendingUp className="h-4 w-4" /> Trade pre-match
      </span>
    </Link>
  );
}

function UpcomingCard({ f }: { f: Fixture }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-[var(--radius-card)] border border-border bg-background p-5 transition hover:border-border-strong">
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
          {f.competition}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-accent">
          <Clock className="h-3 w-3" /> {f.kickingOff ? "Kicking off" : kickoff(f.startTime)}
        </span>
      </div>
      <div className="my-5 flex items-center justify-center gap-4">
        <Team code={f.homeCode} name={f.home} tone="long" />
        <span className="text-xs font-medium text-faint">vs</span>
        <Team code={f.awayCode} name={f.away} tone="accent" />
      </div>
      <span className="text-center text-xs text-faint">Market opens at kickoff</span>
    </div>
  );
}

function ResultCard({ f }: { f: Fixture }) {
  const s = f.score;
  const homeWon = s && s.home.goals > s.away.goals;
  const awayWon = s && s.away.goals > s.home.goals;
  return (
    <div className="flex h-full flex-col justify-between rounded-[var(--radius-card)] border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
          {f.competition}
        </span>
        <span className="text-[11px] text-faint">Full time</span>
      </div>
      <div className="my-4 flex items-center justify-center gap-4">
        <Team code={f.homeCode} name={f.home} tone={homeWon ? "long" : "muted"} />
        <div className="tnum text-2xl font-bold tabular-nums text-foreground">
          {s ? s.home.goals : "–"}
          <span className="mx-1.5 text-faint">:</span>
          {s ? s.away.goals : "–"}
        </div>
        <Team code={f.awayCode} name={f.away} tone={awayWon ? "long" : "muted"} />
      </div>
      {s && (
        <div className="flex items-center justify-center gap-4 border-t border-border pt-3 text-[11px] text-muted">
          <StatChip icon={<Flag className="h-3 w-3" />} label={`${s.home.corners}–${s.away.corners}`} title="Corners" />
          <StatChip icon={<span className="h-2.5 w-2 rounded-[1px] bg-live" />} label={`${s.home.yellow}–${s.away.yellow}`} title="Yellow cards" />
          {(s.home.red > 0 || s.away.red > 0) && (
            <StatChip icon={<span className="h-2.5 w-2 rounded-[1px] bg-short" />} label={`${s.home.red}–${s.away.red}`} title="Red cards" />
          )}
        </div>
      )}
    </div>
  );
}

function Team({ code, name, tone }: { code: string; name: string; tone: "long" | "accent" | "muted" }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={cn(
          "tnum grid h-11 w-11 place-items-center rounded-[10px] text-xs font-bold ring-1",
          tone === "long" && "bg-long/12 text-long ring-long/25",
          tone === "accent" && "bg-accent/12 text-accent ring-accent/25",
          tone === "muted" && "bg-elevated text-muted ring-border",
        )}
      >
        {code}
      </span>
      <span className="max-w-[6rem] truncate text-center text-xs text-muted">{name}</span>
    </div>
  );
}

function StatChip({ icon, label, title }: { icon: React.ReactNode; label: string; title: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 tnum" title={title}>
      {icon}
      {label}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-background/40 p-6 text-center text-sm text-faint">
      {children}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-[var(--radius-card)] border border-border bg-background p-6 text-sm text-muted">
      {children}
    </div>
  );
}
