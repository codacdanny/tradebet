"use client";

import { useEffect, useState } from "react";
import HeroScene from "./hero-scene";

/**
 * Renders the three.js scene only after mount. We gate on a mounted flag
 * instead of `next/dynamic({ ssr:false })` — the latter currently trips a
 * Turbopack RSC manifest bug on the global-error boundary in Next 16.
 * The scene module is import-safe on the server (no browser APIs at eval time);
 * the WebGL Canvas is only created once `mounted` is true on the client.
 */
export function HeroCanvas() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      {mounted ? <HeroScene /> : null}
    </div>
  );
}
