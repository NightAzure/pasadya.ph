import type { Metadata } from "next";
import { Bodoni_Moda, Work_Sans } from "next/font/google";

import { getConceptHomeData } from "@/components/homepage-concepts/data";
import { KinabuhiIndex } from "@/components/homepage-concepts/kinabuhi-index";

const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-kinabuhi-editorial",
  weight: ["500", "600", "700"],
});

const workSans = Work_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-kinabuhi-sans",
});

export const metadata: Metadata = {
  title: "Kinabuhi Index — Homepage Concept",
  description:
    "A culture-led Pasadya homepage index for finding local guides, places, and routes across Davao City and Samal Island.",
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

export default async function KinabuhiIndexPage() {
  const data = await getConceptHomeData();

  return (
    <KinabuhiIndex
      data={data}
      fontClassName={`${bodoniModa.variable} ${workSans.variable}`}
    />
  );
}
