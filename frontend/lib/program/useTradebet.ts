"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, type Transaction, type VersionedTransaction } from "@solana/web3.js";
import {
  computePnl,
  closePositionTx,
  fetchMarket,
  fetchPosition,
  fetchUsdcBalance,
  getProgram,
  openPositionTx,
  type FeaturedMarket,
  type MarketState,
  type PositionState,
  type SignerWallet,
} from "./client";

const HISTORY_LEN = 90;

const readOnlyWallet: SignerWallet = {
  publicKey: PublicKey.default,
  signTransaction: async <T extends Transaction | VersionedTransaction>(t: T) => t,
  signAllTransactions: async <T extends Transaction | VersionedTransaction>(t: T[]) => t,
};

type Busy = null | "open" | "close" | "faucet";

export function useTradebet() {
  const { connection } = useConnection();
  const { publicKey, connected, signTransaction, signAllTransactions } = useWallet();

  const readProgram = useMemo(() => getProgram(connection, readOnlyWallet), [connection]);
  const signerProgram = useMemo(() => {
    if (!connected || !publicKey || !signTransaction || !signAllTransactions) return null;
    return getProgram(connection, { publicKey, signTransaction, signAllTransactions });
  }, [connection, connected, publicKey, signTransaction, signAllTransactions]);

  // The currently featured live fixture/market, resolved server-side.
  const [featured, setFeatured] = useState<FeaturedMarket | null>(null);
  const marketPk = useMemo(
    () => (featured?.marketPda ? new PublicKey(featured.marketPda) : null),
    [featured?.marketPda],
  );

  const [market, setMarket] = useState<MarketState | null>(null);
  const [historyBps, setHistoryBps] = useState<number[]>([]);
  const [position, setPosition] = useState<PositionState | null>(null);
  const [usdc, setUsdc] = useState(0);
  const [sol, setSol] = useState(0);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const fixtureRef = useRef<string | null>(null);

  // Resolve + follow the current featured market.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const f = (await (await fetch("/api/market")).json()) as FeaturedMarket;
        if (!alive) return;
        if (f.fixtureId !== fixtureRef.current) {
          fixtureRef.current = f.fixtureId;
          setHistoryBps([]);
          setMarket(null);
        }
        setFeatured(f);
      } catch {
        /* keep previous */
      }
    };
    tick();
    const id = setInterval(tick, 20_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Poll the on-chain market price for the current market -> rolling history.
  useEffect(() => {
    if (!marketPk) return;
    let alive = true;
    const tick = async () => {
      const m = await fetchMarket(readProgram, marketPk);
      if (!alive || !m) return;
      setMarket(m);
      setHistoryBps((h) => [...h, m.probBps].slice(-HISTORY_LEN));
    };
    tick();
    const id = setInterval(tick, 1300);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [readProgram, marketPk]);

  const refreshUser = useCallback(async () => {
    if (!publicKey || !marketPk) {
      setPosition(null);
      setUsdc(0);
      setSol(0);
      return;
    }
    const [pos, bal, lamports] = await Promise.all([
      fetchPosition(readProgram, publicKey, marketPk),
      fetchUsdcBalance(connection, publicKey),
      connection.getBalance(publicKey),
    ]);
    setPosition(pos);
    setUsdc(bal);
    setSol(lamports / 1e9);
  }, [publicKey, marketPk, readProgram, connection]);

  useEffect(() => {
    let alive = true;
    refreshUser();
    const id = setInterval(() => alive && refreshUser(), 1600);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [refreshUser]);

  const open = useCallback(
    async (side: number, sizeUsdc: number) => {
      if (!signerProgram || !publicKey || !marketPk) return;
      setError(null);
      setBusy("open");
      try {
        const tx = await openPositionTx(signerProgram, publicKey, marketPk, side, sizeUsdc);
        setLastTx(tx);
        await refreshUser();
      } catch (e: unknown) {
        setError(friendlyError(e));
      } finally {
        setBusy(null);
      }
    },
    [signerProgram, publicKey, marketPk, refreshUser],
  );

  const close = useCallback(async () => {
    if (!signerProgram || !publicKey || !marketPk) return;
    setError(null);
    setBusy("close");
    try {
      const tx = await closePositionTx(signerProgram, publicKey, marketPk);
      setLastTx(tx);
      await refreshUser();
    } catch (e: unknown) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }, [signerProgram, publicKey, marketPk, refreshUser]);

  const faucet = useCallback(async () => {
    if (!publicKey) return;
    setError(null);
    setBusy("faucet");
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: publicKey.toBase58() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Faucet failed");
      setLastTx(data.tx ?? null);
      await refreshUser();
    } catch (e: unknown) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }, [publicKey, refreshUser]);

  const curBps = market?.probBps ?? 0;
  const livePnl = position ? computePnl(position.side, position.size, position.entryProbBps, curBps) : 0;

  return {
    connected,
    featured,
    fixtureId: featured?.fixtureId ?? null,
    marketPda: featured?.marketPda ?? null,
    marketReady: !!market,
    market,
    historyBps,
    position,
    usdc,
    sol,
    livePnl,
    busy,
    error,
    lastTx,
    open,
    close,
    faucet,
    clearError: () => setError(null),
  };
}

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/insufficient funds|0x1\b|debit an account/i.test(msg)) return "Not enough SOL for fees — get devnet SOL first.";
  if (/InsufficientLiquidity/i.test(msg)) return "Vault can't cover this right now.";
  if (/User rejected|rejected the request/i.test(msg)) return "You cancelled the transaction.";
  if (/could not find|account.*not.*found|AccountNotInitialized/i.test(msg)) return "Get test USDC first, then trade.";
  return msg.length > 120 ? msg.slice(0, 120) + "…" : msg;
}
