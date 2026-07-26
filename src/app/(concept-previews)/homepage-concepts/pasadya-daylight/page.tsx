import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";

import { getConceptHomeData } from "@/components/homepage-concepts/data";
import { PasadyaDaylight } from "@/components/homepage-concepts/pasadya-daylight";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-daylight",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-daylight-display",
});

export const metadata: Metadata = {
  title: "Pasadya Daylight — Homepage Concept",
  description:
    "A scalable local discovery, itinerary, sharing, and transport homepage direction for Pasadya.",
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

export default async function PasadyaDaylightPage() {
  const data = await getConceptHomeData();

  return (
    <div className={`${inter.variable} ${sourceSerif.variable}`}>
      <PasadyaDaylight data={data} />
    </div>
  );
}
