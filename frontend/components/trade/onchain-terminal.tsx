"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Coins,
  ExternalLink,
  Loader2,
  Radio,
  ShieldCheck,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useTradebet } from "@/lib/program/useTradebet";
import { useScores, type LiveScore } from "@/lib/program/useScores";
import { DEPLOYMENT, SIDE_LONG, SIDE_SHORT, type FeaturedMarket } from "@/lib/program/client";
import { PriceChart } from "./price-chart";
import { Logo } from "@/components/logo";
import { ConnectButton } from "@/components/connect-button";
import { cn, signed } from "@/lib/utils";

const explorer = (kind: "tx" | "address", id: string) =>
  `https://explorer.solana.com/${kind}/${id}?cluster=devnet`;

export function OnchainTerminal() {
  const tb = useTradebet();
  const score = useScores(tb.fixtureId);
  const fixture = tb.featured;

  const curBps = tb.market?.probBps ?? 0;
  const openBps = tb.historyBps[0] ?? curBps;
  const deltaPct = (curBps - openBps) / 100;

  const historyPoints = useMemo(
    () => tb.historyBps.map((bps, i) => ({ minute: i, bps })),
    [tb.historyBps],
  );
  const xMax = Math.max(30, tb.historyBps.length - 1);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-3 sm:px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Logo className="hidden sm:inline-flex" markClassName="h-6 w-6" />
          </div>
          <div className="flex items-center gap-2">
            <a
              href={explorer("address", DEPLOYMENT.programId)}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-muted transition hover:text-foreground md:inline-flex"
            >
              <Radio className="h-3 w-3 text-long" />
              Live on devnet
              <ExternalLink className="h-3 w-3" />
            </a>
            {tb.connected && (
              <span className="tnum hidden rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm sm:inline-block">
                <span className="text-muted">USDC </span>
                <span className="text-foreground">{tb.usdc.toFixed(2)}</span>
              </span>
            )}
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-3 py-4 sm:px-4 sm:py-5">
        {tb.error && <ErrorToast message={tb.error} onClose={tb.clearError} />}
        {!fixture ? (
          <div className="grid min-h-[60vh] place-items-center text-sm text-faint">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading the live market…
            </span>
          </div>
        ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* Left */}
          <div className="flex min-w-0 flex-col gap-4">
            <MatchHeader
              fixture={fixture}
              curBps={curBps}
              deltaPct={deltaPct}
              settled={tb.market?.isSettled}
              score={score}
            />

            <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
                  <Activity className="h-4 w-4 text-long" />
                  {fixture.home} win probability
                </h2>
                <span className="text-[11px] text-faint">on-chain · polled live</span>
              </div>
              <p className="mb-3 text-[13px] leading-relaxed text-muted">
                This line is <span className="text-foreground">{fixture.home}&apos;s live chance to win</span>,
                priced from the match as it happens — that&apos;s the number you trade.{" "}
                <span className="text-long">Buy</span>{" "}if you think it&apos;s too low,{" "}
                <span className="text-short">sell</span>{" "}if it&apos;s too high, and cash out any second.
              </p>
              {score && !score.inPlay && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] border border-accent/25 bg-accent/[0.06] px-3 py-2 text-[12px]">
                  <span className="text-muted">Not kicked off yet — the live chart starts at kickoff. Trading is already open.</span>
                  <Link href="/demo" className="inline-flex shrink-0 items-center gap-1 font-medium text-accent hover:underline">
                    Watch a full-match replay <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
              {historyPoints.length > 1 ? (
                <PriceChart
                  history={historyPoints}
                  entryBps={tb.position?.entryProbBps}
                  side={tb.position?.side === SIDE_SHORT ? "short" : "long"}
                  xMax={xMax}
                />
              ) : (
                <div className="grid h-[360px] place-items-center text-sm text-faint">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> reading market from chain…
                  </span>
                </div>
              )}
            </section>

            {score?.available && <MatchStats score={score} />}

            <MarketInfo fixtureId={fixture.fixtureId} marketPda={tb.marketPda} />
          </div>

          {/* Right */}
          <div className="flex min-w-0 flex-col gap-4">
            <TradePanel tb={tb} curBps={curBps} />
          </div>
        </div>
        )}
      </main>
    </div>
  );
}

