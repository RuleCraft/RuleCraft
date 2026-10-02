import type { Metadata } from "next";
import { PageHead } from "@/components/ui/Page";
import { Composer } from "@/components/rules/Composer";

export const metadata: Metadata = {
  title: "Composer",
  description: "Pick rule modules, tune their parameters and see the Uniswap v4 hook permissions, callbacks, config and risk read they produce.",
};

export default async function BuilderPage({ searchParams }: { searchParams: Promise<{ rules?: string }> }) {
  const { rules } = await searchParams;
  return (
    <>
      <PageHead
        eyebrow="Composer"
        title={
          <>
            Draft the rules. <span className="italic text-signal">Read the hook.</span>
          </>
        }
        lead="Switch modules on, set their numbers, and watch the permission bits, the callback list and the worst-case take update as you go. Everything here runs in your browser; nothing is signed or sent."
      />
      <Composer key={rules ?? "local"} initial={rules ?? null} />
    </>
  );
}
