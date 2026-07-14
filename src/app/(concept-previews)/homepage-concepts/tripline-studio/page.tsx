import type { Metadata } from "next";
import { IBM_Plex_Mono, Sora } from "next/font/google";

import { getConceptHomeData } from "@/components/homepage-concepts/data";
import { TriplineStudio } from "@/components/homepage-concepts/tripline-studio";

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-tripline-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-tripline-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Tripline Studio — Homepage Concept",
  description:
    "A product-forward Pasadya discovery workspace for Davao City and Samal Island.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function TriplineStudioPage() {
  const data = await getConceptHomeData();

  return (
    <div className={`${sora.variable} ${ibmPlexMono.variable}`}>
      <TriplineStudio data={data} />
    </div>
  );
}
