import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";

import { getConceptHomeData } from "@/components/homepage-concepts/data";
import { HarvestClub } from "@/components/homepage-concepts/harvest-club";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-harvest-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-harvest-body",
});

export const metadata: Metadata = {
  title: "Harvest Club — Homepage Concept",
  description:
    "An expressive tropical-modern Pasadya homepage concept for Davao City and Samal Island.",
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

export default async function HarvestClubPage() {
  const data = await getConceptHomeData();

  return (
    <HarvestClub
      data={data}
      fontClassName={`${fraunces.variable} ${dmSans.variable}`}
    />
  );
}
