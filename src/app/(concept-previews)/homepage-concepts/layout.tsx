import type { Metadata } from "next";

// Concept pages read Postgres; keep them request-time so a down DB cannot
// fail `next build` or bake empty shells into the deploy.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function HomepageConceptsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
