"use client";

// Anchor / web3.js use Node's Buffer internally; polyfill it for the browser.
import { Buffer } from "buffer";
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import type { Adapter } from "@solana/wallet-adapter-base";
import deployment from "@/lib/program/deployment.json";
import "@solana/wallet-adapter-react-ui/styles.css";

/**
 * Solana context for the whole app. Endpoint = our devnet deployment RPC.
 * `wallets={[]}` relies on the Wallet Standard, so Phantom / Solflare / Backpack
 * are auto-detected (incl. mobile deep-linking) without extra config.
 */
export function SolanaProviders({ children }: { children: React.ReactNode }) {
  // Route RPC through our same-origin proxy (avoids browser CORS/rate limits).
  const endpoint =
    typeof window !== "undefined" ? `${window.location.origin}/api/rpc` : deployment.rpc;
  const wallets = useMemo<Adapter[]>(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
