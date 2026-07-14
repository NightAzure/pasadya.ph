import type { Session } from "next-auth";

import { auth } from "@/lib/auth";

export class AuthorizationError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export type Role = "user" | "moderator" | "admin";

const roleRank: Record<Role, number> = {
  user: 1,
  moderator: 2,
  admin: 3,
};

export async function requireSession(session?: Session | null) {
  const resolvedSession = session === undefined ? await auth() : session;

  if (!resolvedSession?.user?.id) {
    throw new AuthorizationError();
  }

  return resolvedSession;
}

export async function authorize(options?: {
  session?: Session | null;
  minimumRole?: Role;
}) {
  const session = await requireSession(options?.session);
  const minimumRole = options?.minimumRole ?? "user";
  const userRole = session.user.role ?? "user";

  if (roleRank[userRole] < roleRank[minimumRole]) {
    throw new AuthorizationError("Forbidden");
  }

  return session;
}
