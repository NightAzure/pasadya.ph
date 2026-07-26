import { createHash } from "node:crypto";

/**
 * Search 2.0 rollout control.
 *
 * - `off`: always serve the legacy `/search` implementation (instant rollback).
 * - `shadow`: serve Search 2.0 and compare overlapping result sets against legacy.
 * - `on`: serve Search 2.0, optionally gated by `SEARCH_V2_ROLLOUT_PERCENT`.
 *
 * Development default is `on` at 100% so Phases 5–9 remain the live path while
 * still allowing an env-only rollback without a code revert.
 */
export type SearchV2Mode = "off" | "shadow" | "on";

export function getSearchV2Mode(): SearchV2Mode {
  const raw = (process.env.SEARCH_V2_MODE ?? "on").trim().toLowerCase();
  if (raw === "off" || raw === "shadow" || raw === "on") return raw;
  return "on";
}

export function getSearchV2RolloutPercent(): number {
  const raw = Number(process.env.SEARCH_V2_ROLLOUT_PERCENT ?? "100");
  if (!Number.isFinite(raw)) return 100;
  return Math.min(100, Math.max(0, Math.floor(raw)));
}

/**
 * Stable assignment for gradual traffic. Uses an opaque bucket string (for
 * example a hashed cookie or request id) — never an IP, user id, or coordinate.
 */
export function shouldServeSearchV2(bucketKey = "default"): boolean {
  const mode = getSearchV2Mode();
  if (mode === "off") return false;
  if (mode === "shadow") return true;
  const percent = getSearchV2RolloutPercent();
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  const digest = createHash("sha256").update(`search-v2:${bucketKey}`).digest();
  const bucket = digest.readUInt16BE(0) % 100;
  return bucket < percent;
}

export function shouldRunShadowComparison(): boolean {
  return getSearchV2Mode() === "shadow";
}

export function searchV2RolloutSnapshot() {
  return {
    mode: getSearchV2Mode(),
    rolloutPercent: getSearchV2RolloutPercent(),
  };
}
