import type { Metadata } from "next";
import { BRAND } from "@/config/brand";
import { PageHead } from "@/components/ui/Page";
import { Prose, Updated } from "@/components/info/Prose";

export const metadata: Metadata = { title: "Privacy", description: `What ${BRAND.name} collects, and what it does not.` };

export default function PrivacyPage() {
  return (
    <>
      <PageHead eyebrow="Privacy" title="Very little, on purpose" lead="No accounts, no email, no tracking pixels. Here is everything that does happen.">
        <Updated date="2 October 2026" />
      </PageHead>
      <Prose>
        <h2>Your wallet</h2>
        <p>
          Connecting a wallet tells this page your public address and which network you are on. We do not store it on a server. Your browser remembers which wallet you connected so you stay signed in on reload; disconnecting clears it.
        </p>
        <h2>Public chain data</h2>
        <p>
          Anything you do on {`Robinhood Chain`} is public by nature: addresses, balances, transactions and the rules of any pool you open. Profiles on this site are built from that public data only.
        </p>
        <h2>Drafts in your browser</h2>
        <p>The composer and the launch form may keep your draft in your browser&apos;s local storage so it survives a reload. It never leaves your device, and clearing site data removes it.</p>
        <h2>Server logs</h2>
        <p>
          Our host keeps standard request logs (time, path, IP address, user agent) for a short period to keep the service running and to stop abuse. Read requests sent through the chain relay are forwarded to an RPC provider, which sees the request but not who you are beyond the server&apos;s address.
        </p>
        <h2>Third parties</h2>
        <p>
          Fonts are served with the site. If you use WalletConnect, its relay handles the connection between this page and your mobile wallet under its own terms. Links to the explorer or X take you to those services.
        </p>
        <h2>Contact</h2>
        <p>
          Questions: direct message <a href={BRAND.x}>{BRAND.xHandle}</a>.
        </p>
      </Prose>
    </>
  );
}
