import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { PublicKey, Keypair } from "@solana/web3.js";
import { assert } from "chai";
import { Inplay } from "../target/types/inplay";

const BPS = 10_000;
const USDC_DECIMALS = 6;
const ONE = 10 ** USDC_DECIMALS;

describe("inplay", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Inplay as Program<Inplay>;
  const admin = (provider.wallet as anchor.Wallet).payer;

  // The keeper signs price updates + settlement.
  const keeper = Keypair.generate();

  let usdcMint: PublicKey;
  let configPda: PublicKey;
  let vaultAuthPda: PublicKey;
  let vaultTokenPda: PublicKey;
  let adminAta: any;

  const FIXTURE_ID = new anchor.BN(123456);
  const OUTCOME = 0; // P1 win

  const marketPda = () =>
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        FIXTURE_ID.toArrayLike(Buffer, "le", 8),
        Buffer.from([OUTCOME]),
      ],
      program.programId
    )[0];

  before(async () => {
    // Fund the keeper so it can pay rent for markets it creates.
    const sig = await provider.connection.requestAirdrop(keeper.publicKey, 2e9);
    await provider.connection.confirmTransaction(sig);

    usdcMint = await createMint(provider.connection, admin, admin.publicKey, null, USDC_DECIMALS);

    [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
    [vaultAuthPda] = PublicKey.findProgramAddressSync([Buffer.from("vault_auth")], program.programId);
    [vaultTokenPda] = PublicKey.findProgramAddressSync([Buffer.from("vault")], program.programId);

    adminAta = await getOrCreateAssociatedTokenAccount(provider.connection, admin, usdcMint, admin.publicKey);
    await mintTo(provider.connection, admin, usdcMint, adminAta.address, admin, 1_000_000 * ONE);
  });

  it("initializes config + vault", async () => {
    await program.methods
      .initialize(keeper.publicKey, 50) // 0.5% fee
      .accounts({
        admin: admin.publicKey,
        usdcMint,
      })
      .rpc();

    const cfg = await program.account.config.fetch(configPda);
    assert.equal(cfg.oracleAuthority.toBase58(), keeper.publicKey.toBase58());
    assert.equal(cfg.feeBps, 50);
  });

  it("seeds vault liquidity", async () => {
    await program.methods
      .depositLiquidity(new anchor.BN(500_000 * ONE))
      .accounts({
        depositor: admin.publicKey,
        config: configPda,
        vaultTokenAccount: vaultTokenPda,
        depositorTokenAccount: adminAta.address,
      })
      .rpc();

    const vault = await getAccount(provider.connection, vaultTokenPda);
    assert.equal(Number(vault.amount), 500_000 * ONE);
  });

  it("creates a market at 38% and lets a long profit after a goal", async () => {
    const market = marketPda();

    await program.methods
      .initMarket(FIXTURE_ID, OUTCOME, 3800)
      .accounts({ oracle: keeper.publicKey, config: configPda, market })
      .signers([keeper])
      .rpc();

    // Give a trader USDC.
    const trader = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(trader.publicKey, 2e9)
    );
    const traderAta = await getOrCreateAssociatedTokenAccount(
      provider.connection, admin, usdcMint, trader.publicKey
    );
    await mintTo(provider.connection, admin, usdcMint, traderAta.address, admin, 1000 * ONE);

    const [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), market.toBuffer(), trader.publicKey.toBuffer()],
      program.programId
    );

    // Open a 100 USDC long at 38%.
    await program.methods
      .openPosition(0, new anchor.BN(100 * ONE))
      .accounts({
        user: trader.publicKey,
        config: configPda,
        market,
        position: positionPda,
        vaultTokenAccount: vaultTokenPda,
        userTokenAccount: traderAta.address,
      })
      .signers([trader])
      .rpc();

    // Goal! Keeper pushes probability up to 61%.
    await program.methods
      .updatePrice(6100)
      .accounts({ oracle: keeper.publicKey, config: configPda, market })
      .signers([keeper])
      .rpc();

    // Close (cash out). Expected pnl = 100 * (6100-3800)/10000 = 23 USDC, minus 0.5% fee (0.5).
    await program.methods
      .closePosition()
      .accounts({
        user: trader.publicKey,
        config: configPda,
        market,
        position: positionPda,
        vaultTokenAccount: vaultTokenPda,
        vaultAuthority: vaultAuthPda,
        userTokenAccount: traderAta.address,
      })
      .signers([trader])
      .rpc();

    const bal = Number((await getAccount(provider.connection, traderAta.address)).amount);
    // Started 1000, staked 100 -> 900, got back 100 + 23 - 0.5 = 122.5 -> 1022.5 USDC.
    const expected = (1000 - 100 + 100 + 23 - 0.5) * ONE;
    assert.equal(bal, expected, `expected ${expected}, got ${bal}`);
  });
});
