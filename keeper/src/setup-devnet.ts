/**
 * One-time devnet bootstrap for the TRADEBET (inplay) program:
 *   - creates a mock USDC mint (6 dp)
 *   - initialize() -> global config + vault (admin & oracle = keeper)
 *   - seeds the vault with liquidity
 *   - init_market() for a REAL TxLINE fixture (France v Spain, 18237038)
 * Writes deployment.json for the frontend + oracle to consume. Re-runnable
 * (skips steps whose accounts already exist).
 */
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "..");

const RPC = "https://api.devnet.solana.com";
const USDC_DECIMALS = 6;
const usd = (n: number) => new anchor.BN(n).mul(new anchor.BN(10 ** USDC_DECIMALS));

// A real World Cup fixture from the TxLINE feed.
const FIXTURE_ID = new anchor.BN(18237038); // France v Spain
const OUTCOME = 0; // participant 1 (France) to win
const INITIAL_PROB_BPS = 4500; // 45%

function keeper(): Keypair {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, "keeper-keypair.json"), "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function main() {
  const payer = keeper();
  const connection = new Connection(RPC, "confirmed");
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);
  const idl = JSON.parse(fs.readFileSync(path.join(ROOT, "idl", "inplay.json"), "utf8"));
  const program = new anchor.Program(idl, provider);
  const programId = program.programId;

  console.log("program:", programId.toBase58());
  console.log("admin/oracle/payer:", payer.publicKey.toBase58());
  console.log("balance:", (await connection.getBalance(payer.publicKey)) / 1e9, "SOL");

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
  const [vaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from("vault_auth")], programId);
  const [vaultTokenAccount] = PublicKey.findProgramAddressSync([Buffer.from("vault")], programId);

  // Reuse an existing mock USDC mint if we already made one.
  const deploymentPath = path.join(ROOT, "deployment.json");
  let usdcMint: PublicKey;
  const existing = fs.existsSync(deploymentPath)
    ? JSON.parse(fs.readFileSync(deploymentPath, "utf8"))
    : null;

  if (existing?.usdcMint) {
    usdcMint = new PublicKey(existing.usdcMint);
    console.log("reusing mock USDC mint:", usdcMint.toBase58());
  } else {
    console.log("creating mock USDC mint…");
    usdcMint = await createMint(connection, payer, payer.publicKey, null, USDC_DECIMALS);
    console.log("mock USDC mint:", usdcMint.toBase58());
  }

  // 1) initialize config + vault (skip if already initialized)
  if (await connection.getAccountInfo(configPda)) {
    console.log("config already initialized — skipping initialize().");
  } else {
    console.log("initialize()…");
    await program.methods
      .initialize(payer.publicKey, 50)
      .accountsPartial({
        admin: payer.publicKey,
        config: configPda,
        usdcMint,
        vaultAuthority,
        vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    console.log("initialized.");
  }

  // 2) mint mock USDC to admin, seed the vault with liquidity
  const adminUsdc = await getOrCreateAssociatedTokenAccount(connection, payer, usdcMint, payer.publicKey);
  await mintTo(connection, payer, usdcMint, adminUsdc.address, payer, BigInt(usd(1_000_000).toString()));
  console.log("minted 1,000,000 mock USDC to admin.");

  const vaultInfo = await connection.getTokenAccountBalance(vaultTokenAccount).catch(() => null);
  const vaultBal = vaultInfo ? Number(vaultInfo.value.uiAmount) : 0;
  if (vaultBal >= 250_000) {
    console.log(`vault already funded (${vaultBal} USDC) — skipping deposit.`);
  } else {
    console.log("deposit_liquidity(250,000)…");
    await program.methods
      .depositLiquidity(usd(250_000))
      .accountsPartial({
        depositor: payer.publicKey,
        config: configPda,
        vaultTokenAccount,
        depositorTokenAccount: adminUsdc.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log("vault seeded with 250,000 USDC.");
  }

  // 3) create the market for the real fixture
  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), FIXTURE_ID.toArrayLike(Buffer, "le", 8), Buffer.from([OUTCOME])],
    programId,
  );
  if (await connection.getAccountInfo(marketPda)) {
    console.log("market already exists — skipping init_market().");
  } else {
    console.log("init_market()…");
    await program.methods
      .initMarket(FIXTURE_ID, OUTCOME, INITIAL_PROB_BPS)
      .accountsPartial({
        oracle: payer.publicKey,
        config: configPda,
        market: marketPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("market created.");
  }

  const deployment = {
    network: "devnet",
    rpc: RPC,
    programId: programId.toBase58(),
    usdcMint: usdcMint.toBase58(),
    usdcDecimals: USDC_DECIMALS,
    config: configPda.toBase58(),
    vaultAuthority: vaultAuthority.toBase58(),
    vaultTokenAccount: vaultTokenAccount.toBase58(),
    oracleAuthority: payer.publicKey.toBase58(),
    market: {
      fixtureId: FIXTURE_ID.toString(),
      outcome: OUTCOME,
      pda: marketPda.toBase58(),
      label: "France v Spain — France to win",
      home: "France",
      away: "Spain",
      homeCode: "FRA",
      awayCode: "ESP",
    },
  };
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  fs.mkdirSync(path.join(REPO, "frontend", "lib", "program"), { recursive: true });
  fs.writeFileSync(
    path.join(REPO, "frontend", "lib", "program", "deployment.json"),
    JSON.stringify(deployment, null, 2),
  );
  console.log("\n✅ setup complete. deployment.json written (keeper/ + frontend/lib/program/).");
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((e) => {
  console.error("setup failed:", e?.message ?? e);
  if (e?.logs) console.error(e.logs.join("\n"));
  process.exit(1);
});
