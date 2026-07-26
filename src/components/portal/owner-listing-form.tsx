"use client";

import { useActionState, type ReactNode } from "react";

import {
  updateOwnerListingAction,
  type OwnerListingUpdateState,
} from "@/modules/portal/actions";

const initialState: OwnerListingUpdateState = {};

export function OwnerListingForm({ children }: { children: ReactNode }) {
  const [state, formAction] = useActionState(
    updateOwnerListingAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5 rounded-md border bg-card p-4 shadow-sm sm:p-5">
      {state.error ? (
        <div
          className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm font-medium text-foreground"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}
      {children}
    </form>
  );
}
