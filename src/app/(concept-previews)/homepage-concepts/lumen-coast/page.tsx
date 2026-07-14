import type { Metadata } from "next";
import { Source_Serif_4, Urbanist } from "next/font/google";

import { getConceptHomeData } from "@/components/homepage-concepts/data";
import { LumenCoast } from "@/components/homepage-concepts/lumen-coast";

const urbanist = Urbanist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lumen-sans",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lumen-serif",
});

export const metadata: Metadata = {
  title: "Lumen Coast — Homepage Concept",
  description:
    "A bright editorial Pasadya homepage concept for discovering Davao City and Samal Island.",
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

export default async function LumenCoastPage() {
  const data = await getConceptHomeData();

  return (
    <div className={`${urbanist.variable} ${sourceSerif.variable}`}>
      <LumenCoast data={data} />
    </div>
  );
}
