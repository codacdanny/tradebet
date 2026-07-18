import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  type Transaction,
  type VersionedTransaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import idl from "./inplay.json";
import type { Inplay } from "./inplay";
import deployment from "./deployment.json";

export type TradebetProgram = Program<Inplay>;

export const DEPLOYMENT = deployment;
export const PROGRAM_ID = new PublicKey(deployment.programId);
export const USDC_MINT = new PublicKey(deployment.usdcMint);
export const USDC_DECIMALS = deployment.usdcDecimals;
export const CONFIG_PDA = new PublicKey(deployment.config);
export const VAULT_TOKEN_ACCOUNT = new PublicKey(deployment.vaultTokenAccount);
export const VAULT_AUTHORITY = new PublicKey(deployment.vaultAuthority);

export const SIDE_LONG = 0;
export const SIDE_SHORT = 1;

/** The current featured market, resolved at runtime from /api/market. */
export interface FeaturedMarket {
  fixtureId: string;
  outcome: number;
  marketPda: string;
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  competition: string;
  startTime: number;
  exists: boolean;
}

function u64le(nStr: string): Uint8Array {
  let x = BigInt(nStr);
  const a = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    a[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return a;
}

/** Deterministic market PDA: ["market", fixtureId_le, outcome]. */
export function deriveMarketPda(fixtureId: string, outcome: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("market"), u64le(fixtureId), new Uint8Array([outcome])],
    PROGRAM_ID,
  )[0];
}

export interface SignerWallet {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
}

export function getProgram(connection: Connection, wallet: SignerWallet): TradebetProgram {
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  return new Program(idl as Inplay, provider);
}

export function positionPda(user: PublicKey, market: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("position"), market.toBytes(), user.toBytes()],
    PROGRAM_ID,
  )[0];
}

export function userUsdcAta(user: PublicKey) {
  return getAssociatedTokenAddressSync(USDC_MINT, user);
}

export function toBaseUnits(usdc: number): BN {
  return new BN(Math.round(usdc * 10 ** USDC_DECIMALS));
}

export interface MarketState {
  probBps: number;
  isSettled: boolean;
  resultBps: number;
  totalLong: number;
  totalShort: number;
  lastUpdateTs: number;
}

export async function fetchMarket(program: TradebetProgram, market: PublicKey): Promise<MarketState | null> {
  try {
    const m = await program.account.market.fetch(market);
    return {
      probBps: m.probBps,
      isSettled: m.isSettled,
      resultBps: m.resultBps,
      totalLong: Number(m.totalLong) / 10 ** USDC_DECIMALS,
      totalShort: Number(m.totalShort) / 10 ** USDC_DECIMALS,
      lastUpdateTs: Number(m.lastUpdateTs),
    };
  } catch {
    return null; // market not created yet
  }
}

export interface PositionState {
  side: number;
  size: number;
  entryProbBps: number;
  isOpen: boolean;
}

export async function fetchPosition(
  program: TradebetProgram,
  user: PublicKey,
  market: PublicKey,
): Promise<PositionState | null> {
  try {
    const p = await program.account.position.fetch(positionPda(user, market));
    if (!p.isOpen) return null;
    return {
      side: p.side,
      size: Number(p.size) / 10 ** USDC_DECIMALS,
      entryProbBps: p.entryProbBps,
      isOpen: p.isOpen,
    };
  } catch {
    return null;
  }
}

export async function fetchUsdcBalance(connection: Connection, user: PublicKey): Promise<number> {
  try {
    const bal = await connection.getTokenAccountBalance(userUsdcAta(user));
    return bal.value.uiAmount ?? 0;
  } catch {
    return 0;
  }
}

export async function openPositionTx(
  program: TradebetProgram,
  user: PublicKey,
  market: PublicKey,
  side: number,
  sizeUsdc: number,
): Promise<string> {
  return program.methods
    .openPosition(side, toBaseUnits(sizeUsdc))
    .accountsPartial({
      user,
      config: CONFIG_PDA,
      market,
      position: positionPda(user, market),
      vaultTokenAccount: VAULT_TOKEN_ACCOUNT,
      userTokenAccount: userUsdcAta(user),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function closePositionTx(
  program: TradebetProgram,
  user: PublicKey,
  market: PublicKey,
): Promise<string> {
  return program.methods
    .closePosition()
    .accountsPartial({
      user,
      config: CONFIG_PDA,
      market,
      position: positionPda(user, market),
      vaultTokenAccount: VAULT_TOKEN_ACCOUNT,
      vaultAuthority: VAULT_AUTHORITY,
      userTokenAccount: userUsdcAta(user),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

export function computePnl(side: number, sizeUsdc: number, entryBps: number, curBps: number): number {
  const delta = side === SIDE_LONG ? curBps - entryBps : entryBps - curBps;
  return (delta / 10000) * sizeUsdc;
}
