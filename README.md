# TRADEBET ⚽📈

**Trade the match, live.** A perpetual prediction market for football win-probability — priced
tick-by-tick by professional bookmaker data (**TxODDS TxLINE**), traded on **Solana**, settled
trustlessly on-chain.

Built for the **TxODDS × Superteam × Solana World Cup Hackathon** — **Prediction Markets &
Settlement** track.

- 🌐 **Live app:** https://the-tradebet-beta.vercel.app
- 🎬 **Demo video:** https://drive.google.com/file/d/14AvNvhb5R1oOIBbWa6fe-kxBK25CZHy1/view?usp=drivesdk
- 🐦 **X post:** https://x.com/codacdanny/status/2078746017868976233
- ⛓️ **Program (Solana devnet):** [`DYpHFBX8yk77JAwEKkv53e8Ks7fJjB6wMChDm51oQvUB`](https://explorer.solana.com/address/DYpHFBX8yk77JAwEKkv53e8Ks7fJjB6wMChDm51oQvUB?cluster=devnet)

---

## The idea

Every match outcome (e.g. *"France to win"*) has a price equal to its **live implied
probability**, derived from the TxODDS feed. You go **long** (bet the chance rises) or **short**
(bet it falls), and you can **close any second for PnL** — a perpetual future on a football match.

- **Closing early = cash-out. Shorting = hedging.** The two features every on-chain sportsbook
  lacks — here they fall out for free.
- **Only possible with TxODDS + Solana together:** a professional, de-vigged, low-latency
  probability feed *and* a chain that can reprice continuously for fractions of a cent.
- **Trustless, instant settlement** via TxLINE's on-chain Merkle roots — no slow, disputable
  crowd-voted oracle.

## What's built

| Layer | Status |
|---|---|
| **Anchor program** | ✅ Written, tested (3/3), **deployed to Solana devnet** |
| **TxODDS TxLINE** | ✅ Onboarded (on-chain subscribe → JWT → API token), streaming real World Cup fixtures, scores & stats |
| **Frontend** | ✅ Landing (3D hero) + on-chain trading terminal + reproducible demo, mobile-first |

## Architecture

Peer-to-pool (Gains/GMX model): TxLINE is a consensus *price* feed with no order book, so **the
feed is the mark price** and traders trade against a USDC vault.

```
TxODDS TxLINE  ──▶  Keeper / oracle (TS)  ──▶  update_price / settle_market  ──▶  Anchor program
 (fixtures,            derive win-prob from                                         │
  scores, stats)       live score + clock                                    USDC vault (peer-to-pool)
                                                                                    │
        Next.js app  ◀───────────────────────  live prob chart · trade · cash-out · faucet
```

- **`programs/inplay/`** — Anchor program. `Config`+vault, `Market` (per fixture outcome),
  `Position`; instructions `initialize`, `deposit_liquidity`, `init_market`, `update_price`,
  `open_position`, `close_position`, `settle_market`.
- **`keeper/`** — TypeScript service: TxLINE onboarding (`onboard.ts`), live streams
  (`stream.ts`), the price oracle that derives win-probability from live scores and pushes it
  on-chain (`oracle.ts`, `winprob.ts`), devnet bootstrap (`setup-devnet.ts`).
- **`frontend/`** — Next.js 16 app. Landing + markets hub (live / upcoming / results, real
  TxODDS data), the `/trade` on-chain terminal (real wallet, live price, real transactions,
  test-USDC faucet), and `/demo` (a reproducible match replay for the pitch video).

## Pricing & PnL (1×)

Probabilities are basis points (`0..=10000`). Collateral = size.

```
pnl_long  = size * (exit_prob − entry_prob) / 10000
pnl_short = size * (entry_prob − exit_prob) / 10000
payout    = max(0, size + pnl) − fee
```

At full time, `settle_market` snaps the mark to `0` or `10000` — closing pays out the final
result, verifiable against TxLINE's on-chain Merkle root.

## Run it locally

```bash
# 1. Anchor program (already deployed to devnet; to rebuild/test locally)
anchor build && anchor test          # runs open → goal → cash-out on a local validator

# 2. Keeper: TxLINE onboarding + live pricing oracle
cd keeper
npx tsx src/onboard.ts               # subscribe (free devnet tier) + activate API token
npx tsx src/oracle.ts                # price the current match from live TxODDS scores

# 3. Frontend
cd frontend
npm install
npm run build && npm run start       # http://localhost:3000
```

## Deploying (Vercel)

Set these environment variables (the keeper files are git-ignored secrets):

| Env var | Purpose |
|---|---|
| `TXLINE_JWT`, `TXLINE_API_TOKEN` | TxODDS credentials (from `keeper/credentials.json` after onboarding) — powers live fixtures/scores |
| `FAUCET_SECRET_KEY` | Keeper secret key JSON array — powers the test-USDC faucet + market creation |
| `SOLANA_RPC_URL` | (optional) a devnet RPC, e.g. a Helius URL, to avoid public-RPC rate limits |

> The live-pricing **oracle** (`keeper/src/oracle.ts`) is a long-running process — run it on any
> host to move the on-chain price. The `/demo` page shows the full live experience with no
> dependencies.

## Deployed devnet addresses

| | |
|---|---|
| Program | `DYpHFBX8yk77JAwEKkv53e8Ks7fJjB6wMChDm51oQvUB` |
| Mock USDC mint | `7hAubDUeJQxbrScPLKPVzHGiJsoRvCk4PaJxbMHaM3ku` |
| Config PDA | `2BuLqsX4VjYz5BKaExG6wFsKvAGGKNUypg8xiad9R8ps` |
| Vault | `GiEo9g5UQ1pSFcgZbxd6ScM6yXs4KiSgFTHo1oqKoN8r` (250k USDC liquidity) |

---

Built with Anchor, Next.js, TxODDS TxLINE, and Solana.
