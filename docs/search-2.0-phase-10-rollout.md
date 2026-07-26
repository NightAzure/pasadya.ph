# Search 2.0 Phase 10 — Rollout, Acceptance, and Rollback

> Companion to [09 — Search 2.0 Production Program](09-search-2.0-production-program.md) Phase 10.

## Feature flag

| Env | Values | Behavior |
|---|---|---|
| `SEARCH_V2_MODE` | `off` / `shadow` / `on` | `off` serves legacy `/search` immediately. `shadow` serves Search 2.0 and compares overlapping result sets with legacy. `on` serves Search 2.0. |
| `SEARCH_V2_ROLLOUT_PERCENT` | `0`–`100` | When mode is `on`, only this percent of opaque cookie buckets receive Search 2.0. Others receive legacy. |

Opaque bucket cookie: `pasadya_search_bucket` (optional). Missing cookie uses a stable anonymous bucket — never IP, user id, or coordinates.

Development default: `SEARCH_V2_MODE=on`, `SEARCH_V2_ROLLOUT_PERCENT=100`.

## Instant rollback

1. Set `SEARCH_V2_MODE=off` (or `SEARCH_V2_ROLLOUT_PERCENT=0`).
2. Redeploy / restart the app process so server components read the new env.
3. Confirm `/search` renders the legacy controls + `SearchResultsShell`.
4. Keep Search 2.0 APIs available for internal shadow/debug if needed; public UI is legacy.

## Shadow comparison

Runs when `SEARCH_V2_MODE=shadow`. Comparable shapes: text/area/category/amenity/rating style filters. Skipped for origin, route ceilings, bounds/radius, and verified-total/availability hard filters (no honest legacy peer). Aggregates land in privacy-safe observability only.

## Team acceptance — five primary journeys

Use seeded Samal/Davao inventory. Mark each journey after desktop `lg` and 375px checks.

| # | Journey | Pass criteria |
|---|---|---|
| 1 | Room for dates, pax, rooms, total budget, origin | Verified totals when trip context complete; origin route labels modeled; hard budget/route never pass unknowns |
| 2 | Samal day-use resort with amenities | Category-adaptive filters; amenity chips; list-first mobile; map optional |
| 3 | Restaurant for party, visit time, cuisine, meal budget | Cuisine/open-at controls; exact empty when hard filters unmatched |
| 4 | Activity by date, duration, capacity | Capacity/date hard filters; package/total labeling |
| 5 | Map explore + reachable from origin | List/map sync; keyboard zoom/locate/list fallback; location disclosure visible; no URL coordinate leak |

## Staged release sequence

1. Internal flag `shadow` on staging.
2. Shadow-query comparison green for comparable shapes.
3. Team acceptance table above signed.
4. Limited beta: `on` + low `SEARCH_V2_ROLLOUT_PERCENT` on Samal/Davao inventory.
5. Data-quality remediation via existing admin/owner tools.
6. Raise rollout percent gradually while watching p95, zero-result, and error rates.
7. Hold `/search` on Search 2.0 with legacy parameter parsing retained.
8. Keep `SEARCH_V2_MODE=off` as the instant rollback until stability targets hold.

## Production acceptance targets (development evidence vs beta)

| Target | Development evidence | Still required before launch |
|---|---|---|
| Quote parity 100% | Phase 4/5 verifiers | Live provider checkout recheck |
| Unknown hard-filter passes = 0 | Phase 5/10 verifiers | Beta inventory re-audit |
| Warm search p95 &lt; 500ms | Phase 5/10 seed load | Beta-volume remeasure (GAP-047/050) |
| Route-aware p95 &lt; 800ms | Phase 9/10 seed load | Beta-volume remeasure (GAP-050) |
| Local UI &lt; 100ms | Client state only; no network | Device lab |
| LCP / INP / CLS | Not measured here | Deployed 4G evidence (GAP-036) |
| Map/list consistency 100% | Phase 7 workspace sync | Live tile QA (GAP-048) |
| No overflow ≥320px | Prior Phase 6/7 browser QA | Recheck on beta content |
| No search-critical drag/hover/color-only | Keyboard map controls + list fallback | Cross-browser matrix |

## Privacy (current location)

- Permission-gated, session-only, POST body only.
- Never URL, history, sessionStorage, analytics payload, or structured logs.
- Visible disclosure ships beside the locate control (`LOCATION_PRIVACY_DISCLOSURE`
  on `#location-privacy-note`, also wired via `aria-describedby`).
- Metrics accept only `{ action, viewport }` and reject coordinate keys.
- Legal/privacy sign-off for MapTiler tile side-effects remains GAP-049.

## MapTiler key restriction (ops)

Configure the existing browser key’s allowed HTTP origins for production/preview hosts before beta (GAP-048). The app does not require a second MapTiler credential.
