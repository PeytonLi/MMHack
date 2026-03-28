import { SUPPORTED_SKUS } from "@mmhack/shared";

import { CameraPreview } from "@/components/camera-preview";

export default function CapturePage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-moss">Capture Workflow</p>
          <h1 className="font-display text-4xl text-ink">Employee-controlled phone capture</h1>
          <p className="max-w-2xl text-base leading-7 text-ink/70">
            This placeholder route proves the UI shape for a live preview plus explicit capture flow. v1 intentionally
            avoids continuous scoring and product auto-identification.
          </p>
        </div>
        <CameraPreview />
      </section>

      <aside className="space-y-4 rounded-[32px] border border-ink/10 bg-white/80 p-6 shadow-panel">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-moss">Supported SKUs</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {SUPPORTED_SKUS.map((sku) => (
              <span className="rounded-full bg-mist px-4 py-2 text-sm font-medium capitalize text-ink" key={sku}>
                {sku}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-moss">Implementation Notes</p>
          <ul className="space-y-2 text-sm leading-6 text-ink/70">
            <li>Selection stays manual so the downstream Vori item mapping is deterministic.</li>
            <li>Hosted HTTPS is the primary target so mobile camera permissions work reliably.</li>
            <li>The live capture upload and Gemini call are intentionally stubbed for the next turn.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
