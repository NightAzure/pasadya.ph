"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function OwnerListingSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button
      aria-describedby="owner-save-status"
      className="w-full"
      disabled={pending}
      size="lg"
      type="submit"
    >
      {pending ? "Saving listing…" : "Save listing"}
      <span aria-live="polite" className="sr-only" id="owner-save-status">
        {pending ? "Saving listing changes." : ""}
      </span>
    </Button>
  );
}
