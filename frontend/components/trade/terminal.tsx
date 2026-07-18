"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Pause,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useMatchSim } from "@/lib/sim";
import { PriceChart } from "./price-chart";
import { TradePanel, type Position } from "./trade-panel";
import { Logo } from "@/components/logo";
import { ConnectButton } from "@/components/connect-button";
import { cn } from "@/lib/utils";

const START_BALANCE = 1000;

type Trade = { side: "long" | "short"; size: number; pnl: number };

export function Terminal() {
  const { state, playing, start, pause, reset } = useMatchSim();
  const [position, setPosition] = useState<Position | null>(null);
  const [balance, setBalance] = useState(START_BALANCE);
  const [trades, setTrades] = useState<Trade[]>([]);

  const cur = state.probBps;
  const openBps = state.history[0]?.bps ?? cur;
  const deltaPct = (cur - openBps) / 100;

  const livePnl = position
    ? ((position.side === "long" ? cur - position.entryBps : position.entryBps - cur) / 10000) *
      position.size
    : 0;

  const handleOpen = useCallback(
    (side: "long" | "short", size: number) => {
      if (position || size <= 0 || size > balance) return;
      setPosition({ side, size, entryBps: cur });
      setBalance((b) => b - size);
    },
    [position, balance, cur],
  );

  const handleClose = useCallback(() => {
    if (!position) return;
    setBalance((b) => b + position.size + livePnl);
    setTrades((t) => [{ side: position.side, size: position.size, pnl: livePnl }, ...t].slice(0, 6));
    setPosition(null);
  }, [position, livePnl]);

  const handleReset = useCallback(() => {
    reset();
    setPosition(null);
    setBalance(START_BALANCE);
    setTrades([]);
  }, [reset]);

  const tradingOpen = state.status === "live";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Logo className="hidden sm:inline-flex" markClassName="h-6 w-6" />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-muted md:inline-flex">
              <Radio className="h-3 w-3 text-accent" />
              Feed: <span className="text-foreground">SIM</span> · TxLINE-ready
            </span>
            <span className="tnum hidden rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm sm:inline-block">
              <span className="text-muted">Bal </span>
              <span className="text-foreground">${balance.toFixed(2)}</span>
            </span>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* Left column */}
          <div className="flex min-w-0 flex-col gap-4">
            <MatchHeader
              state={state}
              deltaPct={deltaPct}
              playing={playing}
              onStart={start}
              onPause={pause}
              onReset={handleReset}
            />

            <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
                  <Activity className="h-4 w-4 text-long" />
                  Nigeria win probability
                </h2>
                <span className="text-[11px] text-faint">live · 1 pt / match-minute</span>
              </div>
              <PriceChart
                history={state.history}
                events={state.events}
                entryBps={position?.entryBps}
                side={position?.side}
              />
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <EventFeed state={state} />
              <TradeLog trades={trades} />
            </div>
          </div>

          {/* Right column */}
          <div className="flex min-w-0 flex-col gap-4">
            <TradePanel
              currentBps={cur}
              balance={balance}
              position={position}
              livePnl={livePnl}
              onOpen={handleOpen}
              onClose={handleClose}
              tradingOpen={tradingOpen || (!!position && state.status === "fulltime")}
            />
            <MarketInfo fixtureId={state.fixtureId} />
          </div>
        </div>
      </main>
    </div>
  );
}

