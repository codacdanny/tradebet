import deployment from "@/lib/program/deployment.json";

export const runtime = "nodejs";

// Same-origin JSON-RPC proxy to the Solana cluster. Avoids browser CORS/rate
// limits on the public endpoint and lets us swap RPC via env without touching
// the client. Override with SOLANA_RPC_URL (e.g. a Helius/Triton devnet URL).
const RPC_URL = process.env.SOLANA_RPC_URL || deployment.rpc;

export async function POST(req: Request) {
  const body = await req.text();
  const upstream = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
