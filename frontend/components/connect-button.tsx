"use client";

import { useState } from "react";
import { Wallet, LogOut, Loader2 } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { cn } from "@/lib/utils";

/** Real Solana wallet connect (Phantom / Solflare / Backpack, incl. mobile). */
export function ConnectButton({ className }: { className?: string }) {
  const { publicKey, connected, connecting, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [hover, setHover] = useState(false);

  if (connected && publicKey) {
    const b58 = publicKey.toBase58();
    const short = `${b58.slice(0, 4)}…${b58.slice(-4)}`;
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title="Disconnect"
        className={cn(
          "inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm transition hover:border-short/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
      >
        {hover ? (
          <>
            <LogOut className="h-4 w-4 text-short" />
            <span className="text-short">Disconnect</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-long animate-live-dot" />
            <span className="tnum text-foreground">{short}</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setVisible(true)}
      disabled={connecting}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-border-strong hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60",
        className,
      )}
    >
      {connecting ? (
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
      ) : (
        <Wallet className="h-4 w-4 text-accent" />
      )}
      {connecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
