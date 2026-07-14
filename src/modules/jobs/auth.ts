import { timingSafeEqual } from "node:crypto";

export type JobAuthorization =
  | { authorized: true }
  | { authorized: false; status: 401 | 503; error: string };

export function authorizeJobRequest(request: Request): JobAuthorization {
  const secret = process.env.JOB_SECRET;
  if (!secret) {
    return {
      authorized: false,
      status: 503,
      error: "Job runner is not configured.",
    };
  }

  const provided = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  const matches =
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes);
  return matches
    ? { authorized: true }
    : { authorized: false, status: 401, error: "Unauthorized." };
}
