import type { Metadata } from "next";
import {
  Instrument_Sans,
  Inter,
  Newsreader,
  Source_Serif_4,
} from "next/font/google";

import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-field-guide-sans",
  display: "swap",
});

const fieldGuideDisplay = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-field-guide-display",
  display: "swap",
});

const daylightDisplay = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-daylight-display",
  display: "swap",
});

function getMetadataBase() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (!configuredUrl) {
    return new URL("http://localhost:3000");
  }

  try {
    return new URL(
      configuredUrl.includes("://")
        ? configuredUrl
        : `https://${configuredUrl}`,
    );
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  description: `${BRAND_TAGLINE} ${BRAND_DESCRIPTION}`,
  applicationName: BRAND_NAME,
  authors: [{ name: BRAND_NAME }],
  openGraph: {
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    siteName: BRAND_NAME,
    locale: "en_PH",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" lang="en-PH">
      <body
        className={cn(
          instrumentSans.variable,
          fieldGuideDisplay.variable,
          inter.variable,
          daylightDisplay.variable,
          "min-h-screen font-sans antialiased",
        )}
      >
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
