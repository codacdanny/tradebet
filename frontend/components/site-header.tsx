import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { ConnectButton } from "@/components/connect-button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#markets" className="transition hover:text-foreground">
            Markets
          </a>
          <a href="#how" className="transition hover:text-foreground">
            How it works
          </a>
          <a href="#edge" className="transition hover:text-foreground">
            Why TRADEBET
          </a>
          <a href="#settlement" className="transition hover:text-foreground">
            Settlement
          </a>
        </nav>

        <div className="flex items-center gap-2.5">
          <ConnectButton className="hidden sm:inline-flex" />
          <Link
            href="/trade"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] brand-gradient px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-long focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Launch Terminal
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
