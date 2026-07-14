"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ListingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">Listing could not load</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This place is temporarily unavailable. Return to search or try again.
      </p>
      <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
        <Button onClick={reset} type="button">
          Try again
        </Button>
        <Button asChild variant="secondary">
          <Link href="/search">Back to search</Link>
        </Button>
      </div>
    </div>
  );
}
