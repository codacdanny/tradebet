/**
 * Live win-probability model. Turns a real TxODDS match state (goal difference
 * + time elapsed) into P(participant 1 wins outright), in bps (0..10000).
 *
 * Intuition: the final goal difference ≈ current diff + remaining random goals.
 * Model remaining goals as ~normal with variance growing with time left, then
 * P(win) = P(final diff > 0). Early on a lead is shaky; late it's decisive.
 */

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t) *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * @param p1Goals  participant-1 (home/France) goals
 * @param p2Goals  participant-2 (away/Spain) goals
 * @param clockSeconds elapsed match seconds
 * @returns P(participant 1 wins) in bps, clamped to a tradable 2%..98% band
 */
export function winProbBps(p1Goals: number, p2Goals: number, clockSeconds: number): number {
  const clockMin = clockSeconds / 60;
  const tRemaining = clamp((90 - clockMin) / 90, 0, 1); // 1 at kickoff → 0 at full time
  const gd = p1Goals - p2Goals;

  const lambda = 1.35; // avg goals per team over a full match
  const sd = Math.sqrt(2 * lambda * tRemaining) + 0.35; // spread of remaining goal diff (+floor)
  const z = (gd - 0.5) / sd; // -0.5: need to be strictly ahead (a draw isn't a win)
  const p = normalCdf(z);

  return clamp(Math.round(p * 10000), 200, 9800);
}
