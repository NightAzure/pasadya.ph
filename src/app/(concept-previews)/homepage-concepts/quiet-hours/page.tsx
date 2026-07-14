import type { Metadata } from "next";
import { Newsreader, Outfit } from "next/font/google";

import { getConceptHomeData } from "@/components/homepage-concepts/data";
import { QuietHours } from "@/components/homepage-concepts/quiet-hours";

const newsreader = Newsreader({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-quiet-hours-display",
});

const outfit = Outfit({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-quiet-hours-body",
});

export const metadata: Metadata = {
  title: "Quiet Hours — Homepage Concept",
  description:
    "A private, time-led Pasadya homepage preview for discovering Davao City and Samal Island.",
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

export default async function QuietHoursPage() {
  const data = await getConceptHomeData();

  return (
    <QuietHours
      data={data}
      fontClassName={`${newsreader.variable} ${outfit.variable}`}
    />
  );
}
