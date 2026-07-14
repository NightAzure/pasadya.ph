import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

import { getConceptHomeData } from "@/components/homepage-concepts/data";
import { GulfLines } from "@/components/homepage-concepts/gulf-lines";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-gulf-lines",
});

export const metadata: Metadata = {
  title: "Gulf Lines — Homepage Concept",
  description:
    "A map-first Pasadya homepage concept for Davao City and Samal Island.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function GulfLinesPage() {
  const data = await getConceptHomeData();

  return (
    <div className={spaceGrotesk.className}>
      <GulfLines data={data} />
    </div>
  );
}
