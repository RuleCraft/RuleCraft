import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { BRAND } from "@/config/brand";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { WalletModalProvider } from "@/components/wallet/WalletButton";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"], style: ["normal", "italic"] });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: { default: `${BRAND.name} | ${BRAND.slogan}`, template: `%s | ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.name,
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `${BRAND.name} | ${BRAND.slogan}`,
    description: BRAND.description,
    url: BRAND.url,
  },
  twitter: { card: "summary_large_image", site: BRAND.xHandle, creator: BRAND.xHandle },
};

export const viewport: Viewport = {
  themeColor: "#f2eee4",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <WalletProvider>
          <WalletModalProvider>
            <SiteHeader />
            <main className="min-h-[60vh]">{children}</main>
            <SiteFooter />
          </WalletModalProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
