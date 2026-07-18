import { cn } from "@/lib/utils";

/**
 * TRADEBET logo mark — three ascending candlesticks (the market climbing)
 * resolving into a rising arrow, with a live pulse at the breakout tip.
 * Pure SVG, scales crisply, no hooks (safe in server components).
 */
export function LogoMark({
  className,
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      role="img"
      aria-label="TRADEBET"
    >
      <defs>
        <linearGradient id="tb-grad" x1="4" y1="31" x2="31" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#39FF88" />
          <stop offset="1" stopColor="#38D6FF" />
        </linearGradient>
      </defs>

      {/* Ascending candlestick bars */}
      <rect x="3" y="20" width="5" height="11" rx="1.6" fill="url(#tb-grad)" opacity="0.45" />
      <rect x="11" y="14" width="5" height="17" rx="1.6" fill="url(#tb-grad)" opacity="0.7" />
      <rect x="19" y="8" width="5" height="23" rx="1.6" fill="url(#tb-grad)" opacity="0.9" />

      {/* Rising breakout arrow */}
      <path
        d="M5 26 L27 7"
        stroke="url(#tb-grad)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M20.5 6.5 L28 5.5 L27 13"
        stroke="url(#tb-grad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Live breakout point */}
      <circle
        cx="27.5"
        cy="6"
        r="2.6"
        fill="#39FF88"
        className={animated ? "animate-live-dot" : undefined}
        style={{ transformOrigin: "27.5px 6px" }}
      />
    </svg>
  );
}

/** Full lockup: mark + wordmark. */
export function Logo({
  className,
  markClassName,
  animated = true,
}: {
  className?: string;
  markClassName?: string;
  animated?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      <LogoMark className={cn("h-7 w-7", markClassName)} animated={animated} />
      <span className="font-display text-[1.35rem] font-bold uppercase leading-none tracking-tight">
        <span className="text-foreground">Trade</span>
        <span className="brand-gradient-text">Bet</span>
      </span>
    </span>
  );
}
