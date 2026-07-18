//! InPlay — a perp DEX for live football win-probability, oracle-priced by TxODDS TxLINE.
//!
//! Each `Market` represents one outcome of one fixture (MVP: "participant 1 wins").
//! Its price is the live implied probability (bps) streamed from TxLINE's `Pct[]` feed
//! and pushed on-chain by the keeper via `update_price`. Traders go long/short that
//! probability against a shared USDC vault (peer-to-pool, Gains/GMX style — TxLINE is a
//! consensus *price* feed with no order book, so the feed *is* the mark price).
//!
//! Closing a position early = cash-out. Shorting = hedging. At full-time the keeper calls
//! `settle_market` with the TxLINE-anchored result; price snaps to 0 or 10000 and everyone
//! closes at the final mark.
//!
//! NOTE (settlement trust): MVP settlement is keeper-attested. The production path verifies
//! the result against TxLINE's on-chain Merkle root (`daily_scores_roots` PDA) via a CPI to
//! their `validateStat` instruction — see `settle_market` for the upgrade hook.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

mod errors;
mod state;

use errors::InPlayError;
use state::*;

declare_id!("DYpHFBX8yk77JAwEKkv53e8Ks7fJjB6wMChDm51oQvUB");

#[program]
pub mod inplay {
    use super::*;

    /// Initialize global config + the collateral vault. Admin/payer becomes `admin`.
    pub fn initialize(ctx: Context<Initialize>, oracle_authority: Pubkey, fee_bps: u16) -> Result<()> {
        require!(fee_bps <= 1_000, InPlayError::InvalidProb); // sanity cap: <= 10%

        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.oracle_authority = oracle_authority;
        config.usdc_mint = ctx.accounts.usdc_mint.key();
        config.vault_token_account = ctx.accounts.vault_token_account.key();
        config.fee_bps = fee_bps;
        config.total_liquidity = 0;
        config.vault_auth_bump = ctx.bumps.vault_authority;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Deposit USDC liquidity into the vault (LP / admin seeding).
    pub fn deposit_liquidity(ctx: Context<DepositLiquidity>, amount: u64) -> Result<()> {
        require!(amount > 0, InPlayError::ZeroAmount);
        token::transfer(ctx.accounts.transfer_to_vault_ctx(), amount)?;
        let config = &mut ctx.accounts.config;
        config.total_liquidity = config
            .total_liquidity
            .checked_add(amount)
            .ok_or(InPlayError::MathOverflow)?;
        Ok(())
    }

    /// Create a market for a fixture outcome with an initial implied probability.
    /// Restricted to the oracle authority (the keeper) or admin.
    pub fn init_market(
        ctx: Context<InitMarket>,
        fixture_id: u64,
        outcome: u8,
        initial_prob_bps: u16,
    ) -> Result<()> {
        require!(initial_prob_bps <= MAX_PROB_BPS, InPlayError::InvalidProb);
        let market = &mut ctx.accounts.market;
        market.fixture_id = fixture_id;
        market.outcome = outcome;
        market.prob_bps = initial_prob_bps;
        market.last_update_ts = Clock::get()?.unix_timestamp;
        market.is_settled = false;
        market.result_bps = 0;
        market.total_long = 0;
        market.total_short = 0;
        market.bump = ctx.bumps.market;
        Ok(())
    }

    /// Keeper pushes the latest live implied probability for the market.
    pub fn update_price(ctx: Context<UpdatePrice>, prob_bps: u16) -> Result<()> {
        require!(prob_bps <= MAX_PROB_BPS, InPlayError::InvalidProb);
        let market = &mut ctx.accounts.market;
        require!(!market.is_settled, InPlayError::MarketSettled);
        market.prob_bps = prob_bps;
        market.last_update_ts = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Open a 1x position. Collateral == size, transferred from user into the vault.
    /// Entry price is the market's current live probability.
    pub fn open_position(ctx: Context<OpenPosition>, side: u8, size: u64) -> Result<()> {
        require!(size > 0, InPlayError::ZeroAmount);
        require!(side == SIDE_LONG || side == SIDE_SHORT, InPlayError::InvalidSide);
        require!(!ctx.accounts.market.is_settled, InPlayError::MarketSettled);

        // Snapshot market state before taking any mutable / transfer borrows.
        let entry_prob_bps = ctx.accounts.market.prob_bps;
        let market_key = ctx.accounts.market.key();
        let user_key = ctx.accounts.user.key();

        // Pull collateral from user into the vault (immutable borrow of accounts).
        token::transfer(ctx.accounts.transfer_to_vault_ctx(), size)?;

        // Record the position.
        let position = &mut ctx.accounts.position;
        position.owner = user_key;
        position.market = market_key;
        position.side = side;
        position.size = size;
        position.entry_prob_bps = entry_prob_bps;
        position.is_open = true;
        position.bump = ctx.bumps.position;

        // Update open-interest accounting.
        let market = &mut ctx.accounts.market;
        if side == SIDE_LONG {
            market.total_long = market.total_long.checked_add(size).ok_or(InPlayError::MathOverflow)?;
        } else {
            market.total_short = market.total_short.checked_add(size).ok_or(InPlayError::MathOverflow)?;
        }
        Ok(())
    }

    /// Close a position at the current mark (live, or final if settled). Pays out
    /// collateral +/- PnL (minus fee) from the vault, then closes the position account.
    pub fn close_position(ctx: Context<ClosePosition>) -> Result<()> {
        let market = &ctx.accounts.market;
        let position = &ctx.accounts.position;
        require!(position.is_open, InPlayError::PositionClosed);

        let exit_prob = market.prob_bps;
        let pnl = Market::pnl(position.side, position.size, position.entry_prob_bps, exit_prob);

        // Gross payout = collateral + pnl, floored at 0 (1x: can't lose more than collateral).
        let mut payout: i128 = position.size as i128 + pnl;
        if payout < 0 {
            payout = 0;
        }

        // Protocol fee on notional, taken from payout.
        let fee: i128 = (position.size as i128)
            .checked_mul(ctx.accounts.config.fee_bps as i128)
            .ok_or(InPlayError::MathOverflow)?
            / BPS_DENOM;
        payout = (payout - fee).max(0);
        let payout_u64 = u64::try_from(payout).map_err(|_| InPlayError::MathOverflow)?;

        // Ensure the vault can cover it.
        require!(
            ctx.accounts.vault_token_account.amount >= payout_u64,
            InPlayError::InsufficientLiquidity
        );

        if payout_u64 > 0 {
            let bump = ctx.accounts.config.vault_auth_bump;
            let seeds: &[&[u8]] = &[b"vault_auth", &[bump]];
            let signer: &[&[&[u8]]] = &[seeds];
            token::transfer(ctx.accounts.transfer_from_vault_ctx(signer), payout_u64)?;
        }

        // Update market open-interest accounting.
        let market = &mut ctx.accounts.market;
        if position.side == SIDE_LONG {
            market.total_long = market.total_long.saturating_sub(position.size);
        } else {
            market.total_short = market.total_short.saturating_sub(position.size);
        }

        // Position account is closed (rent returned to owner) via the `close` constraint.
        Ok(())
    }

    /// Settle a market to its final result. MVP: keeper-attested (`result` true = outcome
    /// happened). Production: verify `result` against TxLINE's on-chain Merkle root before
    /// accepting (CPI to TxLINE `validateStat`); see module docs.
    pub fn settle_market(ctx: Context<SettleMarket>, result: bool) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(!market.is_settled, InPlayError::MarketSettled);

        // TODO(production): CPI into the TxLINE program to verify `result` against the
        // `daily_scores_roots` Merkle root for this fixture's epoch-day before trusting it.

        market.result_bps = if result { MAX_PROB_BPS } else { 0 };
        market.prob_bps = market.result_bps; // mark snaps to final, so close pays out correctly
        market.is_settled = true;
        market.last_update_ts = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

/* ------------------------------- Contexts ------------------------------- */

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    pub usdc_mint: Account<'info, Mint>,

    /// CHECK: PDA that owns the vault token account; no data, used only as a signer.
    #[account(seeds = [b"vault_auth"], bump)]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = admin,
        token::mint = usdc_mint,
        token::authority = vault_authority,
        seeds = [b"vault"],
        bump
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DepositLiquidity<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        address = config.vault_token_account
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = depositor_token_account.mint == config.usdc_mint @ InPlayError::InvalidProb
    )]
    pub depositor_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

impl<'info> DepositLiquidity<'info> {
    fn transfer_to_vault_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.depositor_token_account.to_account_info(),
                to: self.vault_token_account.to_account_info(),
                authority: self.depositor.to_account_info(),
            },
        )
    }
}

