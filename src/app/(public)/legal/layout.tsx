import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

const legalLinks = [
  { href: "/legal/privacy", label: "Privacy policy" },
  { href: "/legal/terms", label: "Terms of service" },
  { href: "/legal/transport-disclaimer", label: "Transport disclaimer" },
  { href: "/legal/cancellation-policy", label: "Cancellation policy" },
];

export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="pb-12">
      <section className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to Pasadya
          </Link>
          <div className="mt-6 max-w-3xl">
            <p className="text-sm font-medium text-primary">Pasadya policies</p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              Legal and trust center
            </h1>
            <p className="mt-2 text-base leading-7 text-muted-foreground">
              Plain-language information about using Pasadya to discover places,
              request bookings, and plan local transport.
            </p>
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm leading-6 text-foreground">
            <FileText
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-warning"
            />
            <p>
              <strong>MVP draft for legal review.</strong> These pages are
              working launch copy, not a substitute for advice from qualified
              counsel. The legal entity, final contact details, retention
              schedule, and launch compliance decisions must be confirmed before
              public launch.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
        <nav aria-label="Policy pages" className="lg:pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            On this page
          </p>
          <div className="mt-3 grid gap-1">
            {legalLinks.map((link) => (
              <Link
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:bg-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
