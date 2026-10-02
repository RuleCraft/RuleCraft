import type { Metadata } from "next";
import { PageHead } from "@/components/ui/Page";
import { LaunchForm } from "@/components/rules/LaunchForm";

export const metadata: Metadata = {
  title: "Launch a token",
  description: "Five steps to a new token whose pool carries your rules. Every check runs before anything is signed.",
};

export default async function LaunchPage({ searchParams }: { searchParams: Promise<{ rules?: string; bp?: string }> }) {
  const { rules, bp } = await searchParams;
  const blueprintId = bp && /^\d{1,9}$/.test(bp) ? Number(bp) : 0;
  return (
    <>
      <PageHead
        eyebrow="Pool-first launch"
        title={
          <>
            A token is born <span className="italic text-signal">inside</span> its pool.
          </>
        }
        lead="Name it, pick its rules and its opening price. The review shows every call the launcher makes, then one transaction mints the token, opens its Uniswap v4 pool with the rules frozen, and seeds the whole supply as liquidity."
      />
      <LaunchForm key={`${rules ?? "local"}-${blueprintId}`} initial={rules ?? null} blueprintId={blueprintId} />
    </>
  );
}
