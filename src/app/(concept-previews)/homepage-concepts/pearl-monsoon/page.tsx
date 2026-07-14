import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import { getConceptHomeData } from "@/components/homepage-concepts/data";
import { PearlMonsoon } from "@/components/homepage-concepts/pearl-monsoon";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-pearl-sans",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-pearl-serif",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Pearl Monsoon — Homepage Concept",
  description:
    "A transport-first editorial Pasadya homepage concept for Davao City and Samal Island.",
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

export default async function PearlMonsoonPage() {
  const data = await getConceptHomeData();

  return (
    <div className={`${manrope.variable} ${cormorant.variable}`}>
      <PearlMonsoon data={data} />
    </div>
  );
}
