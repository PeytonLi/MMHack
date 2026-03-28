import { pricingBands, SUPPORTED_SKUS } from "@mmhack/shared";

import { RouteCard } from "@/components/route-card";
import { getPublicEnv } from "@/lib/env";

const { NEXT_PUBLIC_APP_NAME } = getPublicEnv();

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[36px] bg-gradient-to-br from-peel via-clay to-mist p-8 shadow-panel sm:p-10">
        <div className="max-w-3xl space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-ink/60">Hackathon Scaffold</p>
          <h1 className="font-display text-4xl leading-tight text-ink sm:text-6xl">
            {NEXT_PUBLIC_APP_NAME} turns a produce photo into a pricing decision.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-ink/75 sm:text-lg">
            This scaffold encodes the agreed employee workflow: select a SKU, capture a phone photo, score freshness
            with Gemini, map that score to a deterministic action, and write the outcome to VoriOS with an audit trail.
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <RouteCard
          description="Phone-first camera preview and capture flow. SKU selection stays explicit to avoid auto-identification drift."
          href="/capture"
          kicker="Step 1"
          title="Capture"
        >
          Supports {SUPPORTED_SKUS.join(", ")}.
        </RouteCard>
        <RouteCard
          description="Structured Gemini output will feed deterministic pricing logic. The current page shows the scaffolded rule engine."
          href="/analysis"
          kicker="Step 2"
          title="Analyze"
        >
          Fail safe on low confidence or invalid output.
        </RouteCard>
        <RouteCard
          description="Audit history stores image references, score, action, and Vori write outcome for later review."
          href="/history"
          kicker="Step 3"
          title="Review"
        >
          SQLite-backed persistence lives in `packages/db`.
        </RouteCard>
      </section>

      <section className="grid gap-4 rounded-[32px] border border-ink/10 bg-white/75 p-6 shadow-panel sm:grid-cols-4">
        {pricingBands.map((band) => (
          <div className="rounded-[24px] bg-mist p-4" key={band.label}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-moss">{band.label}</p>
            <p className="mt-3 font-display text-3xl text-ink">
              {band.maxScore}-{band.minScore}
            </p>
            <p className="mt-2 text-sm text-ink/70">
              {band.markdownPercent === 0
                ? "Keep current price"
                : band.markdownPercent === 100
                  ? "Discard"
                  : `${band.markdownPercent}% markdown`}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
