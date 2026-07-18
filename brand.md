# Brand — TRADEBET

_Status: active_

**TRADEBET** = **TRAD**e + **BET**. A live perpetual market for football win-probability, built on Solana, priced by TxODDS. Trade a team's live chance of winning like a stock — buy, sell, and cash out any second during the match.

## Positioning & voice

- **What it feels like:** a professional trading terminal (Hyperliquid / Drift / a Bloomberg for football), not a betting site. Fast, precise, high-signal, a little adrenaline.
- **Tone:** confident, sharp, trader-native. Short active sentences. "Go long." "Cash out." "Nigeria climbing." "Live now."
- **Avoid:** gambling-site clichés (gold coins, dice, "JACKPOT"), hype-speak, exclamation spam. Never look garish.

## Palette (dark-first — this product is dark by default)

Backgrounds (near-black, cool undertone):
- `--background` base: `#06080A`
- `--surface` (cards): `#0D1218`
- `--surface-elevated` (panels/popovers): `#141B23`
- `--border`: `#1E2831` (≈ white @ 8%)
- `--border-strong`: `#2A3742`

Text:
- `--foreground`: `#E9EFF3`
- `--muted-foreground`: `#8B99A7`
- `--faint`: `#55636F`

Signal colors (the important ones — this is a trading UI):
- **`--long` / brand / profit:** neon mint-green `#39FF88` (solid button variant `#1FD873`)
- **`--short` / loss:** hot rose-red `#FF3D6E`
- **`--accent` / data & glow:** electric cyan `#38D6FF`
- **`--live`:** amber `#FFC24B` (LIVE dot / clock — deliberately NOT red, to avoid colliding with short/loss)

Primary brand color is the neon green `#39FF88` — it means brand, "long", and "profit" all at once (the product is about winning). Green = up, red = down, everywhere, consistently.

## Gradients

- **Brand gradient:** `#39FF88 → #38D6FF` (green→cyan) — logo glow, hero highlights, key CTAs.
- **Loss gradient:** `#FF3D6E → #FF7A3D` — short/down emphasis.
- **Hero background:** radial green + cyan blooms (low opacity) floating on `#06080A`, plus a faint grid.

## Typography

- **Display / headings / logo wordmark:** **Space Grotesk** (geometric, futuristic). Uppercase + tight tracking for the wordmark and hero.
- **Body / UI:** **Inter**.
- **Numbers — prices, probability, PnL, odds, addresses:** **JetBrains Mono**, always tabular (`font-variant-numeric: tabular-nums`). Numbers must never shift width as they tick.

## Shape & motion

- **Radius:** cards `12px`, controls/buttons `8–10px`, pills full. Tight, terminal-like.
- **Motion:** fast and snappy — micro-interactions `150ms`, transitions `200–250ms`. Price ticks flash green/red then settle. Glows pulse slowly (`~3s`). Always gate non-essential motion behind `prefers-reduced-motion`.
- **Signature effects:** subtle neon glow on live/active elements (`box-shadow` in brand green/cyan at low alpha), thin 1px hairline borders, faint background grid, monospace tickers.

## Logo

- **Wordmark:** `TRADEBET` in Space Grotesk, uppercase, tight tracking. "TRADE" in foreground, "BET" in the green→cyan brand gradient (or green fill).
- **Mark:** ascending candlesticks resolving into an upward arrow/tick — trading + momentum — in the brand gradient, with the tallest bar (the "goal"/breakout) pulsing. Implemented as an inline animatable SVG component (`components/logo.tsx`).

## Reference

Full design rules live in the `frontend-design-guidelines` skill. This file is the source of truth for color, type, and voice on TRADEBET.
