/**
 * Connects to TxLINE's live odds + scores SSE streams using the activated
 * credentials and prints the first several real messages (so we can see the
 * exact payload shape). Run onboard.ts first.
 */
import fs from "node:fs";
import { apiBaseUrl, CREDENTIALS_PATH } from "./config.ts";

if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error("No credentials.json — run `npx tsx src/onboard.ts` first.");
  process.exit(1);
}
const { jwt, apiToken } = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));

const headers = {
  Authorization: `Bearer ${jwt}`,
  "X-Api-Token": apiToken,
  Accept: "text/event-stream",
  "Cache-Control": "no-cache",
};

async function* readSseMessages(res: Response) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let event = "message";
      const dataLines: string[] = [];
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length) yield { event, data: dataLines.join("\n") };
    }
  }
}

async function sample(kind: "odds" | "scores", limit: number) {
  const url = `${apiBaseUrl}/${kind}/stream`;
  const res = await fetch(url, { headers });
  console.log(`\n=== ${kind} stream: ${url} -> HTTP ${res.status} ${res.ok ? "OK" : res.statusText} ===`);
  if (!res.ok) {
    console.error(await res.text().catch(() => ""));
    return;
  }
  let n = 0;
  for await (const msg of readSseMessages(res)) {
    let parsed: unknown = msg.data;
    try {
      parsed = JSON.parse(msg.data);
    } catch {
      /* keep raw */
    }
    console.log(`[${kind} #${++n}] event=${msg.event}`, JSON.stringify(parsed).slice(0, 600));
    if (n >= limit) break;
  }
  console.log(`(${kind}: received ${n} messages)`);
}

const timeout = setTimeout(() => {
  console.log("\n⏱ 30s elapsed — no more messages (there may be no live World Cup fixture right now).");
  process.exit(0);
}, 30_000);

await Promise.all([sample("odds", 6), sample("scores", 6)]);
clearTimeout(timeout);
console.log("\n✅ Live TxLINE data received.");
process.exit(0);
