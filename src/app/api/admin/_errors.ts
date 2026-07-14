import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/rbac";
import { AdminDomainError } from "@/modules/admin";

export function adminErrorResponse(error: unknown, fallback: string) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === "Forbidden" ? 403 : 401 },
    );
  }
  if (error instanceof AdminDomainError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Admin request details are not valid.",
        issues: error.flatten(),
      },
      { status: 400 },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function readJson(request: Request) {
  return request.json().catch(() => null);
}
