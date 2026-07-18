use anchor_lang::prelude::*;

#[error_code]
pub enum InPlayError {
    #[msg("Market already settled")]
    MarketSettled,
    #[msg("Market is not settled yet")]
    MarketNotSettled,
    #[msg("Probability must be within 0..=10000 bps")]
    InvalidProb,
    #[msg("Invalid position side")]
    InvalidSide,
    #[msg("Position is already closed")]
    PositionClosed,
    #[msg("Signer is not the authorized oracle/keeper")]
    UnauthorizedOracle,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Insufficient vault liquidity to cover payout")]
    InsufficientLiquidity,
}
