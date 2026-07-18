"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Client-side match simulator. Drives a live win-probability feed so the whole
 * app is alive in preview / during a demo without a live match.
 *
 * In production this same shape is fed by the keeper reading TxLINE's odds
 * stream (`Pct[]`) and pushing `update_price` on-chain. The UI is identical;
 * only the source of `probBps` changes. Market: "Nigeria to win".
 */

export type PricePoint = { minute: number; bps: number };
export type MatchStatus = "prematch" | "live" | "fulltime";
export type MatchEvent = {
  minute: number;
  type: "kickoff" | "goal" | "fulltime";
  team?: "home" | "away";
  label: string;
};

export interface MatchState {
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  fixtureId: number;
  minute: number;
  probBps: number;
  baseBps: number;
  scoreHome: number;
  scoreAway: number;
  status: MatchStatus;
  history: PricePoint[];
  events: MatchEvent[];
  lastDir: 1 | -1 | 0;
}

// Scripted goals for the "Nigeria to win" market. The underdog dips, then climbs.
const GOALS: {
  minute: number;
  team: "home" | "away";
  newBaseBps: number;
  label: string;
}[] = [
  { minute: 24, team: "away", newBaseBps: 1650, label: "Argentina strike first" },
  { minute: 67, team: "home", newBaseBps: 4400, label: "Nigeria equalise!" },
  { minute: 82, team: "home", newBaseBps: 7250, label: "Nigeria go ahead!" },
];

const START_BASE = 3000; // 30% implied at kickoff
const MATCH_END = 92;

function clampBps(n: number) {
  return Math.max(120, Math.min(9880, Math.round(n)));
}

function freshState(): MatchState {
  return {
    home: "Nigeria",
    away: "Argentina",
    homeCode: "NGA",
    awayCode: "ARG",
    fixtureId: 1042577,
    minute: 0,
    probBps: START_BASE,
    baseBps: START_BASE,
    scoreHome: 0,
    scoreAway: 0,
    status: "prematch",
    history: [{ minute: 0, bps: START_BASE }],
    events: [],
    lastDir: 0,
  };
}

export function useMatchSim(tickMs = 420) {
  const [state, setState] = useState<MatchState>(freshState);
  const [playing, setPlaying] = useState(false);
  const targetRef = useRef(START_BASE);
  const firedRef = useRef<Set<number>>(new Set());

  const tick = useCallback(() => {
    setState((s) => {
      if (s.status === "fulltime") return s;

      const minute = s.minute + 1;
      let baseBps = s.baseBps;
      let scoreHome = s.scoreHome;
      let scoreAway = s.scoreAway;
      const events = s.events;
      const history = s.history;

      // Fire any goal whose minute we've reached.
      for (const g of GOALS) {
        if (minute >= g.minute && !firedRef.current.has(g.minute)) {
          firedRef.current.add(g.minute);
          targetRef.current = g.newBaseBps;
          if (g.team === "home") scoreHome += 1;
          else scoreAway += 1;
          events.push({ minute: g.minute, type: "goal", team: g.team, label: g.label });
        }
      }

      // Ease the fundamental toward its target, then add live noise.
      baseBps = baseBps + (targetRef.current - baseBps) * 0.35;
      const noise = (Math.random() - 0.5) * 260;
      const probBps = clampBps(baseBps + noise);
      const lastDir: 1 | -1 | 0 =
        probBps > s.probBps ? 1 : probBps < s.probBps ? -1 : 0;

      const nextHistory = [...history, { minute, bps: probBps }];

      if (minute >= MATCH_END) {
        // Nigeria win (2–1) → the "Nigeria to win" market settles to 100%.
        events.push({ minute: MATCH_END, type: "fulltime", label: "Full time — Nigeria win 2–1" });
        return {
          ...s,
          minute: MATCH_END,
          baseBps,
          probBps: 10000,
          scoreHome,
          scoreAway,
          status: "fulltime",
          history: [...history, { minute: MATCH_END, bps: 10000 }],
          events,
          lastDir: 1,
        };
      }

      return {
        ...s,
        minute,
        baseBps,
        probBps,
        scoreHome,
        scoreAway,
        status: "live",
        history: nextHistory,
        events,
        lastDir,
      };
    });
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(tick, tickMs);
    return () => clearInterval(id);
  }, [playing, tick, tickMs]);

  const start = useCallback(() => {
    setState((s) => (s.status === "prematch" ? { ...s, status: "live", events: [...s.events, { minute: 0, type: "kickoff", label: "Kick-off" }] } : s));
    setPlaying(true);
  }, []);
  const pause = useCallback(() => setPlaying(false), []);
  const reset = useCallback(() => {
    firedRef.current = new Set();
    targetRef.current = START_BASE;
    setPlaying(false);
    setState(freshState());
  }, []);

  return { state, playing, start, pause, reset };
}
