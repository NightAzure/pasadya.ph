import type { Metadata } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";

import { getConceptHomeData } from "@/components/homepage-concepts/data";
import { SunlitFieldGuide } from "@/components/homepage-concepts/sunlit-field-guide";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-field-guide-sans",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-field-guide-display",
});

export const metadata: Metadata = {
  title: "Pasadya — Discover Davao & Samal Like a Local",
  description:
    "A warm, local-first homepage for discovering stays, food, experiences, and practical routes around Davao and Samal.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function SunlitFieldGuidePage() {
  const data = await getConceptHomeData();

  return (
    <div className={`${instrumentSans.variable} ${newsreader.variable}`}>
      <SunlitFieldGuide data={data} />
    </div>
  );
}
