import { authorize, AuthorizationError } from "@/lib/rbac";

export async function verifyUnauthenticatedDenied() {
  try {
    await authorize({ session: null });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return true;
    }
  }

  throw new Error("RBAC helper did not deny unauthenticated access");
}
