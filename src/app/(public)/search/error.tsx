"use client";

import { Button } from "@/components/ui/button";

export default function SearchError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">Search could not load</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The discovery query failed. Try again or clear filters.
      </p>
      <Button className="mt-4" onClick={reset} type="button">
        Try again
      </Button>
    </div>
  );
}
