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
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
        {warn && <span className="text-xs text-amber">{warn}</span>}
      </div>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className={`w-full text-left input hover:border-flare break-all text-sm ${mono ? "mono" : ""}`}
        title="Click to copy"
      >
        {value}
        <span className="float-right text-xs text-gray-500 ml-2">{copied ? "copied ✓" : "copy"}</span>
      </button>
    </div>
  );
}
