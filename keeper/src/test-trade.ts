/**
 * End-to-end on-chain trade proof against the deployed devnet program:
 *   fund a fresh user -> open long -> oracle moves price -> close for PnL.
 * All real devnet transactions. Validates the exact instruction/account
 * wiring the frontend will use.
 */
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const d = JSON.parse(fs.readFileSync(path.join(ROOT, "deployment.json"), "utf8"));

const connection = new Connection(d.rpc, "confirmed");
const keeper = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(path.join(ROOT, "keeper-keypair.json"), "utf8"))),
);
const idl = JSON.parse(fs.readFileSync(path.join(ROOT, "idl", "inplay.json"), "utf8"));

const usdcMint = new PublicKey(d.usdcMint);
const configPda = new PublicKey(d.config);
const vaultTokenAccount = new PublicKey(d.vaultTokenAccount);
const vaultAuthority = new PublicKey(d.vaultAuthority);
const marketPda = new PublicKey(d.market.pda);
const programId = new PublicKey(d.programId);
const usd = (n: number) => new anchor.BN(n).mul(new anchor.BN(1_000_000));

function programFor(kp: Keypair) {
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(kp), { commitment: "confirmed" });
  return new anchor.Program(idl, provider);
}

async function main() {
  const oracleProgram = programFor(keeper);

  // Fresh user, funded with SOL (from keeper) + mock USDC (keeper is mint authority).
  const user = Keypair.generate();
  console.log("user:", user.publicKey.toBase58());
  const fundTx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: keeper.publicKey, toPubkey: user.publicKey, lamports: 0.1 * LAMPORTS_PER_SOL }),
  );
  await sendAndConfirmTransaction(connection, fundTx, [keeper]);
  const userUsdc = await getOrCreateAssociatedTokenAccount(connection, keeper, usdcMint, user.publicKey);
  await mintTo(connection, keeper, usdcMint, userUsdc.address, keeper, BigInt(usd(500).toString()));
  console.log("funded user: 0.1 SOL + 500 mock USDC");

  const userProgram = programFor(user);
  const [positionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("position"), marketPda.toBuffer(), user.publicKey.toBuffer()],
    programId,
  );

  const before = Number((await getAccount(connection, userUsdc.address)).amount) / 1e6;
  const mkt0: any = await userProgram.account.market.fetch(marketPda);
  console.log(`market prob before: ${mkt0.probBps / 100}%  | user USDC: ${before}`);

  // Open a 100 USDC long
  await userProgram.methods
    .openPosition(0, usd(100))
    .accountsPartial({
      user: user.publicKey,
      config: configPda,
      market: marketPda,
      position: positionPda,
      vaultTokenAccount,
      userTokenAccount: userUsdc.address,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  const pos: any = await userProgram.account.position.fetch(positionPda);
  console.log(`opened LONG 100 USDC @ ${pos.entryProbBps / 100}%`);

  // Oracle pushes the price up (France scores)
  const newProb = Math.min(9500, mkt0.probBps + 1800);
  await oracleProgram.methods
    .updatePrice(newProb)
    .accountsPartial({ oracle: keeper.publicKey, config: configPda, market: marketPda })
    .rpc();
  console.log(`oracle pushed price -> ${newProb / 100}%`);

  // Close (cash out)
  await userProgram.methods
    .closePosition()
    .accountsPartial({
      user: user.publicKey,
      config: configPda,
      market: marketPda,
      position: positionPda,
      vaultTokenAccount,
      vaultAuthority,
      userTokenAccount: userUsdc.address,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  const after = Number((await getAccount(connection, userUsdc.address)).amount) / 1e6;
  console.log(`closed. user USDC: ${before} -> ${after}  (net ${(after - before).toFixed(2)})`);
  console.log(after > before ? "✅ on-chain trade cycle works, user profited." : "⚠️ check math");
}

main().catch((e) => {
  console.error("test-trade failed:", e?.message ?? e);
  if (e?.logs) console.error(e.logs.join("\n"));
  process.exit(1);
});
