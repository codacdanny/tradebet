import Link from "next/link";
import {
  ArrowUpRight,
  Activity,
  Gauge,
  Repeat,
  ShieldCheck,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { HeroCanvas } from "@/components/landing/hero-canvas";
import { MarketsHub } from "@/components/landing/markets-hub";
import { LogoMark } from "@/components/logo";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <HeroCanvas />
        {/* Ambient glows + grid */}
        <div className="pointer-events-none absolute inset-0 -z-20 bg-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] opacity-[0.35]" />
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-20 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-long/10 blur-[130px]" />
        <div className="pointer-events-none absolute top-40 right-0 -z-20 h-[420px] w-[520px] rounded-full bg-accent/10 blur-[130px]" />
        {/* Readability scrim: darkens the center behind the hero copy, wave stays visible at the edges */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-[5] h-[620px] bg-[radial-gradient(58%_52%_at_50%_32%,color-mix(in_oklab,var(--color-background)_82%,transparent),color-mix(in_oklab,var(--color-background)_40%,transparent)_56%,transparent_78%)]" />

        <div className="mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-xs text-muted backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-long animate-live-dot" />
              Live on Solana · powered by TxODDS TxLINE
            </span>

            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
              Trade the match.
              <br />
              <span className="brand-gradient-text">Live.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted [text-shadow:0_1px_16px_rgba(6,8,10,0.95)]">
              Every team&apos;s chance of winning is a live price. Go long, go short, and
              cash out any second during the 90 — priced by professional odds, settled
              on-chain.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/trade"
                className="inline-flex items-center gap-2 rounded-[var(--radius-control)] brand-gradient px-6 py-3 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-long focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Launch Terminal
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface/60 px-6 py-3 text-sm font-medium text-foreground backdrop-blur transition hover:border-border-strong hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                How it works
              </a>
            </div>

            {/* Signal strip */}
            <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border">
              <Signal value="8–10ms" label="odds latency" />
              <Signal value="~400ms" label="on-chain settle" />
              <Signal value="0" label="disputes" />
            </dl>
          </div>
        </div>
      </section>

      {/* MARKETS HUB — live / upcoming / results from the TxODDS feed */}
      <MarketsHub />

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="Three taps, not ninety minutes of waiting"
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Step
            n="01"
            icon={<TrendingUp className="h-5 w-5" />}
            title="Buy the probability"
            body="A team's live win chance is a price from 0–100. Buy in when you like the number — say Nigeria at 30%."
          />
          <Step
            n="02"
            icon={<Activity className="h-5 w-5" />}
            title="Ride the goals"
            body="A goal drops and the price jumps in real time — TxODDS reprices in milliseconds, on-chain in one Solana block."
          />
          <Step
            n="03"
            icon={<Zap className="h-5 w-5" />}
            title="Cash out anytime"
            body="Close at the live price and pocket the move — no waiting for full time. Or hold to settlement."
          />
        </div>
      </section>

      {/* EDGE */}
      <section id="edge" className="scroll-mt-20 border-y border-border bg-surface/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading
            eyebrow="Why TRADEBET"
            title="The trader's venue that didn't exist on-chain"
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              icon={<Gauge className="h-5 w-5" />}
              title="Real in-play pricing"
              body="Professional, de-vigged odds from TxODDS — the same numbers bookmakers trade on, not an amateur feed."
            />
            <Feature
              icon={<Repeat className="h-5 w-5" />}
              title="Cash out & hedge"
              body="Close early to lock a win, or short to protect a position. The two things every on-chain sportsbook is missing."
            />
            <Feature
              icon={<Timer className="h-5 w-5" />}
              title="Only on Solana"
              body="Continuous repricing means thousands of cheap updates. Fast, near-free blocks make live markets actually possible."
            />
            <Feature
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Trustless settlement"
              body="Results are verified against TxLINE's on-chain Merkle root. No crowd-voted oracle, no multi-day disputes."
            />
          </div>
        </div>
      </section>

      {/* SETTLEMENT band */}
      <section id="settlement" className="scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
          <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-8 sm:p-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
            <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
              <div>
                <span className="text-xs uppercase tracking-widest text-accent">Settlement</span>
                <h3 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
                  Nothing to dispute.
                  <br />
                  Nothing to wait for.
                </h3>
                <p className="mt-4 max-w-lg text-muted">
                  Legacy prediction markets settle on crowd-voted oracles — slow, gameable,
                  and sometimes just wrong. TxODDS publishes each result to Solana as a
                  Merkle root, and our program verifies against it in a single block.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Compare bad="UMA-style oracle: 4–6 days, disputable" good="TxLINE: one block, verified" />
                <Compare bad="Amateur scores API" good="Pro sportsbook consensus" />
                <Compare bad="Bet, then wait 90'" good="Trade & cash out live" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POWERED BY */}
      <section className="border-y border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 py-8 text-sm text-faint sm:px-6">
          <span className="uppercase tracking-widest">Built with</span>
          <span className="font-display font-semibold text-muted">Solana</span>
          <span className="font-display font-semibold text-muted">TxODDS · TxLINE</span>
          <span className="font-display font-semibold text-muted">Anchor</span>
          <span className="font-display font-semibold text-muted">Superteam</span>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[380px] bg-long/[0.06] blur-[120px]" />
        <div className="mx-auto max-w-3xl px-4 py-28 text-center sm:px-6">
          <LogoMark className="mx-auto h-12 w-12" />
          <h2 className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            The whistle hasn&apos;t blown.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted">
            Open the terminal and trade a live match right now — no signup, no wait.
          </p>
          <Link
            href="/trade"
            className="mt-8 inline-flex items-center gap-2 rounded-[var(--radius-control)] brand-gradient px-7 py-3.5 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-long focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Launch Terminal
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-faint sm:flex-row sm:px-6">
          <LogoMark className="h-6 w-6" animated={false} />
          <p>Trade the match, live. · Built for the TxODDS World Cup Hackathon.</p>
        </div>
      </footer>
    </div>
  );
}

function Signal({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-background px-4 py-5">
      <div className="tnum text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <span className="text-xs uppercase tracking-widest text-long">{eyebrow}</span>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative rounded-[var(--radius-card)] border border-border bg-surface p-6 transition hover:border-border-strong">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-control)] border border-border bg-background text-long">
          {icon}
        </span>
        <span className="tnum text-sm text-faint">{n}</span>
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-background p-6">
      <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-control)] border border-border bg-surface text-accent">
        {icon}
      </span>
      <h3 className="mt-5 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Compare({ bad, good }: { bad: string; good: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-control)] border border-border bg-background/60 p-4">
      <span className="flex items-center gap-2 text-sm text-muted line-through decoration-short/60">
        {bad}
      </span>
      <span className="flex items-center gap-2 text-sm font-medium text-long">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        {good}
      </span>
    </div>
  );
}
