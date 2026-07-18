import { NextResponse } from "next/server";
import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram, type Transaction } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";
import deployment from "@/lib/program/deployment.json";
import idl from "@/lib/program/inplay.json";

export const runtime = "nodejs";
export const revalidate = 0;

const TXLINE_HOST = "https://txline-dev.txodds.com";
const PROGRAM_ID = new PublicKey(deployment.programId);
const CONFIG_PDA = new PublicKey(deployment.config);

const CODES: Record<string, string> = {
  France: "FRA", Spain: "ESP", England: "ENG", Argentina: "ARG", Brazil: "BRA",
  Australia: "AUS", Vietnam: "VIE", Myanmar: "MYA", "New Zealand": "NZL", India: "IND",
  Nigeria: "NGA", Portugal: "POR", Germany: "GER", Netherlands: "NED", Croatia: "CRO",
};
const code = (n: string) => CODES[n] ?? n.slice(0, 3).toUpperCase();

interface Featured {
  fixtureId: string;
  outcome: number;
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  competition: string;
  startTime: number;
}

// Cache the selection briefly so we don't re-select / re-create every request.
let cache: { at: number; data: Featured } | null = null;

function loadKeeper(): Keypair {
  const env = process.env.FAUCET_SECRET_KEY;
  if (env) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(env)));
  const p = path.resolve(process.cwd(), "..", "keeper", "keeper-keypair.json");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8"))));
}

function loadCreds(): { jwt: string; apiToken: string } | null {
  // On Vercel/serverless the keeper file isn't present — use env vars.
  if (process.env.TXLINE_JWT && process.env.TXLINE_API_TOKEN) {
    return { jwt: process.env.TXLINE_JWT, apiToken: process.env.TXLINE_API_TOKEN };
  }
  try {
    const p = path.resolve(process.cwd(), "..", "keeper", "credentials.json");
    const c = JSON.parse(fs.readFileSync(p, "utf8"));
    if (c.jwt && c.apiToken) return c;
  } catch {}
  return null;
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
function marketPda(fixtureId: string, outcome: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("market"), u64le(fixtureId), new Uint8Array([outcome])],
    PROGRAM_ID,
  )[0];
}

function pickFeatured(fx: Array<Record<string, unknown>>): Featured | null {
  const now = Date.now();
  const norm = fx
    .filter((f) => f.Participant1 && f.Participant2)
    .map((f) => ({ f, wc: String(f.Competition ?? "").toLowerCase().includes("world cup"), st: Number(f.StartTime ?? 0) }));
  const wc = norm.filter((n) => n.wc);
  const pool = wc.length ? wc : norm;

  const inPlay = pool.filter((n) => n.st <= now && now - n.st < 140 * 60_000);
  let chosen;
  if (inPlay.length) chosen = inPlay.sort((a, b) => b.st - a.st)[0];
  else {
    const upcoming = pool.filter((n) => n.st > now).sort((a, b) => a.st - b.st);
    chosen = upcoming[0] ?? pool.sort((a, b) => b.st - a.st)[0];
  }
  if (!chosen) return null;
  const f = chosen.f;
  const home = String(f.Participant1);
  const away = String(f.Participant2);
  return {
    fixtureId: String(f.FixtureId),
    outcome: 0,
    home,
    away,
    homeCode: code(home),
    awayCode: code(away),
    competition: String(f.Competition ?? ""),
    startTime: Number(f.StartTime ?? 0),
  };
}

function deploymentFallback(): Featured {
  const m = deployment.market;
  return {
    fixtureId: m.fixtureId, outcome: m.outcome, home: m.home, away: m.away,
    homeCode: m.homeCode, awayCode: m.awayCode, competition: "World Cup", startTime: 0,
  };
}

async function ensureMarket(connection: Connection, featured: Featured, pda: PublicKey): Promise<boolean> {
  if (await connection.getAccountInfo(pda)) return true;
  try {
    const keeper = loadKeeper();
    // Minimal signer wallet (anchor.Wallet/NodeWallet isn't in the bundled ESM build).
    const wallet = {
      publicKey: keeper.publicKey,
      signTransaction: async (tx: Transaction) => {
        tx.partialSign(keeper);
        return tx;
      },
      signAllTransactions: async (txs: Transaction[]) => {
        txs.forEach((t) => t.partialSign(keeper));
        return txs;
      },
    };
    const provider = new AnchorProvider(connection, wallet as never, { commitment: "confirmed" });
    const program = new Program(idl as Idl, provider);
    await program.methods
      .initMarket(new BN(featured.fixtureId), featured.outcome, 5000)
      .accountsPartial({ oracle: keeper.publicKey, config: CONFIG_PDA, market: pda, systemProgram: SystemProgram.programId })
      .rpc();
    return true;
  } catch {
    return false; // couldn't create (frontend will show the match, price pending)
  }
}

export async function GET() {
  const creds = loadCreds();
  let featured: Featured | null = null;

  if (cache && Date.now() - cache.at < 25_000) {
    featured = cache.data;
  } else if (creds) {
    try {
      const res = await fetch(`${TXLINE_HOST}/api/fixtures/snapshot`, {
        headers: { Authorization: `Bearer ${creds.jwt}`, "X-Api-Token": creds.apiToken },
        cache: "no-store",
      });
      if (res.ok) featured = pickFeatured(await res.json());
    } catch {}
    if (featured) cache = { at: Date.now(), data: featured };
  }
  if (!featured) featured = deploymentFallback();

  const pda = marketPda(featured.fixtureId, featured.outcome);
  const connection = new Connection(deployment.rpc, "confirmed");
  const exists = await ensureMarket(connection, featured, pda);

  return NextResponse.json({ ...featured, marketPda: pda.toBase58(), exists });
}
