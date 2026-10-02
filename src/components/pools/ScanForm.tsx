"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "@/components/icons";

/** Paste a hook address (0x + 40 hex) or a v4 pool id (0x + 64 hex). */
export function ScanForm({ initial = "", tone = "paper" }: { initial?: string; tone?: "paper" | "night" }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(v)) router.push(`/scan/${v}`);
    else if (/^0x[0-9a-fA-F]{64}$/.test(v)) router.push(`/pool/${v}`);
    else setError("Paste a hook address (0x + 40 hex) or a pool id (0x + 64 hex).");
  };
  return (
    <form onSubmit={submit} className="w-full" data-scan-form>
      <div className={`flex w-full items-stretch gap-0 border ${tone === "night" ? "border-white/30" : "border-ink"} bg-card`}>
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="0x… hook address or pool id"
          aria-label="Hook address or pool id"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent px-3 py-3 font-mono text-[14px] text-ink outline-none placeholder:text-ink-3"
        />
        <button type="submit" className="flex shrink-0 items-center gap-2 bg-ink px-4 text-[14.5px] font-medium text-paper hover:bg-black">
          Scan <ArrowRight />
        </button>
      </div>
      {error ? <p className="mt-2 text-[13px] text-danger">{error}</p> : null}
    </form>
  );
}
