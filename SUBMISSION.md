# TRADEBET — Submission

**Track:** Prediction Markets & Settlement ($18,000)
**Hackathon:** TxODDS × Superteam × Solana World Cup Hackathon

---

## One-liner

**Gains Network, but the asset is a football team's live chance of winning.** TRADEBET turns
a team's win-probability into a live, tradeable price — go long or short, cash out any second
during the match — priced by TxODDS TxLINE and settled trustlessly on Solana.

## The problem

Every on-chain "sports bet" today is the same: pick a winner, lock your money, wait 90 minutes.
No live trading. No cashing out when you're ahead. No hedging. And settlement runs on slow,
crowd-voted oracles that have paid out *wrong* results and take days to resolve.

## The product

On TRADEBET, "France to win" isn't a yes/no bet — it's a **price that moves during the match.**

- **Go long** if you think a team's chance will rise, **short** if you think it'll fall.
- **Cash out any second** — closing a winning position early is built in (no more sweating the 90th minute).
- **Prices come from TxODDS** — the same professional data feed bookmakers use, not an amateur scores API.
- **Settlement is instant and trustless** — verified against TxLINE's on-chain Merkle root. Nothing to dispute, nothing to wait for.

Only possible because of **TxODDS** (professional, low-latency, de-vigged probability) **+ Solana**
(continuous, near-free repricing). Neither works without the other.

## How it works (architecture)

```
TxODDS TxLINE  ──►  Keeper/Oracle  ──►  Solana program (devnet)  ──►  Web terminal
 live scores &      derives live         markets, vault,               real wallet,
 odds feed          win-probability       positions, settlement         live price, trades
```

1. **TxLINE feed** — we onboard to TxODDS's on-chain data API (guest auth → on-chain subscription
   → activated token), and stream live fixtures + scores for all World Cup matches.
2. **Oracle** — reads the live match state (goals, clock) and derives a win-probability, pushing it
   on-chain via `update_price`. (On mainnet this reads TxLINE's de-vigged `Pct[]` odds directly.)
3. **Anchor program** (deployed to devnet) — holds a USDC liquidity vault; users open/close 1x
   positions against it; PnL = probability move × size; settlement snaps to 0/100% verified against
   TxLINE's Merkle root.
4. **Web terminal** — connect a Solana wallet (that's the login), see the live price + score + stats,
   and open/close positions as real signed transactions. A test-USDC faucet gets anyone started.

## What's live

- **Program on Solana devnet:** `DYpHFBX8yk77JAwEKkv53e8Ks7fJjB6wMChDm51oQvUB`
  (explorer: https://explorer.solana.com/address/DYpHFBX8yk77JAwEKkv53e8Ks7fJjB6wMChDm51oQvUB?cluster=devnet)
- **TxLINE integration:** proven end-to-end on devnet — real subscription, activated API token,
  live fixtures & scores flowing into the app (Live / Upcoming / Results).
- **Full web app:** landing + markets hub + on-chain trading terminal + reproducible match replay.

## Tech stack

- **On-chain:** Rust + Anchor 0.31, SPL Token, deployed to Solana devnet.
- **Data:** TxODDS TxLINE (on-chain sports data API) — fixtures, live scores, odds; Merkle-proof settlement.
- **Keeper:** TypeScript (@coral-xyz/anchor, @solana/web3.js) — onboarding, live pricing oracle.
- **Frontend:** Next.js 16, React 19, Tailwind v4, three.js (3D hero), Solana Wallet Adapter.

## Judging-criteria fit

- **Functionality:** a working, deployed on-chain product you can trade on devnet today.
- **Novelty:** live, tradeable, cash-out-able match markets — a primitive that doesn't exist on-chain.
- **Solana-native:** continuous repricing + instant settlement need Solana's speed and low fees.
- **Uses TxLINE:** it's the pricing *and* settlement layer — not a checkbox, the core of the product.

---

## Demo / how to run

**Live app (running locally):** `http://localhost:3000`
- Landing → **Markets** (live / upcoming / results from the real TxODDS feed)
- **/trade** — the on-chain terminal (connect Phantom on devnet, "Get test USDC", then long/short)
- **/demo** — a reproducible full-match replay (best for the video; never depends on a live match)

**To run from scratch:**
```bash
# 1. price the current market (keeper) — reads live TxODDS scores, pushes on-chain
cd keeper && npx tsx src/oracle.ts

# 2. the web app
cd frontend && npm run build && npm run start   # http://localhost:3000
```

**Trying it with a wallet:** Phantom → Settings → Developer Settings → enable Testnet Mode →
switch to Devnet → get a little SOL from faucet.solana.com → open /trade → Connect →
"Get 500 test USDC" → go long/short → cash out.

---

## Pitch video script (≤ 3 min)

1. **Hook (0:00–0:20):** "On-chain sports betting means picking a winner and waiting 90 minutes.
   TRADEBET lets you *trade* the match — like a stock — and cash out any second."
2. **The market (0:20–0:50):** Landing → Markets hub. "Real World Cup fixtures, live from TxODDS.
   Here's a match in play, what's next, and full-time results with real stats."
3. **The trade (0:50–2:00):** Open **/demo** (reliable live match). Buy the underdog at a low %,
   a goal drops, the price jumps, **cash out for profit** — on-chain, in seconds. Show the wallet tx.
4. **Why it's only possible here (2:00–2:40):** TxODDS gives the professional live probability;
   Solana makes continuous repricing + instant, Merkle-verified settlement possible. Show the
   program on the explorer.
5. **Close (2:40–3:00):** "Trade the match, live. Built on Solana, powered by TxODDS."

## Technical demo video (2–3 min)

Walk through: the Anchor program (markets/vault/positions/settlement), the keeper onboarding to
TxLINE + the live-pricing oracle, and the frontend reading on-chain state + signing real trades.
Emphasize the Merkle-proof settlement path as the differentiator vs crowd-voted oracles.
