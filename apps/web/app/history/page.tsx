const placeholderRows = [
  {
    action: "markdown 15%",
    capturedAt: "2026-03-28 10:14",
    score: 8,
    sku: "banana",
    status: "vori write pending",
  },
  {
    action: "discard",
    capturedAt: "2026-03-28 09:52",
    score: 2,
    sku: "tomato",
    status: "operator removal required",
  },
];

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-moss">Audit Trail</p>
        <h1 className="font-display text-4xl text-ink">Recent pricing decisions</h1>
        <p className="max-w-2xl text-base leading-7 text-ink/70">
          This scaffolded view reflects the data the SQLite audit log is expected to persist: image reference, score,
          confidence, action, and Vori write outcome.
        </p>
      </div>

      <div className="overflow-hidden rounded-[32px] border border-ink/10 bg-white/85 shadow-panel">
        <table className="min-w-full divide-y divide-ink/10 text-left text-sm">
          <thead className="bg-mist/80 text-ink/60">
            <tr>
              <th className="px-5 py-4 font-semibold uppercase tracking-[0.18em]">Captured</th>
              <th className="px-5 py-4 font-semibold uppercase tracking-[0.18em]">SKU</th>
              <th className="px-5 py-4 font-semibold uppercase tracking-[0.18em]">Score</th>
              <th className="px-5 py-4 font-semibold uppercase tracking-[0.18em]">Action</th>
              <th className="px-5 py-4 font-semibold uppercase tracking-[0.18em]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {placeholderRows.map((row) => (
              <tr className="text-ink/80" key={`${row.capturedAt}-${row.sku}`}>
                <td className="px-5 py-4">{row.capturedAt}</td>
                <td className="px-5 py-4 capitalize">{row.sku}</td>
                <td className="px-5 py-4">{row.score}</td>
                <td className="px-5 py-4">{row.action}</td>
                <td className="px-5 py-4 capitalize">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
