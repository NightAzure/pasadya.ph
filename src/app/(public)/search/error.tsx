"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function SearchError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-8 sm:px-4 lg:px-5">
      <section
        aria-labelledby="search-error-title"
        className="mx-auto max-w-2xl rounded-[16px_16px_38px_16px] border bg-card px-6 py-12 text-center shadow-lg"
      >
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
          <SearchX aria-hidden="true" className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold" id="search-error-title">
          Search could not load
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          We couldn’t reach the discovery service. Try again, or return to an
          unfiltered search.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset} type="button">
            Try again
          </Button>
          <Button asChild variant="secondary">
            <Link href="/search">Clear filters</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
