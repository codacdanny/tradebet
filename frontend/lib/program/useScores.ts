"use client";

import { useEffect, useState } from "react";

export interface SideScore {
  goals: number;
  corners: number;
  yellow: number;
  red: number;
}

export interface LiveScore {
  available: boolean;
  running: boolean;
  inPlay: boolean;
  minute: number;
  period: string;
  home: SideScore;
  away: SideScore;
  lastEvent: string | null;
}

/** Polls the live TxODDS match state (score, clock, stats) for a fixture. */
export function useScores(fixtureId: string | null, intervalMs = 3000) {
  const [score, setScore] = useState<LiveScore | null>(null);

  useEffect(() => {
    if (!fixtureId) {
      setScore(null);
      return;
    }
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/scores?fixtureId=${fixtureId}`);
        const d = (await r.json()) as LiveScore;
        if (alive) setScore(d.available ? d : null);
      } catch {
        /* ignore transient */
      }
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [fixtureId, intervalMs]);

  return score;
}
