import Link from "next/link";

export default function NotFound() {
  return (
    <section className="graph border-b border-line">
      <div className="wrap py-20 sm:py-28">
        <p className="label !text-signal">Error 404</p>
        <h1 className="h-display mt-3 text-[clamp(40px,7vw,76px)]">
          No rule <span className="italic text-signal">matches</span> this path.
        </h1>
        <p className="mt-4 max-w-[560px] text-[17px] text-ink-2">The page moved, never existed, or the address in the link is not a valid 0x address.</p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/" className="btn btn-signal">
            Back home
          </Link>
          <Link href="/builder" className="btn btn-line">
            Open the composer
          </Link>
          <Link href="/scan" className="btn btn-line">
            Scan a hook
          </Link>
        </div>
      </div>
    </section>
  );
}
