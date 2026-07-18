import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const NETWORK: "mainnet" | "devnet" =
  (process.env.TXLINE_NETWORK as "mainnet" | "devnet") || "devnet";

export const CONFIG = {
  mainnet: {
    rpcUrl: "https://api.mainnet-beta.solana.com",
    apiOrigin: "https://txline.txodds.com",
    programId: new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"),
    txlTokenMint: new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL"),
  },
  devnet: {
    rpcUrl: "https://api.devnet.solana.com",
    apiOrigin: "https://txline-dev.txodds.com",
    programId: new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
    txlTokenMint: new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
  },
} as const;

export const active = CONFIG[NETWORK];
export const apiBaseUrl = `${active.apiOrigin}/api`;

export function loadKeeper(): Keypair {
  const raw = JSON.parse(
    fs.readFileSync(path.join(ROOT, "keeper-keypair.json"), "utf8"),
  );
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

export function loadIdl(): anchor.Idl {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "idl", "txoracle.json"), "utf8"));
}

export function makeProgram() {
  const keypair = loadKeeper();
  const connection = new Connection(active.rpcUrl, "confirmed");
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  const program = new anchor.Program(loadIdl(), provider);
  return { program, provider, connection, keypair, wallet };
}

export const CREDENTIALS_PATH = path.join(ROOT, "credentials.json");
