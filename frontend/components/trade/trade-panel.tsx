"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Zap } from "lucide-react";
import { cn, signed } from "@/lib/utils";

export type Position = { side: "long" | "short"; size: number; entryBps: number };

export function TradePanel({
  currentBps,
  balance,
  position,
  livePnl,
  onOpen,
  onClose,
  tradingOpen,
}: {
  currentBps: number;
  balance: number;
  position: Position | null;
  livePnl: number;
  onOpen: (side: "long" | "short", size: number) => void;
  onClose: () => void;
  tradingOpen: boolean;
}) {
  const [side, setSide] = useState<"long" | "short">("long");
  const [size, setSize] = useState(100);

  const pct = (currentBps / 100).toFixed(1);
  const canOpen = tradingOpen && size > 0 && size <= balance;

  if (position) {
    const cur = currentBps / 100;
    const entry = position.entryBps / 100;
    const up = livePnl >= 0;
    const roi = (livePnl / position.size) * 100;
    return (
      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
              position.side === "long"
                ? "bg-long/10 text-long"
                : "bg-short/10 text-short",
            )}
          >
            {position.side === "long" ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {position.side} · Nigeria win
          </span>
          <span className="text-xs text-muted">1x</span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Size" value={`$${position.size.toFixed(0)}`} />
          <Stat label="Entry" value={`${entry.toFixed(1)}%`} />
          <Stat label="Mark" value={`${cur.toFixed(1)}%`} accent />
        </div>

        <div className="rounded-[var(--radius-control)] border border-border bg-background/60 p-4 text-center">
          <div className="text-[11px] uppercase tracking-widest text-muted">Live P&amp;L</div>
          <div
            className={cn(
              "tnum mt-1 text-3xl font-bold tabular-nums",
              up ? "text-long text-glow-long" : "text-short",
            )}
          >
            {up ? "+" : "−"}${Math.abs(livePnl).toFixed(2)}
          </div>
          <div className={cn("tnum mt-0.5 text-sm", up ? "text-long" : "text-short")}>
            {signed(roi)}%
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="group inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-long-solid font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-long focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Zap className="h-4 w-4" />
          Cash out {up ? `+$${Math.abs(livePnl).toFixed(2)}` : `−$${Math.abs(livePnl).toFixed(2)}`}
        </button>
        <p className="text-center text-[11px] leading-relaxed text-faint">
          Close any second at the live mark — or hold to settlement, verified on-chain
          against TxLINE&apos;s result.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-4">
      {/* Long / short */}
      <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-control)] border border-border bg-background/60 p-1">
        <SideToggle active={side === "long"} tone="long" onClick={() => setSide("long")}>
          <ArrowUpRight className="h-4 w-4" /> Long
        </SideToggle>
        <SideToggle active={side === "short"} tone="short" onClick={() => setSide("short")}>
          <ArrowDownRight className="h-4 w-4" /> Short
        </SideToggle>
      </div>

      {/* Size */}
      <div className="flex flex-col gap-2">
        <label htmlFor="size" className="flex items-center justify-between text-xs text-muted">
          <span>Size</span>
          <span className="tnum">Balance ${balance.toFixed(2)}</span>
        </label>
        <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-border bg-background/60 px-3 focus-within:border-border-strong">
          <span className="text-muted">$</span>
          <input
            id="size"
            type="number"
            inputMode="decimal"
            min={1}
            max={balance}
            value={size}
            onChange={(e) => setSize(Math.max(0, Number(e.target.value)))}
            className="tnum h-11 w-full bg-transparent text-lg outline-none placeholder:text-faint"
            placeholder="0"
          />
          <span className="text-xs text-faint">USDC</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[25, 50, 100].map((v) => (
            <Chip key={v} onClick={() => setSize(v)} active={size === v}>
              ${v}
            </Chip>
          ))}
          <Chip onClick={() => setSize(Math.floor(balance))} active={size === Math.floor(balance)}>
            Max
          </Chip>
        </div>
      </div>

      {/* Entry summary */}
      <div className="flex items-center justify-between rounded-[var(--radius-control)] border border-border bg-background/40 px-3 py-2.5 text-sm">
        <span className="text-muted">Entry price</span>
        <span className="tnum font-semibold text-foreground">{pct}%</span>
      </div>

      <button
        type="button"
        disabled={!canOpen}
        onClick={() => onOpen(side, size)}
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold text-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40",
          side === "long"
            ? "bg-long-solid hover:brightness-110 focus-visible:ring-long"
            : "bg-short hover:brightness-110 focus-visible:ring-short",
        )}
      >
        {side === "long" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        {tradingOpen ? `Go ${side} · $${size || 0}` : "Kick-off to trade"}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-faint">
        1x · no liquidations · settles at full-time via TxLINE&apos;s on-chain result.
      </p>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className={cn("tnum mt-0.5 text-base font-semibold", accent ? "text-accent" : "text-foreground")}>
        {value}
      </div>
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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "tnum h-8 rounded-[7px] border text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong",
        active
          ? "border-border-strong bg-elevated text-foreground"
          : "border-border bg-background/40 text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