#[derive(Accounts)]
#[instruction(fixture_id: u64, outcome: u8)]
pub struct InitMarket<'info> {
    #[account(
        mut,
        constraint = (oracle.key() == config.oracle_authority || oracle.key() == config.admin) @ InPlayError::UnauthorizedOracle
    )]
    pub oracle: Signer<'info>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = oracle,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market".as_ref(), fixture_id.to_le_bytes().as_ref(), core::slice::from_ref(&outcome)],
        bump
    )]
    pub market: Account<'info, Market>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    #[account(
        constraint = oracle.key() == config.oracle_authority @ InPlayError::UnauthorizedOracle
    )]
    pub oracle: Signer<'info>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub market: Account<'info, Market>,
}

#[derive(Accounts)]
pub struct OpenPosition<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = user,
        space = 8 + Position::INIT_SPACE,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,

    #[account(mut, address = config.vault_token_account)]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_token_account.mint == config.usdc_mint @ InPlayError::InvalidProb,
        constraint = user_token_account.owner == user.key() @ InPlayError::InvalidProb
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> OpenPosition<'info> {
    fn transfer_to_vault_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.user_token_account.to_account_info(),
                to: self.vault_token_account.to_account_info(),
                authority: self.user.to_account_info(),
            },
        )
    }
}

#[derive(Accounts)]
pub struct ClosePosition<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        close = user,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump = position.bump,
        constraint = position.owner == user.key() @ InPlayError::PositionClosed
    )]
    pub position: Account<'info, Position>,

    #[account(mut, address = config.vault_token_account)]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA authority over the vault; validated by seeds.
    #[account(seeds = [b"vault_auth"], bump = config.vault_auth_bump)]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = user_token_account.mint == config.usdc_mint @ InPlayError::InvalidProb,
        constraint = user_token_account.owner == user.key() @ InPlayError::InvalidProb
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

impl<'info> ClosePosition<'info> {
    fn transfer_from_vault_ctx<'a>(
        &'a self,
        signer: &'a [&'a [&'a [u8]]],
    ) -> CpiContext<'a, 'a, 'a, 'info, Transfer<'info>> {
        CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            Transfer {
                from: self.vault_token_account.to_account_info(),
                to: self.user_token_account.to_account_info(),
                authority: self.vault_authority.to_account_info(),
            },
            signer,
        )
    }
}

#[derive(Accounts)]
pub struct SettleMarket<'info> {
    #[account(
        constraint = oracle.key() == config.oracle_authority @ InPlayError::UnauthorizedOracle
    )]
    pub oracle: Signer<'info>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub market: Account<'info, Market>,
}
