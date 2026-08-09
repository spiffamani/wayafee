"use client";

const STEPS = ["Reserve", "Pay XRP", "Attest", "Execute", "Done"];

export function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs sm:text-sm select-none">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "active" : "todo";
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold border ${
                state === "done"
                  ? "bg-mint/15 border-mint/50 text-mint"
                  : state === "active"
                    ? "bg-flare/15 border-flare text-flare"
                    : "border-line text-gray-500"
              }`}
            >
              {state === "done" ? "✓" : n}
            </span>
            <span
              className={
                state === "active" ? "text-white font-medium" : "text-gray-500 hidden sm:inline"
              }
            >
              {label}
            </span>
            {n < STEPS.length && <span className="w-4 sm:w-8 h-px bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}
