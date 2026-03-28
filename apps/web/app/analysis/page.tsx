import { determinePricingAction } from "@mmhack/pricing";
import type { FreshnessAnalysis } from "@mmhack/shared";

const sampleAnalysis: FreshnessAnalysis = {
  confidence: "high",
  rationale: "Moderate bruising with visible soft spots but still sellable.",
  score: 6,
  sku: "apple",
  visibleIssues: ["bruise", "slight softening"],
};

const action = determinePricingAction(sampleAnalysis);

export default function AnalysisPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-[32px] border border-ink/10 bg-white/85 p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-moss">Gemini Output Shape</p>
        <h1 className="mt-3 font-display text-4xl text-ink">Structured analysis placeholder</h1>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[24px] bg-mist p-4">
            <dt className="text-xs uppercase tracking-[0.24em] text-ink/50">SKU</dt>
            <dd className="mt-2 text-lg font-semibold capitalize text-ink">{sampleAnalysis.sku}</dd>
          </div>
          <div className="rounded-[24px] bg-mist p-4">
            <dt className="text-xs uppercase tracking-[0.24em] text-ink/50">Freshness Score</dt>
            <dd className="mt-2 text-lg font-semibold text-ink">{sampleAnalysis.score} / 10</dd>
          </div>
          <div className="rounded-[24px] bg-mist p-4">
            <dt className="text-xs uppercase tracking-[0.24em] text-ink/50">Confidence</dt>
            <dd className="mt-2 text-lg font-semibold capitalize text-ink">{sampleAnalysis.confidence}</dd>
          </div>
          <div className="rounded-[24px] bg-mist p-4">
            <dt className="text-xs uppercase tracking-[0.24em] text-ink/50">Visible Issues</dt>
            <dd className="mt-2 text-lg font-semibold text-ink">{sampleAnalysis.visibleIssues.join(", ")}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[32px] bg-ink p-6 text-mist shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-peel">Pricing Rule Result</p>
        <h2 className="mt-3 font-display text-4xl">Deterministic action</h2>
        <div className="mt-6 space-y-4">
          <div className="rounded-[24px] bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist/60">Action Type</p>
            <p className="mt-2 text-2xl font-semibold capitalize">{action.type.replace("_", " ")}</p>
          </div>
          <div className="rounded-[24px] bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist/60">Markdown</p>
            <p className="mt-2 text-2xl font-semibold">{action.markdownPercent ?? 0}%</p>
          </div>
          <div className="rounded-[24px] bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist/60">Vori Operation</p>
            <p className="mt-2 text-2xl font-semibold">{action.voriOperation}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