function MatchHeader({
  state,
  deltaPct,
  playing,
  onStart,
  onPause,
  onReset,
}: {
  state: ReturnType<typeof useMatchSim>["state"];
  deltaPct: number;
  playing: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}) {
  const up = deltaPct >= 0;
  const isLive = state.status === "live";
  const isFt = state.status === "fulltime";

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Teams + score */}
        <div className="flex items-center gap-4">
          <TeamBadge code={state.homeCode} name={state.home} tone="home" />
          <div className="flex flex-col items-center">
            <div className="tnum text-2xl font-bold leading-none">
              {state.scoreHome}
              <span className="mx-1.5 text-faint">:</span>
              {state.scoreAway}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              {isLive && <span className="h-1.5 w-1.5 rounded-full bg-live animate-live-dot" />}
              <span
                className={cn(
                  "tnum text-[11px] uppercase tracking-wider",
                  isLive ? "text-live" : "text-muted",
                )}
              >
                {isFt ? "Full time" : isLive ? `${state.minute}'` : "Pre-match"}
              </span>
            </div>
          </div>
          <TeamBadge code={state.awayCode} name={state.away} tone="away" />
        </div>

        {/* Big probability */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-widest text-muted">Nigeria to win</div>
            <div className="flex items-baseline gap-2">
              <span className="tnum text-4xl font-bold tabular-nums text-foreground">
                {(state.probBps / 100).toFixed(1)}
                <span className="text-xl text-muted">%</span>
              </span>
              <span className={cn("tnum inline-flex items-center text-sm", up ? "text-long" : "text-short")}>
                {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {Math.abs(deltaPct).toFixed(1)}
              </span>
            </div>
          </div>

          {/* Sim controls */}
          <div className="flex items-center gap-1.5 border-l border-border pl-4">
            {isFt ? (
              <ControlBtn onClick={onReset} label="Replay">
                <RotateCcw className="h-4 w-4" />
              </ControlBtn>
            ) : playing ? (
              <ControlBtn onClick={onPause} label="Pause">
                <Pause className="h-4 w-4" />
              </ControlBtn>
            ) : (
              <ControlBtn onClick={onStart} label="Play" primary>
                <Play className="h-4 w-4" />
              </ControlBtn>
            )}
            {!isFt && (
              <ControlBtn onClick={onReset} label="Reset">
                <RotateCcw className="h-4 w-4" />
              </ControlBtn>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function TeamBadge({ code, name, tone }: { code: string; name: string; tone: "home" | "away" }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "tnum grid h-10 w-10 place-items-center rounded-[10px] text-xs font-bold",
          tone === "home"
            ? "bg-long/12 text-long ring-1 ring-long/25"
            : "bg-accent/12 text-accent ring-1 ring-accent/25",
        )}
      >
        {code}
      </span>
      <span className="hidden text-sm font-medium text-foreground md:inline">{name}</span>
    </div>
  );
}

function ControlBtn({
  children,
  onClick,
  label,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-[var(--radius-control)] border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        primary
          ? "border-long/40 bg-long/15 text-long hover:bg-long/25 focus-visible:ring-long"
          : "border-border bg-background/50 text-muted hover:text-foreground hover:border-border-strong focus-visible:ring-border-strong",
      )}
    >
      {children}
    </button>
  );
}

function EventFeed({ state }: { state: ReturnType<typeof useMatchSim>["state"] }) {
  const events = [...state.events].reverse();
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-medium text-muted">Match feed</h3>
      {events.length === 0 ? (
        <p className="py-6 text-center text-sm text-faint">Press play to kick off.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {events.map((e, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span className="tnum w-9 shrink-0 text-xs text-faint">{e.minute}&apos;</span>
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  e.type === "goal" && e.team === "home" && "bg-long",
                  e.type === "goal" && e.team === "away" && "bg-short",
                  e.type === "fulltime" && "bg-accent",
                  e.type === "kickoff" && "bg-muted",
                )}
              />
              <span className={cn(e.type === "goal" ? "text-foreground" : "text-muted")}>
                {e.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TradeLog({ trades }: { trades: Trade[] }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-medium text-muted">Your trades</h3>
      {trades.length === 0 ? (
        <p className="py-6 text-center text-sm text-faint">No closed trades yet.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {trades.map((t, i) => {
            const up = t.pnl >= 0;
            return (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className={cn("text-xs uppercase", t.side === "long" ? "text-long" : "text-short")}>
                    {t.side}
                  </span>
                  <span className="tnum text-muted">${t.size.toFixed(0)}</span>
                </span>
                <span className={cn("tnum font-medium", up ? "text-long" : "text-short")}>
                  {up ? "+" : "−"}${Math.abs(t.pnl).toFixed(2)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function MarketInfo({ fixtureId }: { fixtureId: number }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted">
        <ShieldCheck className="h-4 w-4 text-accent" />
        Market &amp; settlement
      </h3>
      <dl className="flex flex-col gap-2.5 text-sm">
        <Row label="Fixture" value={`#${fixtureId}`} />
        <Row label="Priced by" value="TxODDS TxLINE" />
        <Row label="Settlement" value="On-chain · Merkle-verified" />
        <Row label="Vault liquidity" value="$250,000" />
        <Row label="Protocol fee" value="0.50%" />
      </dl>
      <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-faint">
        Prices stream from TxODDS&apos; de-vigged consensus. The final result is verified
        against TxLINE&apos;s on-chain Merkle root — nothing to dispute, nothing to wait for.
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="tnum text-foreground">{value}</dd>
    </div>
  );
}
