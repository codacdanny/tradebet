import { Terminal } from "@/components/trade/terminal";

export const metadata = {
  title: "TRADEBET — Demo (replay)",
};

// Simulated, reproducible match replay — used for the pitch/demo video so it
// never depends on a live match or wallet. The real product lives at /trade.
export default function DemoPage() {
  return <Terminal />;
}
