use anchor_lang::prelude::*;

/// Basis-point denominator. Probabilities are stored in bps: 0 = 0%, 10000 = 100%.
pub const BPS_DENOM: i128 = 10_000;
pub const MAX_PROB_BPS: u16 = 10_000;

/// Position sides.
pub const SIDE_LONG: u8 = 0;
pub const SIDE_SHORT: u8 = 1;

/// Global protocol config + vault accounting. PDA: ["config"].
#[account]
#[derive(InitSpace)]
pub struct Config {
    /// Admin authority (can seed liquidity, create markets).
    pub admin: Pubkey,
    /// Keeper pubkey allowed to push prices and settle results from TxLINE.
    pub oracle_authority: Pubkey,
    /// The (mock, on devnet) USDC mint used as collateral.
    pub usdc_mint: Pubkey,
    /// The vault's token account holding all collateral + liquidity.
    pub vault_token_account: Pubkey,
    /// Protocol fee taken from notional on close, in bps.
    pub fee_bps: u16,
    /// LP liquidity deposited (accounting only; vault token balance is source of truth).
    pub total_liquidity: u64,
    /// Bump for the vault authority PDA (["vault_auth"]).
    pub vault_auth_bump: u8,
    /// Bump for this config PDA.
    pub bump: u8,
}

/// A tradeable market: one outcome of one fixture, priced by its live implied probability.
/// PDA: ["market", fixture_id_le, outcome].
#[account]
#[derive(InitSpace)]
pub struct Market {
    /// TxLINE fixture id.
    pub fixture_id: u64,
    /// Outcome index. MVP: 0 = participant 1 wins.
    pub outcome: u8,
    /// Current implied probability in bps (the live mark price), 0..=10000.
    pub prob_bps: u16,
    /// Unix ts of the last oracle price update.
    pub last_update_ts: i64,
    /// Whether the fixture has been settled (final result anchored).
    pub is_settled: bool,
    /// Final result in bps once settled: 10000 (outcome happened) or 0 (did not).
    pub result_bps: u16,
    /// Open long notional (sum of open long sizes), for skew/risk monitoring.
    pub total_long: u64,
    /// Open short notional.
    pub total_short: u64,
    pub bump: u8,
}

/// A user's open position on a market. PDA: ["position", market, owner].
/// MVP: one position per user per market, 1x (collateral == size).
#[account]
#[derive(InitSpace)]
pub struct Position {
    pub owner: Pubkey,
    pub market: Pubkey,
    /// SIDE_LONG or SIDE_SHORT.
    pub side: u8,
    /// Notional size in USDC base units (6 decimals). == collateral at 1x.
    pub size: u64,
    /// Probability (bps) at which the position was opened.
    pub entry_prob_bps: u16,
    pub is_open: bool,
    pub bump: u8,
}

impl Market {
    /// Compute signed PnL (in collateral base units) for a position closing at `exit_prob_bps`.
    /// Long profits as probability rises; short profits as it falls.
    pub fn pnl(side: u8, size: u64, entry_prob_bps: u16, exit_prob_bps: u16) -> i128 {
        let entry = entry_prob_bps as i128;
        let exit = exit_prob_bps as i128;
        let size = size as i128;
        let delta = match side {
            SIDE_LONG => exit - entry,
            _ => entry - exit, // SIDE_SHORT
        };
        delta * size / BPS_DENOM
    }
}
