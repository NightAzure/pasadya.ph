import type { Metadata } from "next";
import { Archivo_Black, Plus_Jakarta_Sans } from "next/font/google";

import { getConceptHomeData } from "@/components/homepage-concepts/data";
import { AfterglowSocial } from "@/components/homepage-concepts/afterglow-social";

const archivoBlack = Archivo_Black({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-afterglow-display",
  weight: "400",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-afterglow-body",
});

export const metadata: Metadata = {
  title: "Afterglow Social — Homepage Concept",
  description:
    "An expressive, search-first Pasadya homepage concept for Davao City and Samal Island.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function AfterglowSocialPage() {
  const data = await getConceptHomeData();

  return (
    <AfterglowSocial
      data={data}
      fontClassName={`${archivoBlack.variable} ${plusJakartaSans.variable}`}
    />
  );
}
