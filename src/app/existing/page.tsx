import type { Metadata } from "next";
import { PageHead } from "@/components/ui/Page";
import { ExistingForm } from "@/components/rules/ExistingForm";

export const metadata: Metadata = {
  title: "Rules for an existing token",
  description: "Open a Uniswap v4 pool with rules for a token that already trades on Robinhood Chain.",
};

export default function ExistingPage() {
  return (
    <>
      <PageHead
        eyebrow="Existing token"
        title="Give a token that already trades a pool with rules"
        lead="Paste any ERC-20 on Robinhood Chain. The token is read live from the chain, then you choose a quote asset, a fee and a rule set and see the exact pool that would open."
      />
      <ExistingForm />
    </>
  );
}
