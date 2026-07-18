import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import deployment from "@/lib/program/deployment.json";

export const runtime = "nodejs";
export const revalidate = 0;

const TXLINE_HOST = "https://txline-dev.txodds.com";
const LIVE_FIXTURE_ID = deployment.market.fixtureId;
const LIVE_WINDOW_MS = 140 * 60_000; // a match lasts ~2h20 incl. stoppage/ET

const CODES: Record<string, string> = {
  France: "FRA", Spain: "ESP", England: "ENG", Argentina: "ARG", Brazil: "BRA",
  Australia: "AUS", Vietnam: "VIE", Myanmar: "MYA", "New Zealand": "NZL", India: "IND",
  Nigeria: "NGA", Portugal: "POR", Germany: "GER", Netherlands: "NED", Croatia: "CRO",
  Italy: "ITA", Belgium: "BEL", Morocco: "MAR", "United States": "USA", Mexico: "MEX",
  Japan: "JPN", "South Korea": "KOR", Senegal: "SEN", Colombia: "COL", Uruguay: "URU",
};
const code = (n: string) => CODES[n] ?? n.slice(0, 3).toUpperCase();

interface SeenFixture {
  fixtureId: string;
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  competition: string;
  isWorldCup: boolean;
  startTime: number;
}
type Side = { goals: number; corners: number; yellow: number; red: number };
interface Score {
  running: boolean;
  minute: number;
  home: Side;
  away: Side;
}

const SEEN_PATH = path.resolve(process.cwd(), "..", "keeper", "seen-fixtures.json");

function loadCreds(): { jwt: string; apiToken: string } | null {
  // On Vercel/serverless the keeper file isn't present — use env vars.
  if (process.env.TXLINE_JWT && process.env.TXLINE_API_TOKEN) {
    return { jwt: process.env.TXLINE_JWT, apiToken: process.env.TXLINE_API_TOKEN };
  }
  try {
    const p = path.resolve(process.cwd(), "..", "keeper", "credentials.json");
    const c = JSON.parse(fs.readFileSync(p, "utf8"));
    if (c.jwt && c.apiToken) return c;
  } catch {}
  return null;
}
function loadSeen(): Record<string, SeenFixture> {
  try {
    return JSON.parse(fs.readFileSync(SEEN_PATH, "utf8"));
  } catch {
    return {};
  }
}
function saveSeen(m: Record<string, SeenFixture>) {
  try {
    fs.writeFileSync(SEEN_PATH, JSON.stringify(m));
  } catch {}
}

function sideOf(total: Record<string, number> | undefined): Side {
  return {
    goals: Number(total?.Goals ?? 0),
    corners: Number(total?.Corners ?? 0),
    yellow: Number(total?.YellowCards ?? 0),
    red: Number(total?.RedCards ?? 0),
  };
}

async function fetchScore(creds: { jwt: string; apiToken: string }, fixtureId: string): Promise<Score | null> {
  try {
    const res = await fetch(`${TXLINE_HOST}/api/scores/snapshot/${fixtureId}`, {
      headers: { Authorization: `Bearer ${creds.jwt}`, "X-Api-Token": creds.apiToken },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const arr: Array<Record<string, unknown>> = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const latest = arr.reduce((a, b) => (Number(b.Seq ?? 0) >= Number(a.Seq ?? 0) ? b : a));
    const clock = (latest.Clock ?? {}) as { Seconds?: number; Running?: boolean };
    const score = (latest.Score ?? {}) as {
      Participant1?: { Total?: Record<string, number> };
      Participant2?: { Total?: Record<string, number> };
    };
    const home = sideOf(score.Participant1?.Total);
    const away = sideOf(score.Participant2?.Total);
    if (!clock.Running && (clock.Seconds ?? 0) === 0 && home.goals + away.goals === 0) return null;
    return { running: Boolean(clock.Running), minute: Math.floor(Number(clock.Seconds ?? 0) / 60), home, away };
  } catch {
    return null;
  }
}

export async function GET() {
  const creds = loadCreds();
  if (!creds) return NextResponse.json({ source: "none", live: [], upcoming: [], finished: [] });

  // Merge the live feed into our accumulated "seen" set (fixtures roll off the feed once finished).
  const seen = loadSeen();
  try {
    const res = await fetch(`${TXLINE_HOST}/api/fixtures/snapshot`, {
      headers: { Authorization: `Bearer ${creds.jwt}`, "X-Api-Token": creds.apiToken },
      cache: "no-store",
    });
    if (res.ok) {
      const feed: Array<Record<string, unknown>> = await res.json();
      for (const f of feed) {
        if (!f.Participant1 || !f.Participant2) continue;
        const id = String(f.FixtureId);
        const home = String(f.Participant1);
        const away = String(f.Participant2);
        seen[id] = {
          fixtureId: id,
          home,
          away,
          homeCode: code(home),
          awayCode: code(away),
          competition: String(f.Competition ?? ""),
          isWorldCup: String(f.Competition ?? "").toLowerCase().includes("world cup"),
          startTime: Number(f.StartTime ?? 0),
        };
      }
      saveSeen(seen);
    }
  } catch {}

  const now = Date.now();
  const all = Object.values(seen);

  // Fetch scores only for started fixtures (live or finished candidates), in parallel, bounded.
  const started = all.filter((f) => f.startTime <= now).sort((a, b) => b.startTime - a.startTime).slice(0, 14);
  const scoreEntries = await Promise.all(started.map(async (f) => [f.fixtureId, await fetchScore(creds, f.fixtureId)] as const));
  const scores = new Map(scoreEntries);

  const live: unknown[] = [];
  const upcoming: unknown[] = [];
  const finished: unknown[] = [];

  for (const f of all) {
    const base = { ...f, tradeable: f.fixtureId === LIVE_FIXTURE_ID };
    const s = scores.get(f.fixtureId) ?? null;
    if (f.startTime > now) {
      upcoming.push(base);
      continue;
    }
    const startedLongAgo = now - f.startTime > LIVE_WINDOW_MS;
    const inPlay = !!s && (s.running || s.home.goals + s.away.goals > 0 || s.minute > 0);
    if (startedLongAgo) {
      finished.push({ ...base, score: s }); // final result
    } else if (inPlay) {
      live.push({ ...base, score: s });
    } else {
      upcoming.push({ ...base, kickingOff: true }); // started window, no data yet
    }
  }

  return NextResponse.json({
    source: "txline",
    live: live.sort((a, b) => (b as SeenFixture).startTime - (a as SeenFixture).startTime),
    upcoming: upcoming.sort((a, b) => (a as SeenFixture).startTime - (b as SeenFixture).startTime).slice(0, 8),
    finished: finished.sort((a, b) => (b as SeenFixture).startTime - (a as SeenFixture).startTime).slice(0, 8),
  });
}
