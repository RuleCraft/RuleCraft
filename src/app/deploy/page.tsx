import type { Metadata } from "next";
import { PageHead } from "@/components/ui/Page";
import { Badge } from "@/components/ui/Page";
import { DeployConsole } from "@/components/onchain/DeployConsole";

export const metadata: Metadata = {
  title: "Deploy contracts",
  description: "Owner console: deploy the Rule Craft registry, launcher and hook on Robinhood Chain from your own wallet.",
  robots: { index: false },
};

export default function DeployPage() {
  return (
    <>
      <PageHead
        eyebrow="Owner console"
        title="Deploy the contracts"
        lead="Four transactions from your own wallet: registry, launcher, the mined hook, then one wiring call. The site never sees a key. Anyone can open this page, but only the addresses committed to the site's config are used by it."
      >
        <Badge tone="warn">Unaudited contracts</Badge>
      </PageHead>
      <DeployConsole />
    </>
  );
}
