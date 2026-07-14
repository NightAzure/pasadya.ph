import type { Metadata } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";

import { getConceptHomeData } from "@/components/homepage-concepts/data";
import { VolcanicQuiet } from "@/components/homepage-concepts/volcanic-quiet";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-vq-serif",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-vq-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Volcanic Quiet — Homepage Concept",
  description:
    "A cinematic editorial homepage concept for discovering Davao City and Samal Island with Pasadya.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function VolcanicQuietPage() {
  const data = await getConceptHomeData();

  return (
    <div className={`${instrumentSerif.variable} ${manrope.variable}`}>
      <VolcanicQuiet data={data} />
    </div>
  );
}
