/* Small render helpers shared by server pages and the client pool table. */

const BLOCK_SECONDS = 0.1;

/** Approximate age of a block distance on Robinhood Chain (~0.1 s blocks). */
export function ago(blocks: number) {
  const s = blocks * BLOCK_SECONDS;
  if (s < 90) return `${Math.round(s)}s`;
  if (s < 5400) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

export function GradeChip({ grade }: { grade: string }) {
  const tone: Record<string, string> = { A: "bg-pass", B: "bg-[#5f8a2d]", C: "bg-warn", D: "bg-signal", E: "bg-danger" };
  return <span className={`num inline-grid size-6 place-items-center rounded-[3px] text-[12px] font-semibold text-white ${tone[grade] ?? "bg-ink"}`}>{grade}</span>;
}