function MatchHeader({
  fixture,
  curBps,
  deltaPct,
  settled,
  score,
}: {
  fixture: FeaturedMarket;
  curBps: number;
  deltaPct: number;
  settled?: boolean;
  score: LiveScore | null;
}) {
  const up = deltaPct >= 0;
  const live = !!score?.available;

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Teams + live score + clock */}
        <div className="flex items-center gap-3 sm:gap-4">
          <TeamBadge code={fixture.homeCode} name={fixture.home} tone="long" />
          <div className="flex flex-col items-center px-1">
            <div className="tnum text-3xl font-bold leading-none tabular-nums">
              {live ? score!.home.goals : "–"}
              <span className="mx-2 text-faint">:</span>
              {live ? score!.away.goals : "–"}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              {live && score!.inPlay && (
                <span className="h-1.5 w-1.5 rounded-full bg-live animate-live-dot" />
              )}
              <span className="tnum text-[11px] uppercase tracking-wider text-live">
                {settled
                  ? "Full time"
                  : live
                    ? score!.minute > 0
                      ? `${score!.minute}' · ${score!.period}`
                      : score!.period
                    : "Live market"}
              </span>
            </div>
          </div>
          <TeamBadge code={fixture.awayCode} name={fixture.away} tone="accent" />
        </div>

        {/* Win probability */}
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-widest text-muted">{fixture.home} to win</div>
          <div className="flex items-baseline justify-end gap-2">
            <span className="tnum text-4xl font-bold tabular-nums text-foreground">
              {(curBps / 100).toFixed(1)}
              <span className="text-xl text-muted">%</span>
            </span>
            <span className={cn("tnum inline-flex items-center text-sm", up ? "text-long" : "text-short")}>
              {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {Math.abs(deltaPct).toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Live match stats */}
      {live && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-xs">
          <StatPair label="Corners" home={score!.home.corners} away={score!.away.corners} />
          <CardStat color="bg-live" home={score!.home.yellow} away={score!.away.yellow} title="Yellow cards" />
          {(score!.home.red > 0 || score!.away.red > 0) && (
            <CardStat color="bg-short" home={score!.home.red} away={score!.away.red} title="Red cards" />
          )}
          {score!.lastEvent && (
            <span className="ml-auto capitalize text-faint">last: {score!.lastEvent.replace(/_/g, " ")}</span>
          )}
        </div>
      )}
    </section>
  );
}

function TeamBadge({ code, name, tone }: { code: string; name: string; tone: "long" | "accent" }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={cn(
          "tnum grid h-11 w-11 place-items-center rounded-[10px] text-xs font-bold",
          tone === "long" ? "bg-long/12 text-long ring-1 ring-long/25" : "bg-accent/12 text-accent ring-1 ring-accent/25",
        )}
      >
        {code}
      </span>
      <span className="hidden max-w-[5rem] truncate text-[11px] text-muted sm:block">{name}</span>
    </div>
  );
}

function StatPair({ label, home, away }: { label: string; home: number; away: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <span className="text-faint">{label}</span>
      <span className="tnum text-foreground">
        {home}<span className="mx-0.5 text-faint">–</span>{away}
      </span>
    </span>
  );
}

function CardStat({ color, home, away, title }: { color: string; home: number; away: number; title: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted" title={title}>
      <span className={cn("h-3 w-2.5 rounded-[2px]", color)} />
      <span className="tnum text-foreground">
        {home}<span className="mx-0.5 text-faint">–</span>{away}
      </span>
    </span>
  );
}

function MatchStats({ score }: { score: LiveScore }) {
  const rows: { label: string; home: number; away: number }[] = [
    { label: "Goals", home: score.home.goals, away: score.away.goals },
    { label: "Corners", home: score.home.corners, away: score.away.corners },
    { label: "Yellow cards", home: score.home.yellow, away: score.away.yellow },
  ];
  if (score.home.red > 0 || score.away.red > 0) {
    rows.push({ label: "Red cards", home: score.home.red, away: score.away.red });
  }
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted">
        <Activity className="h-4 w-4 text-accent" />
        Match stats
      </h3>
      <div className="flex flex-col gap-4">
        {rows.map((r) => (
          <StatBar key={r.label} label={r.label} home={r.home} away={r.away} />
        ))}
      </div>
      <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-faint">
        Live from TxODDS TxLINE. Possession, shots and offsides stream in automatically on the full feed.
      </p>
    </section>
  );
}

function StatBar({ label, home, away }: { label: string; home: number; away: number }) {
  const total = home + away;
  const homePct = total ? (home / total) * 100 : 50;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="tnum w-8 text-sm font-medium text-foreground">{home}</span>
        <span className="text-xs text-muted">{label}</span>
        <span className="tnum w-8 text-right text-sm font-medium text-foreground">{away}</span>
      </div>
      <div className="mt-1.5 flex h-1.5 gap-1">
        <div className="rounded-l-full bg-long/70" style={{ width: `${homePct}%` }} />
        <div className="ml-auto rounded-r-full bg-accent/70" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}

