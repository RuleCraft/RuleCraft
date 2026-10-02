import type { Metadata } from "next";
import { PageHead } from "@/components/ui/Page";
import { LaunchForm } from "@/components/rules/LaunchForm";

export const metadata: Metadata = {
  title: "Launch a token",
  description: "Five steps to a new token whose pool carries your rules. Every check runs before anything is signed.",
};

export default async function LaunchPage({ searchParams }: { searchParams: Promise<{ rules?: string }> }) {
  const { rules } = await searchParams;
  return (
    <>
      <PageHead
        eyebrow="Pool-first launch"
        title={
          <>
            A token is born <span className="italic text-signal">inside</span> its pool.
          </>
        }
        lead="Name it, pick its rules and its opening price. The review shows every call the launcher would make. Deploying opens when the Rule Craft contracts are published; until then, drafts stay in your browser."
      />
      <LaunchForm key={rules ?? "local"} initial={rules ?? null} />
    </>
  );
}
