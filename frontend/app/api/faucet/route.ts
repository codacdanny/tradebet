import { NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount } from "@solana/spl-token";
import fs from "node:fs";
import path from "node:path";
import deployment from "@/lib/program/deployment.json";

export const runtime = "nodejs";

const FAUCET_AMOUNT = 500; // USDC per request
const MAX_BALANCE = 3000; // don't top up beyond this

/** Mint authority for the mock devnet USDC — same throwaway devnet key as the keeper. */
function loadAuthority(): Keypair {
  const env = process.env.FAUCET_SECRET_KEY;
  if (env) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(env)));
  const p = path.resolve(process.cwd(), "..", "keeper", "keeper-keypair.json");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8"))));
}

export async function POST(req: Request) {
  try {
    const { user } = await req.json();
    const userPk = new PublicKey(user);
    const connection = new Connection(deployment.rpc, "confirmed");
    const authority = loadAuthority();
    const mint = new PublicKey(deployment.usdcMint);

    const ata = await getOrCreateAssociatedTokenAccount(connection, authority, mint, userPk);
    const current = Number((await getAccount(connection, ata.address)).amount) / 10 ** deployment.usdcDecimals;
    if (current >= MAX_BALANCE) {
      return NextResponse.json({ error: `You already have ${current.toFixed(0)} test USDC.` }, { status: 400 });
    }

    const amount = BigInt(FAUCET_AMOUNT * 10 ** deployment.usdcDecimals);
    const tx = await mintTo(connection, authority, mint, ata.address, authority, amount);
    return NextResponse.json({ tx, amount: FAUCET_AMOUNT });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Faucet error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
