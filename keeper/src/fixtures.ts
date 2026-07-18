/** Shared fixture selection + live-score fetch for the keeper (oracle). */

const CODES: Record<string, string> = {
  France: "FRA", Spain: "ESP", England: "ENG", Argentina: "ARG", Brazil: "BRA",
  Australia: "AUS", Vietnam: "VIE", Myanmar: "MYA", "New Zealand": "NZL", India: "IND",
  Nigeria: "NGA", Portugal: "POR", Germany: "GER", Netherlands: "NED", Croatia: "CRO",
};
const code = (n: string) => CODES[n] ?? n.slice(0, 3).toUpperCase();

export interface Creds {
  jwt: string;
  apiToken: string;
}

export interface Featured {
  fixtureId: string;
  outcome: number;
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  competition: string;
  startTime: number;
}

/** Pick the current featured World Cup fixture: in-play preferred, else upcoming, else most recent. */
export async function pickFeatured(host: string, creds: Creds): Promise<Featured | null> {
  const res = await fetch(`${host}/api/fixtures/snapshot`, {
    headers: { Authorization: `Bearer ${creds.jwt}`, "X-Api-Token": creds.apiToken },
  });
  if (!res.ok) return null;
  const fx: Array<Record<string, unknown>> = await res.json();
  const now = Date.now();
  const norm = fx
    .filter((f) => f.Participant1 && f.Participant2)
    .map((f) => ({ f, wc: String(f.Competition ?? "").toLowerCase().includes("world cup"), st: Number(f.StartTime ?? 0) }));
  const wc = norm.filter((n) => n.wc);
  const pool = wc.length ? wc : norm;
  if (!pool.length) return null;

  const inPlay = pool.filter((n) => n.st <= now && now - n.st < 140 * 60_000);
  let chosen;
  if (inPlay.length) chosen = inPlay.sort((a, b) => b.st - a.st)[0];
  else {
    const upcoming = pool.filter((n) => n.st > now).sort((a, b) => a.st - b.st);
    chosen = upcoming[0] ?? pool.sort((a, b) => b.st - a.st)[0];
  }
  const f = chosen.f;
  const home = String(f.Participant1);
  const away = String(f.Participant2);
  return {
    fixtureId: String(f.FixtureId),
    outcome: 0,
    home,
    away,
    homeCode: code(home),
    awayCode: code(away),
    competition: String(f.Competition ?? ""),
    startTime: Number(f.StartTime ?? 0),
  };
}

export interface LiveState {
  minute: number;
  clockSeconds: number;
  p1Goals: number;
  p2Goals: number;
}

export async function fetchLiveScore(host: string, creds: Creds, fixtureId: string): Promise<LiveState | null> {
  const res = await fetch(`${host}/api/scores/snapshot/${fixtureId}`, {
    headers: { Authorization: `Bearer ${creds.jwt}`, "X-Api-Token": creds.apiToken },
  });
  if (!res.ok) return null;
  const arr: Array<Record<string, unknown>> = await res.json();
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const latest = arr.reduce((a, b) => (Number(b.Seq ?? 0) >= Number(a.Seq ?? 0) ? b : a));
  const clock = (latest.Clock ?? {}) as { Seconds?: number; Running?: boolean };
  const score = (latest.Score ?? {}) as {
    Participant1?: { Total?: { Goals?: number } };
    Participant2?: { Total?: { Goals?: number } };
  };
  const clockSeconds = Number(clock.Seconds ?? 0);
  // Cumulative goals only increase; the latest record can omit them (possession /
  // kickoff events) → take the max across the snapshot to avoid flicker.
  type Rec = { Score?: { Participant1?: { Total?: { Goals?: number } }; Participant2?: { Total?: { Goals?: number } } } };
  const p1Goals = Math.max(0, ...arr.map((r) => Number((r as Rec).Score?.Participant1?.Total?.Goals ?? 0)));
  const p2Goals = Math.max(0, ...arr.map((r) => Number((r as Rec).Score?.Participant2?.Total?.Goals ?? 0)));
  const running = Boolean(clock.Running);
  // No live data yet (pre-match): don't treat 0-0 with a dead clock as live.
  if (!running && clockSeconds === 0 && p1Goals + p2Goals === 0) return null;
  return { clockSeconds, minute: Math.floor(clockSeconds / 60), p1Goals, p2Goals };
}
