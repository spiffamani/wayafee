"use client";

import { useState } from "react";

export function CopyField({
  label,
  value,
  mono = true,
  warn,
}: {
  label: string;
  value: string;
  mono?: boolean;
  warn?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</span>
        {warn && <span className="text-[11px] font-semibold text-amber">{warn}</span>}
      </div>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className={`input flex items-start justify-between gap-3 text-left text-sm hover:border-flare ${
          mono ? "mono" : ""
        }`}
        title="Click to copy"
      >
        <span className="min-w-0 break-all">{value}</span>
        <span className="shrink-0 text-xs font-bold text-muted">{copied ? "copied" : "copy"}</span>
      </button>
    </div>
  );
}
