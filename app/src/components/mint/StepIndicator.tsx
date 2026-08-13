"use client";

const STEPS = ["Reserve", "Pay XRP", "Attest", "Execute", "Done"];

export function StepIndicator({ current }: { current: number }) {
  const label = STEPS[Math.min(current, STEPS.length) - 1] ?? STEPS[0];
  const total = STEPS.length;
  const pct = Math.min(100, (current / total) * 100);

  return (
    <>
      <div className="lg:hidden space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-extrabold">
            Step {Math.min(current, total)} of {total}
            <span className="ml-2 font-semibold text-muted">{label}</span>
          </p>
          <p className="text-xs font-semibold text-muted">{Math.round(pct)}%</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-flare transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ol className="hidden lg:flex lg:flex-col lg:gap-1">
        {STEPS.map((name, i) => {
          const n = i + 1;
          const state = n < current ? "done" : n === current ? "active" : "todo";
          return (
            <li key={name}>
              <div
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${
                  state === "active" ? "bg-surface" : ""
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-extrabold ${
                    state === "done"
                      ? "border-ledger bg-ledger-dim text-ledger"
                      : state === "active"
                        ? "border-flare bg-flare text-white"
                        : "border-line text-muted"
                  }`}
                >
                  {state === "done" ? "✓" : n}
                </span>
                <span
                  className={`text-sm font-bold ${
                    state === "todo" ? "text-muted" : "text-ink"
                  }`}
                >
                  {name}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
