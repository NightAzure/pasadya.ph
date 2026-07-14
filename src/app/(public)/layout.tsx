import Link from "next/link";
import { Compass, Map, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8"
        >
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Compass aria-hidden="true" className="h-5 w-5" />
            </span>
            <span>{BRAND_NAME}</span>
          </Link>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href="/transport">
                <Map aria-hidden="true" className="h-4 w-4" />
                Routes
              </Link>
            </Button>
            <Button asChild variant="secondary" size="icon">
              <Link aria-label="Open account area" href="/account">
                <UserRound aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </nav>
      </header>
      <main id="main-content">{children}</main>
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>{BRAND_NAME} · Davao and Samal discovery · pasadya.ph</p>
          <nav
            aria-label="Legal navigation"
            className="flex flex-wrap gap-x-4 gap-y-2"
          >
            <Link
              className="underline-offset-4 hover:text-foreground hover:underline"
              href="/legal/privacy"
            >
              Privacy
            </Link>
            <Link
              className="underline-offset-4 hover:text-foreground hover:underline"
              href="/legal/terms"
            >
              Terms
            </Link>
            <Link
              className="underline-offset-4 hover:text-foreground hover:underline"
              href="/legal/transport-disclaimer"
            >
              Transport disclaimer
            </Link>
            <Link
              className="underline-offset-4 hover:text-foreground hover:underline"
              href="/legal/cancellation-policy"
            >
              Cancellation policy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
