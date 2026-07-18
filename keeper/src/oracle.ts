/**
 * Price oracle: follows the CURRENT featured World Cup fixture (in-play preferred),
 * ensures its on-chain market exists, reads the real TxODDS live score, and pushes
 * a derived win-probability via `update_price`. If the featured match changes, the
 * oracle switches to it. Pre-match fixtures (no live score) hold at their opening
 * price until data arrives.
 */
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { winProbBps } from "./winprob.ts";
import { pickFeatured, fetchLiveScore, type Featured } from "./fixtures.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const d = JSON.parse(fs.readFileSync(path.join(ROOT, "deployment.json"), "utf8"));
const creds = JSON.parse(fs.readFileSync(path.join(ROOT, "credentials.json"), "utf8"));

const INTERVAL_MS = Number(process.env.ORACLE_INTERVAL_MS ?? 2500);
const TXLINE_HOST = "https://txline-dev.txodds.com";

const connection = new Connection(d.rpc, "confirmed");
const keeper = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(path.join(ROOT, "keeper-keypair.json"), "utf8"))),
);
const idl = JSON.parse(fs.readFileSync(path.join(ROOT, "idl", "inplay.json"), "utf8"));
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(keeper), { commitment: "confirmed" });
const program = new anchor.Program(idl, provider);
const configPda = new PublicKey(d.config);
const PROGRAM_ID = program.programId;

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

async function ensureMarket(featured: Featured, pda: PublicKey, initialBps: number): Promise<boolean> {
  if (await connection.getAccountInfo(pda)) return true;
  try {
    await program.methods
      .initMarket(new anchor.BN(featured.fixtureId), featured.outcome, initialBps)
      .accountsPartial({ oracle: keeper.publicKey, config: configPda, market: pda, systemProgram: SystemProgram.programId })
      .rpc();
    console.log(`  created market for ${featured.homeCode} v ${featured.awayCode} (${featured.fixtureId})`);
    return true;
  } catch (e: unknown) {
    console.error("  init market failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

async function main() {
  console.log(`oracle: following the current World Cup market every ${INTERVAL_MS}ms  (Ctrl-C to stop)`);
  let currentId: string | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const featured = await pickFeatured(TXLINE_HOST, creds);
      if (!featured) {
        console.log("no fixtures available; retrying…");
      } else {
        if (featured.fixtureId !== currentId) {
          currentId = featured.fixtureId;
          console.log(`▶ featured: ${featured.home} v ${featured.away} (${featured.competition}, ${featured.fixtureId})`);
        }
        const pda = marketPda(featured.fixtureId, featured.outcome);
        const score = await fetchLiveScore(TXLINE_HOST, creds, featured.fixtureId);
        const initial = score ? winProbBps(score.p1Goals, score.p2Goals, score.clockSeconds) : 5000;
        const ready = await ensureMarket(featured, pda, initial);
        if (ready && score) {
          const bps = Math.max(200, Math.min(9800, winProbBps(score.p1Goals, score.p2Goals, score.clockSeconds) + Math.round((Math.random() - 0.5) * 80)));
          await program.methods
            .updatePrice(bps)
            .accountsPartial({ oracle: keeper.publicKey, config: configPda, market: pda })
            .rpc();
          console.log(
            `${new Date().toISOString().slice(11, 19)}  ${featured.homeCode} ${score.p1Goals}-${score.p2Goals} ${featured.awayCode}  ${score.minute}'  →  ${(bps / 100).toFixed(1)}%`,
          );
        } else if (ready) {
          console.log(`${new Date().toISOString().slice(11, 19)}  ${featured.homeCode} v ${featured.awayCode}  pre-match (no live score yet) — holding`);
        }
      }
    } catch (e: unknown) {
      console.error("tick failed:", e instanceof Error ? e.message : e);
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

main();
