import type { Metadata } from "next";
import { PageHead } from "@/components/ui/Page";
import { PortfolioView } from "@/components/info/PortfolioView";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Your wallet on Robinhood Chain: balances, pool positions, claimable pots and blueprint royalties.",
};

export default function PortfolioPage() {
  return (
    <>
      <PageHead eyebrow="Portfolio" title="Your positions, pots and royalties" lead="Everything a rule set owes you, in one place. Balances are live; positions and claims fill in once pools open." />
      <PortfolioView />
    </>
  );
}
