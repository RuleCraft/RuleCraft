import type { Metadata } from "next";
import { BRAND } from "@/config/brand";
import { PageHead } from "@/components/ui/Page";
import { Prose, Updated } from "@/components/info/Prose";

export const metadata: Metadata = { title: "Terms", description: `The terms for using ${BRAND.name}.` };

export default function TermsPage() {
  return (
    <>
      <PageHead eyebrow="Terms" title="Plain terms of use" lead="By using this site you accept these terms. They are short because the product is a set of tools, not a custodian.">
        <Updated date="2 October 2026" />
      </PageHead>
      <Prose>
        <h2>What the site is</h2>
        <p>
          {BRAND.name} is an interface for composing, reading and (after launch) deploying rules for Uniswap v4 pools on Robinhood Chain. It does not hold your funds, run an exchange or act as a broker. Pools live in the Uniswap v4 PoolManager; transactions are signed by you in your own wallet.
        </p>
        <h2>No advice</h2>
        <p>
          Nothing on the site is financial, legal or tax advice. Risk grades, rule summaries and examples are automated readings that can be incomplete or wrong. Example blueprints are illustrations, not recommendations.
        </p>
        <h2>Your responsibility</h2>
        <ul>
          <li>You check the network, the contract address and the transaction in your wallet before signing.</li>
          <li>You are responsible for the rules you publish and the pools you open, including any law that applies to you.</li>
          <li>You do not use the site to impersonate others, mislead traders or break the law.</li>
        </ul>
        <h2>Risks</h2>
        <p>
          Smart contracts can have bugs. Tokens can lose all value. Hooks can change what a trade pays or receives. Blockchains can halt or reorganise. Contracts are not deployed yet and no independent audit has been completed.
        </p>
        <h2>The {BRAND.symbol} token</h2>
        <p>
          The token is not published yet. When it is, holding it gives no ownership of a company, no right to profits and no claim on anyone. Token design described on this site can change before launch.
        </p>
        <h2>Availability</h2>
        <p>
          The site is provided as is. Features can change or stop without notice. To the extent the law allows, the people behind {BRAND.name} are not liable for losses from using it.
        </p>
        <h2>Changes</h2>
        <p>We may update these terms; the date above changes when we do.</p>
      </Prose>
    </>
  );
}