function TradePanel({ tb, curBps }: { tb: ReturnType<typeof useTradebet>; curBps: number }) {
  const { setVisible } = useWalletModal();
  const [side, setSide] = useState(SIDE_LONG);
  const [size, setSize] = useState(100);

  // Not connected → connect gate
  if (!tb.connected) {
    return (
      <Panel>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
            <Wallet className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold">Connect to trade</h3>
            <p className="mt-1 text-sm text-muted">
              Your wallet is your login. Connect to open a real position on devnet.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVisible(true)}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] brand-gradient font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-long focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </button>
        </div>
      </Panel>
    );
  }

  // Position open → cash out card
  if (tb.position) {
    const up = tb.livePnl >= 0;
    const roi = (tb.livePnl / tb.position.size) * 100;
    return (
      <Panel>
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
              tb.position.side === SIDE_LONG ? "bg-long/10 text-long" : "bg-short/10 text-short",
            )}
          >
            {tb.position.side === SIDE_LONG ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {tb.position.side === SIDE_LONG ? "long" : "short"} · {tb.featured?.home ?? "home"} win
          </span>
          <span className="text-xs text-muted">1x</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="Size" value={`$${tb.position.size.toFixed(0)}`} />
          <Stat label="Entry" value={`${(tb.position.entryProbBps / 100).toFixed(1)}%`} />
          <Stat label="Mark" value={`${(curBps / 100).toFixed(1)}%`} accent />
        </div>
        <div className="mt-4 rounded-[var(--radius-control)] border border-border bg-background/60 p-4 text-center">
          <div className="text-[11px] uppercase tracking-widest text-muted">Live P&amp;L</div>
          <div className={cn("tnum mt-1 text-3xl font-bold", up ? "text-long text-glow-long" : "text-short")}>
            {up ? "+" : "−"}${Math.abs(tb.livePnl).toFixed(2)}
          </div>
          <div className={cn("tnum mt-0.5 text-sm", up ? "text-long" : "text-short")}>{signed(roi)}%</div>
        </div>
        <ActionButton
          onClick={tb.close}
          busy={tb.busy === "close"}
          className="mt-4 bg-long-solid text-background focus-visible:ring-long"
        >
          <Zap className="h-4 w-4" />
          Cash out {up ? `+$${Math.abs(tb.livePnl).toFixed(2)}` : `−$${Math.abs(tb.livePnl).toFixed(2)}`}
        </ActionButton>
        <TxLink sig={tb.lastTx} />
      </Panel>
    );
  }

  // No USDC → faucet
  if (tb.usdc < 1) {
    return (
      <Panel>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-long/10 text-long">
            <Coins className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold">Get test USDC</h3>
            <p className="mt-1 text-sm text-muted">
              You&apos;ll need devnet USDC to trade. Grab 500 free — it&apos;s test money.
            </p>
          </div>
          <ActionButton
            onClick={tb.faucet}
            busy={tb.busy === "faucet"}
            className="brand-gradient text-background focus-visible:ring-long"
          >
            <Coins className="h-4 w-4" />
            Get 500 test USDC
          </ActionButton>
          {tb.sol < 0.01 && (
            <p className="text-[11px] leading-relaxed text-faint">
              You&apos;ll also need a little devnet SOL for fees —{" "}
              <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="text-accent underline">
                faucet.solana.com
              </a>
              .
            </p>
          )}
          <TxLink sig={tb.lastTx} />
        </div>
      </Panel>
    );
  }

  // Trade form
  const canOpen = !tb.market?.isSettled && size > 0 && size <= tb.usdc && tb.busy === null;
  return (
    <Panel>
      <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-control)] border border-border bg-background/60 p-1">
        <SideToggle active={side === SIDE_LONG} tone="long" onClick={() => setSide(SIDE_LONG)}>
          <ArrowUpRight className="h-4 w-4" /> Long
        </SideToggle>
        <SideToggle active={side === SIDE_SHORT} tone="short" onClick={() => setSide(SIDE_SHORT)}>
          <ArrowDownRight className="h-4 w-4" /> Short
        </SideToggle>
      </div>
      <p className="mt-2.5 rounded-[var(--radius-control)] bg-background/40 px-3 py-2 text-center text-[11px] leading-relaxed text-muted">
        {side === SIDE_LONG ? (
          <>
            <span className="text-long">Long</span> — you profit if {tb.featured?.home ?? "the team"}&apos;s chance{" "}
            <span className="text-foreground">rises</span> above {(curBps / 100).toFixed(0)}%.
          </>
        ) : (
          <>
            <span className="text-short">Short</span> — you profit if {tb.featured?.home ?? "the team"}&apos;s chance{" "}
            <span className="text-foreground">falls</span> below {(curBps / 100).toFixed(0)}%.
          </>
        )}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <label htmlFor="size" className="flex items-center justify-between text-xs text-muted">
          <span>Size</span>
          <span className="tnum">Balance ${tb.usdc.toFixed(2)}</span>
        </label>
        <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-border bg-background/60 px-3 focus-within:border-border-strong">
          <span className="text-muted">$</span>
          <input
            id="size"
            type="number"
            inputMode="decimal"
            min={1}
            max={tb.usdc}
            value={size}
            onChange={(e) => setSize(Math.max(0, Number(e.target.value)))}
            className="tnum h-11 w-full bg-transparent text-lg outline-none placeholder:text-faint"
          />
          <span className="text-xs text-faint">USDC</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[25, 50, 100].map((v) => (
            <Chip key={v} active={size === v} onClick={() => setSize(v)}>
              ${v}
            </Chip>
          ))}
          <Chip active={size === Math.floor(tb.usdc)} onClick={() => setSize(Math.floor(tb.usdc))}>
            Max
          </Chip>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-[var(--radius-control)] border border-border bg-background/40 px-3 py-2.5 text-sm">
        <span className="text-muted">Entry price</span>
        <span className="tnum font-semibold text-foreground">{(curBps / 100).toFixed(1)}%</span>
      </div>

      <ActionButton
        onClick={() => tb.open(side, size)}
        busy={tb.busy === "open"}
        disabled={!canOpen}
        className={cn(
          "mt-4",
          side === SIDE_LONG ? "bg-long-solid text-background focus-visible:ring-long" : "bg-short text-background focus-visible:ring-short",
        )}
      >
        {side === SIDE_LONG ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        Go {side === SIDE_LONG ? "long" : "short"} · ${size || 0}
      </ActionButton>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-faint">
        1x · a real devnet transaction you sign · settles via TxLINE&apos;s on-chain result.
      </p>
      <TxLink sig={tb.lastTx} />
    </Panel>
  );
}

