import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import deployment from "@/lib/program/deployment.json";

export const runtime = "nodejs";
export const revalidate = 0;

const TXLINE_HOST = "https://txline-dev.txodds.com";

function loadCreds(): { jwt: string; apiToken: string } | null {
  // On Vercel/serverless the keeper file isn't present — use env vars.
  if (process.env.TXLINE_JWT && process.env.TXLINE_API_TOKEN) {
    return { jwt: process.env.TXLINE_JWT, apiToken: process.env.TXLINE_API_TOKEN };
  }
  try {
    const p = path.resolve(process.cwd(), "..", "keeper", "credentials.json");
    const c = JSON.parse(fs.readFileSync(p, "utf8"));
    if (c.jwt && c.apiToken) return { jwt: c.jwt, apiToken: c.apiToken };
  } catch {
    /* no creds */
  }
  return null;
}

type Side = { goals: number; corners: number; yellow: number; red: number };

function side(total: Record<string, number> | undefined): Side {
  return {
    goals: Number(total?.Goals ?? 0),
    corners: Number(total?.Corners ?? 0),
    yellow: Number(total?.YellowCards ?? 0),
    red: Number(total?.RedCards ?? 0),
  };
}

function periodLabel(minute: number, running: boolean, goals: number): string {
  const inPlay = running || goals > 0;
  if (!inPlay) return "Pre-match";
  if (minute >= 90) return "Full time";
  if (minute > 45) return "2nd half";
  if (minute === 45) return "Half time";
  if (minute >= 1) return "1st half";
  return "In play";
}

export async function GET(req: Request) {
  const creds = loadCreds();
  if (!creds) return NextResponse.json({ available: false });

  const fixtureId = new URL(req.url).searchParams.get("fixtureId") || deployment.market.fixtureId;

  try {
    const res = await fetch(`${TXLINE_HOST}/api/scores/snapshot/${fixtureId}`, {
      headers: { Authorization: `Bearer ${creds.jwt}`, "X-Api-Token": creds.apiToken },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`TxLINE ${res.status}`);
    const arr: Array<Record<string, unknown>> = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return NextResponse.json({ available: false });

    const latest = arr.reduce((a, b) => (Number(b.Seq ?? 0) >= Number(a.Seq ?? 0) ? b : a));
    const clock = (latest.Clock ?? {}) as { Seconds?: number; Running?: boolean };
    const score = (latest.Score ?? {}) as {
      Participant1?: { Total?: Record<string, number> };
      Participant2?: { Total?: Record<string, number> };
    };
    const clockSeconds = Number(clock.Seconds ?? 0);
    const minute = Math.floor(clockSeconds / 60);
    const running = Boolean(clock.Running);
    const data = (latest.Data ?? {}) as { Action?: string };
    const home = side(score.Participant1?.Total);
    const away = side(score.Participant2?.Total);
    const inPlay = running || home.goals + away.goals > 0;

    return NextResponse.json({
      available: true,
      running,
      inPlay,
      minute,
      clockSeconds,
      period: periodLabel(minute, running, home.goals + away.goals),
      home,
      away,
      lastEvent: data.Action ?? null,
      home_name: deployment.market.home,
      away_name: deployment.market.away,
      homeCode: deployment.market.homeCode,
      awayCode: deployment.market.awayCode,
    });
  } catch {
    return NextResponse.json({ available: false });
  }
}
