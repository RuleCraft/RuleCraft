/** Long-form body for info pages: narrow column with the drafting prose styles. */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap py-12">
      <div className="prose-rc max-w-[760px]">{children}</div>
    </div>
  );
}

export function Updated({ date }: { date: string }) {
  return <p className="font-mono text-[12px] text-ink-3">Last updated {date}</p>;
}
