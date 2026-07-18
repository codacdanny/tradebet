/**
 * TxLINE free World Cup tier onboarding (devnet).
 *
 *   guest auth (JWT)  ->  on-chain subscribe (free, level 1)  ->  activate API token
 *
 * Follows https://txline.txodds.com/documentation/worldcup. Uses a dedicated
 * throwaway keeper keypair (see ../keeper-keypair.json) — no personal wallet
 * involved. Saves { jwt, apiToken } to ../credentials.json for the streamer.
 */
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import axios from "axios";
import nacl from "tweetnacl";
import fs from "node:fs";
import { NETWORK, active, apiBaseUrl, makeProgram, loadKeeper, CREDENTIALS_PATH } from "./config.ts";

const SERVICE_LEVEL_ID = 1; // free tier (devnet level 1 ≈ real-time)
const DURATION_WEEKS = 4;
const SELECTED_LEAGUES: number[] = [];

async function main() {
  const { program, provider, connection, keypair } = makeProgram();
  console.log(`network: ${NETWORK}`);
  console.log(`keeper:  ${keypair.publicKey.toBase58()}`);

  const bal = await connection.getBalance(keypair.publicKey);
  console.log(`balance: ${(bal / 1e9).toFixed(4)} SOL`);
  if (bal === 0) {
    throw new Error(
      `Keeper wallet has 0 SOL on ${NETWORK}. Fund it first:\n` +
        `  solana airdrop 1 ${keypair.publicKey.toBase58()} --url ${active.rpcUrl}\n` +
        `  or paste the address into https://faucet.solana.com (Devnet).`,
    );
  }

  const txlTokenMint = active.txlTokenMint;

  // Ensure the keeper's TxL token account exists (subscribe needs it, even at 0 balance).
  console.log("ensuring TxL token account…");
  await getOrCreateAssociatedTokenAccount(
    connection,
    keypair,
    txlTokenMint,
    keypair.publicKey,
    false,
    "confirmed",
    undefined,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    program.programId,
  );
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    txlTokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    program.programId,
  );
  const userTokenAccount = getAssociatedTokenAddressSync(
    txlTokenMint,
    provider.wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  console.log(`subscribing (level ${SERVICE_LEVEL_ID}, ${DURATION_WEEKS} weeks)…`);
  const txSig = await program.methods
    .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
    .accounts({
      user: provider.wallet.publicKey,
      pricingMatrix: pricingMatrixPda,
      tokenMint: txlTokenMint,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`subscribed. txSig: ${txSig}`);

  // Guest auth
  const authResponse = await axios.post(`${active.apiOrigin}/auth/guest/start`);
  const jwt: string = authResponse.data.token;
  console.log("guest JWT obtained.");

  // Sign activation message and activate the API token
  const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
  const message = new TextEncoder().encode(messageString);
  const signatureBytes = nacl.sign.detached(message, loadKeeper().secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");

  const activationResponse = await axios.post(
    `${apiBaseUrl}/token/activate`,
    { txSig, walletSignature, leagues: SELECTED_LEAGUES },
    { headers: { Authorization: `Bearer ${jwt}` } },
  );
  const apiToken: string = activationResponse.data.token || activationResponse.data;
  console.log("API token activated ✅");

  fs.writeFileSync(
    CREDENTIALS_PATH,
    JSON.stringify({ network: NETWORK, jwt, apiToken, txSig, activatedAt: new Date().toISOString() }, null, 2),
  );
  console.log(`credentials saved -> ${CREDENTIALS_PATH}`);
}

main().catch((e) => {
  console.error("onboard failed:", e?.response?.data ?? e?.message ?? e);
  process.exit(1);
});
