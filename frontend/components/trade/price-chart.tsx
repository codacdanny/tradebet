"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { MatchEvent, PricePoint } from "@/lib/sim";

const H = 360;
const PAD = { l: 6, r: 40, t: 18, b: 26 };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(340);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width;
      if (cw) setW(cw);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function PriceChart({
  history,
  events = [],
  entryBps,
  side,
  xMax = 92,
}: {
  history: PricePoint[];
  events?: MatchEvent[];
  entryBps?: number;
  side?: "long" | "short";
  xMax?: number;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();

  const x = (m: number) => PAD.l + (m / xMax) * (W - PAD.l - PAD.r);
  const y = (bps: number) => PAD.t + (1 - bps / 10000) * (H - PAD.t - PAD.b);

  const last = history[history.length - 1] ?? { minute: 0, bps: 3000 };
  const linePts = history.map((p) => `${x(p.minute)},${y(p.bps)}`).join(" ");
  const areaPath =
    history.length > 1
      ? `M${x(history[0].minute)},${y(history[0].bps)} ` +
        history.map((p) => `L${x(p.minute)},${y(p.bps)}`).join(" ") +
        ` L${x(last.minute)},${H - PAD.b} L${x(history[0].minute)},${H - PAD.b} Z`
      : "";

  const goals = events.filter((e) => e.type === "goal");
  const gridLevels = [0, 2500, 5000, 7500, 10000];

  return (
    <div ref={ref} className="relative w-full min-w-0 overflow-hidden" style={{ height: H }}>
      <svg width={W} height={H} className="block max-w-full">
        <defs>
          <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-long)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-long)" stopOpacity="0" />
          </linearGradient>
          <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Horizontal gridlines + % labels */}
        {gridLevels.map((lvl) => (
          <g key={lvl}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(lvl)}
              y2={y(lvl)}
              stroke="var(--color-border)"
              strokeWidth={1}
              strokeDasharray={lvl === 0 || lvl === 10000 ? "0" : "3 5"}
              opacity={0.6}
            />
            <text
              x={W - PAD.r + 2}
              y={y(lvl) + 3}
              fontSize={10}
              fill="var(--color-faint)"
              className="tnum"
              textAnchor="start"
            >
              {lvl / 100}%
            </text>
          </g>
        ))}

        {/* Goal markers */}
        {goals.map((g, i) => (
          <g key={i}>
            <line
              x1={x(g.minute)}
              x2={x(g.minute)}
              y1={PAD.t}
              y2={H - PAD.b}
              stroke={g.team === "home" ? "var(--color-long)" : "var(--color-short)"}
              strokeWidth={1}
              strokeDasharray="2 4"
              opacity={0.5}
            />
            <text
              x={x(g.minute)}
              y={PAD.t - 6}
              fontSize={9.5}
              fill={g.team === "home" ? "var(--color-long)" : "var(--color-short)"}
              textAnchor="middle"
              className="font-mono"
            >
              ⚽ {g.minute}&apos;
            </text>
          </g>
        ))}

        {/* Entry line */}
        {entryBps != null && (
          <g>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(entryBps)}
              y2={y(entryBps)}
              stroke={side === "short" ? "var(--color-short)" : "var(--color-accent)"}
              strokeWidth={1}
              strokeDasharray="5 4"
              opacity={0.9}
            />
            <text
              x={PAD.l + 4}
              y={y(entryBps) - 5}
              fontSize={10}
              fill={side === "short" ? "var(--color-short)" : "var(--color-accent)"}
              className="tnum"
            >
              entry {(entryBps / 100).toFixed(1)}%
            </text>
          </g>
        )}

        {/* Area + line */}
        {areaPath && <path d={areaPath} fill="url(#area-fill)" />}
        <polyline
          points={linePts}
          fill="none"
          stroke="var(--color-long)"
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#line-glow)"
        />

        {/* Live endpoint */}
        <circle cx={x(last.minute)} cy={y(last.bps)} r={9} fill="var(--color-long)" opacity={0.18} />
        <circle
          cx={x(last.minute)}
          cy={y(last.bps)}
          r={4}
          fill="var(--color-long)"
          className="animate-live-dot"
          style={{ transformOrigin: `${x(last.minute)}px ${y(last.bps)}px` }}
        />
      </svg>
    </div>
  );
}