function MarketInfo({ fixtureId, marketPda }: { fixtureId: string; marketPda: string | null }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted">
        <ShieldCheck className="h-4 w-4 text-accent" />
        Market &amp; settlement
      </h3>
      <dl className="flex flex-col gap-2.5 text-sm">
        <Row label="Fixture" value={`#${fixtureId}`} />
        <Row label="Priced by" value="TxODDS TxLINE" />
        <RowLink label="Program" value="devnet" href={explorer("address", DEPLOYMENT.programId)} />
        {marketPda && (
          <RowLink label="Market account" value="on-chain" href={explorer("address", marketPda)} />
        )}
        <Row label="Vault liquidity" value="$250,000" />
        <Row label="Protocol fee" value="0.50%" />
      </dl>
    </section>
  );
}

/* ---------- small building blocks ---------- */

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">{children}</div>;
}

function ActionButton({
  children,
  onClick,
  busy,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {busy ? "Confirm in wallet…" : children}
    </button>
  );
}

function TxLink({ sig }: { sig: string | null }) {
  if (!sig) return null;
  return (
    <a
      href={explorer("tx", sig)}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-accent transition hover:underline"
    >
      View last transaction <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function ErrorToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-[var(--radius-control)] border border-short/40 bg-short/10 px-4 py-3 text-sm text-short">
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="shrink-0 rounded p-0.5 hover:bg-short/15">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className={cn("tnum mt-0.5 text-base font-semibold", accent ? "text-accent" : "text-foreground")}>{value}</div>
    </div>
  );
}

function SideToggle({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: "long" | "short";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-[7px] text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        active && tone === "long" && "bg-long/15 text-long ring-1 ring-long/40 focus-visible:ring-long",
        active && tone === "short" && "bg-short/15 text-short ring-1 ring-short/40 focus-visible:ring-short",
        !active && "text-muted hover:text-foreground focus-visible:ring-border-strong",
      )}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "tnum h-8 rounded-[7px] border text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong",
        active ? "border-border-strong bg-elevated text-foreground" : "border-border bg-background/40 text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
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

function RowLink({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>
        <a href={href} target="_blank" rel="noopener noreferrer" className="tnum inline-flex items-center gap-1 text-accent hover:underline">
          {value} <ExternalLink className="h-3 w-3" />
        </a>
      </dd>
    </div>
  );
}
