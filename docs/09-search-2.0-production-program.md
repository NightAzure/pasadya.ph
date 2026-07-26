# 09 — Search 2.0 Production Program

> [← Roadmap & Operations](08-roadmap-and-operations.md) | [README](../README.md)

## Objective

Search 2.0 will be treated as a multi-phase product program, not a single
implementation task. Each phase is a separate prompt-sized unit with explicit
deliverables, tests, and an approval gate. Production implementation does not
begin until the research and design phases are approved.

The feature must directly solve these existing pain points:

- Price filters currently use a generic starting price instead of the actual
  cost for dates, pax, and required rooms or packages.
- Pax is collected during booking but cannot meaningfully filter or price
  search results.
- Location filtering is limited to text and two predefined areas.
- Transport exists as a separate planner instead of helping users choose
  reachable places.
- Mobile users encounter the entire desktop filter form before the first
  result.
- The current map is a coordinate illustration rather than a navigable search
  surface.
- Missing price, capacity, availability, or route information is not handled
  with sufficiently clear trust semantics.
- Mixed categories receive nearly identical filters even though rooms,
  resorts, restaurants, activities, and services have different decision
  criteria.

Research supports total-price consistency across search, map, filters, listing
pages, and checkout; visible applied filters on mobile; map/list
synchronization; and transport comparisons based on time, fare, walking,
transfers, and mode.

Research references:

- [Airbnb total-price standard](https://news.airbnb.com/total-price-display-is-now-standard-globally/)
- [Baymard product-list and filtering research](https://baymard.com/research/ecommerce-product-lists)
- [Google Maps search behavior](https://support.google.com/maps/answer/3092445)
- [Rome2Rio route comparison](https://help.rome2rio.com/en/support/solutions/articles/22000281002-how-to-search-with-rome2rio)

## Locked Product Principles

- MapLibre with MapTiler remains the production map stack.
- Mobile starts in list view with a persistent full-screen Map switch.
- Desktop uses a synchronized list/map workspace.
- Filters adapt to the selected category.
- Dates, pax, and rooms produce a verified total cost—not an estimated
  starting-price substitution.
- Unknown data remains visible in ordinary discovery but cannot satisfy a hard
  filter.
- An origin may influence ranking without excluding results; selecting route
  limits makes route evidence mandatory.
- Search never silently relaxes hard filters. Near matches may appear only in
  a separately labeled section outside the matching result count.
- Precise browser location requires explicit permission and is not stored in
  URLs, analytics, or profiles.
- Google Places and website ingestion are future work. This program only
  prepares provenance and connector boundaries.
- Search remains at `/search`, with backward compatibility for existing links.
- Production release is feature-flagged and reversible.
- The existing Pasadya Daylight identity and a more neutral map-utility
  direction will both be explored before the team chooses the final visual
  direction.
- Validation before implementation is team review only; no external
  participant recruitment is required.

---

## Phase 0 — Research, Pain Matrix, and Product Contract

### Goal

Create an evidence-backed definition of what Pasadya search must solve before
designing screens or changing schemas.

### Deliverables

- Audit the current search, booking quote, availability, transport, owner
  portal, database, responsive layouts, and analytics capabilities.
- Produce a competitor matrix covering:
  - Airbnb: dates, guests, total prices, map pins, and progressive filters.
  - Google Maps: relevance/distance, map movement, nearby search, and pin
    selection.
  - Booking/Agoda: accommodation filters, room inventory, cancellation, and
    availability.
  - Rome2Rio and Google Transit: time, fare, mode, walking, and transfer
    comparison.
  - Local directories: unavailable filters, stale information, and poor mobile
    navigation.
- Create a pain-to-requirement matrix. Every identified problem must map to:
  - User scenario.
  - Required data.
  - UI behavior.
  - Hard-filter semantics.
  - Empty/error behavior.
  - Acceptance test.
- Define five primary search journeys:
  1. Find a room for specified dates, pax, rooms, total budget, and origin.
  2. Find a Samal day-use resort for a group with required amenities.
  3. Find a restaurant for a party, visit time, cuisine, and meal budget.
  4. Find an activity by date, duration, capacity, and inclusions.
  5. Explore the map and discover places reachable from a selected origin.
- Audit real-data readiness:
  - Percentage of listings with valid coordinates.
  - Verified rates and units.
  - Rate capacity.
  - Availability coverage.
  - Structured areas.
  - Hours.
  - Amenities.
  - Route proximity and freshness.
- Define trust labels and meanings: verified, owner-provided, team-verified,
  estimated, stale, and unknown.
- Define the initial geography as Samal Island and Davao City while ensuring
  the area hierarchy can expand later.
- Establish baseline metrics from the current search: search latency, zero
  results, result clicks, filter usage, map usage, and mobile abandonment where
  measurable.

### Gate

The team approves the pain matrix, five journeys, hard-filter rules, trust
vocabulary, and production success metrics.

### Prompt boundary

Research and specification only. No product code or migrations.

### Phase 0 Handoff

- Status: `[x]` Complete — team approval recorded on 2026-07-19.
- Research artifact: [Phase 0 Research, Pain Matrix, and Product Contract](search-2.0-phase-0-research-contract.md)
- Completed checklist items: Current-system audit, competitor matrix,
  pain-to-requirement matrix, five journeys, hard-filter rules, trust
  vocabulary, data-readiness measurement plan, geography/privacy contract, and
  production metric plan.
- Product decisions needed: None. PD-029 through PD-032 were accepted on
  2026-07-19.
- Limitations and gaps: GAP-039 and GAP-040 remain open; GAP-038 and GAP-041
  are resolved in the shared verification register.
- Completion evidence: Source audit, targeted Prettier/local-link checks, and
  `npm run db:verify` passed on 2026-07-19. The documented read-only seed audit
  measured 9 published listings; results are in the research contract. Team
  approval was recorded on 2026-07-19.
- Resume Here: Phase 0 is complete. Begin Phase 1 — Information Architecture
  and Two Design Directions. GAP-039 and GAP-040 are later-phase implementation
  work and remain outside this completed research-only phase.

---

## Phase 1 — Information Architecture and Two Design Directions

### Goal

Resolve the interaction and visual design before production implementation.

### Direction A: Pasadya Daylight Explorer

- Preserve the warm, regional Pasadya identity.
- Use editorial photography, cream surfaces, and strong branded accents.
- Introduce a denser search workspace while retaining visual warmth.
- Make listing comparison feel travel-oriented rather than purely utilitarian.

### Direction B: Pasadya Map Utility

- Use a more neutral, map-dominant workspace inspired by Google Maps.
- Keep Pasadya branding in navigation, selected states, route colors, and key
  actions.
- Reduce decoration around filters and comparison data.
- Prioritize information density, geographic context, and fast scanning.

### Required design artifacts

- End-to-end flows for the five primary journeys.
- Responsive wireframes at 375px, 768px, 1024px, and 1440px.
- High-fidelity responsive prototypes for both directions covering:
  - Empty search.
  - Initial results.
  - Filters applied.
  - Full-screen mobile map.
  - Desktop split view.
  - Selected map pin and listing preview.
  - No exact matches.
  - Missing price/route information.
  - Loading and provider error.
  - Permission denied for current location.
- Desktop structure:
  - Sticky global search header.
  - Compact quick-filter row.
  - Result summary and sort.
  - Approximately 55% list and 45% map.
  - Collapsible list or map when additional space is needed.
- Mobile structure:
  - Compact search summary.
  - Horizontal quick-filter chips.
  - First listing visible without scrolling through filters.
  - Filter bottom sheet with “Show N places.”
  - Full-screen map with a persistent return-to-list control.
  - Draggable listing preview with non-drag alternatives.
- Component specifications for:
  - Search composer.
  - Autocomplete.
  - Date/visit-time selector.
  - Pax and rooms selector.
  - Quick filters.
  - Advanced filter sheet/modal.
  - Applied-filter chips.
  - Listing cards.
  - Total-price breakdown.
  - Price pins and clusters.
  - Route summary.
  - Trust and freshness labels.
  - Empty and near-match states.
- Team walkthrough using the five journeys and predefined personas.
- Evaluation rubric:
  - Task clarity.
  - Number of interactions.
  - First-result visibility.
  - Filter comprehension.
  - Price and route trust.
  - Map/list continuity.
  - Mobile thumb reach.
  - Information density.
  - Pasadya brand distinctiveness.
  - Accessibility and low-bandwidth behavior.

### Gate

The team selects one visual direction and approves a single final prototype.
All subsequent design decisions use that approved prototype; engineers do not
choose between directions during implementation.

### Prompt boundary

Design artifacts and specifications only. No production UI code.

### Phase 1 Handoff

- Status: `[x]` Complete — Direction A and the final prototype were approved
  on 2026-07-19.
- Design artifact: [Phase 1 Information Architecture and Design Directions](search-2.0-phase-1-design-specification.md)
- Completed checklist items: Five journey flows, responsive wireframes at 375,
  768, 1024, and 1440px, component/state contracts, two high-fidelity direction
  boards, review findings, and team evaluation rubric.
- Product decisions needed: None. PD-033 selected Direction A on 2026-07-19.
- Limitations and gaps: GAP-042 is resolved; GAP-039 and GAP-040 are carried
  forward as later implementation work.
- Completion evidence: Design-only artifacts created on 2026-07-19. Builder,
  UX/accessibility, security/data, product, architecture, and release reviews
  were completed. Direction A/final-prototype approval was recorded. No
  production UI code, schema, or map implementation changed.
- Resume Here: Phase 1 is complete. Begin Phase 2 — Database and Data-Trust
  Foundation.

---

## Phase 2 — Database and Data-Trust Foundation

### Goal

Make listings structurally capable of supporting trustworthy filtering.

### Database changes

- Add a hierarchical `areas` model:
  - Province.
  - City/municipality.
  - Barangay.
  - Parent relationship.
  - Canonical slug.
  - Optional boundary/center geometry.
- Link listings to their canonical area while preserving the human-readable
  address.
- Extend listing location metadata with:
  - Canonical PostGIS point.
  - Source.
  - Accuracy level.
  - Verification status.
  - Last verified timestamp.
  - Verifying actor.
- Add structured special and weekly opening hours.
- Add aliases and alternative local names for search.
- Add listing-source provenance:
  - Provider.
  - External identifier.
  - Source URL.
  - Rights/retention classification.
  - Last checked and verified dates.
  - Canonical-field ownership.
- Do not create an automated Google Places connector or store raw Google
  responses.
- Add data-quality status fields or derived checks for:
  - Missing location.
  - Ambiguous pricing.
  - Missing capacity.
  - Missing category attributes.
  - Stale route data.
  - Unverified source information.

### Migration strategy

- Add new fields without removing current columns.
- Backfill structured areas from existing address JSON.
- Preserve existing coordinates and mark their initial confidence/source.
- Generate a report for records that cannot be safely mapped.
- Keep old reads working while new services are introduced.
- Add indexes for area, location, source identity, verification, hours, and
  search aliases.
- Make the migration rerunnable and safe against partially completed
  backfills.

### Gate

- Migrations run successfully against a production-like copy.
- Rollback is documented.
- Existing search, booking, portal, and admin tests remain green.
- Every existing listing appears in the data-quality report.
- No uncertain value is silently treated as verified.

### Prompt boundary

Schema, migrations, backfill, and verification only.

### Phase 2 Handoff

- Status: `[x]` Complete — verified for development on 2026-07-19.
- Completed checklist items: Added an expandable `areas` hierarchy and area/listing
  aliases; linked listings to canonical areas without changing legacy address
  JSON; added unknown-default location trust metadata, field-level provenance,
  weekly/special hours, and an all-listing data-quality report. Additive,
  rerunnable migrations and the seed-integrated backfill keep old readers
  working.
- Product decisions needed: None outstanding. PD-034 and PD-035 record the
  MVP-safe conventions selected for this implementation.
- Limitations and gaps: GAP-039 is only partially mitigated: provenance,
  location trust, areas, and hours are now modelled, but authoritative
  price/capacity/availability semantics remain Phase 4. GAP-040 remains open.
  The development seed report is evidence of structural readiness, not
  production-data readiness. GAP-043 records an unrelated generated Next route
  manifest conflict that prevents standalone `tsc --noEmit` from passing while
  the production build's TypeScript check succeeds.
- Completion evidence: A clean PostGIS database copy applied migrations
  `0001`–`0005`, seeded/backfilled 9/9 listings, passed the Phase 2 verifier,
  then safely skipped all migrations and reported zero additional mappings on
  rerun. The report kept all legacy locations `unknown`, including four
  surfaced Davao City/Davao del Sur address conflicts. Existing Phase 04–08
  verifiers, `db:verify`, lint, and the production build passed. Rollback is
  documented beside the data-trust migration.
- Resume Here: Phase 2 is complete. Begin Phase 3 — Owner and Admin Data-Quality
  Tools. Build address search/pin confirmation, structured rate/category data,
  completeness feedback, and admin repair queues on the Phase 2 schema; do not
  treat any currently unknown legacy field as verified.

---

## Phase 3 — Owner and Admin Data-Quality Tools

### Goal

Give Pasadya a reliable way to collect the data that Search 2.0 needs before
exposing advanced filters.

### Owner tooling

- Add address search and draggable pin placement.
- Require explicit confirmation before coordinates change.
- Show the full resolved address and coordinates before saving.
- Validate supported-region bounds while permitting controlled admin
  overrides.
- Add structured rate editing:
  - Rate name and type.
  - Billing period and unit.
  - Base price.
  - Included pax.
  - Extra-pax charge.
  - Capacity per unit.
  - Inventory-unit label.
  - Minimum and maximum pax.
  - Available quantity.
- Add category-specific attributes and hours.
- Show a listing-completeness checklist explaining which filters the listing
  can enter.
- Preview exactly how total price, capacity, and route trust will appear in
  search.

### Admin tooling

- Map-based coordinate correction.
- Duplicate detection by name similarity and geographic proximity.
- Ambiguous-rate review queue.
- Source/provenance inspection.
- Bulk area assignment.
- Route-freshness and nearest-stop audit.
- Publish blocking rules for invalid coordinates or unusable primary rates.
- Audit logs for location, rate, capacity, hours, and provenance changes.

### Gate

- Owners can complete all search-critical data without manually entering
  latitude/longitude.
- Admins can identify and repair incomplete records.
- Changes produce audit entries.
- Existing claim and moderation boundaries remain enforced.

### Prompt boundary

Owner/admin data-entry and moderation only.

### Phase 3 Handoff

- Status: `[~]` In progress — owner/admin data-quality tools and MapTiler-backed address search are implemented; complete Phase 3 after verifier + 375px/`lg` QA confirmation.
- Completed checklist items: Added nullable structured rate declarations and data checks; MapTiler-backed owner address search (server-side, rate-limited, launch-bbox + PH country scoped) with suggestion selection, draggable-pin confirmation, keyboard nudge controls, and no coordinate typing; structured primary-rate capture; typed allowlisted category facts; explicit hours; owner-provided provenance; current search-data completeness/preview; pending/error owner save states; and before/after field-group audit capture. Added an admin data-quality queue with editable provider-neutral coordinate map/address fallback, evidence-gated location/rate/provenance repair, durable controlled coordinate overrides, pair-level duplicate decisions, audit timelines, bulk canonical-area assignment, route-stop diagnostics, and a publish guard for invalid launch-area coordinates or unusable primary rates.
- Product decisions needed: PD-036 — formally approve the supported-region geometry. Research updated the temporary Samal/Davao City envelope to latitude `6.900000–7.566667`, longitude `125.233333–125.791111`: Davao City's CLUP grid is `6°58′–7°34′ N`, `125°14′–125°40′ E`; Samal's official profile is `6°54′–7°11′28″ N`, `125°39′30″–125°47′28″ E`. Replace this envelope with reviewed polygons before beta; no owner input is marked verified. PD-037 decided: MapTiler Geocoding API is the owner address-resolution provider (development fixtures when `MAPTILER_API_KEY` is unset/placeholder).
- Limitations and gaps: GAP-040 is explicitly deferred and unchanged because no Search 1 baseline exists; no analytics was added. GAP-044 is mitigated for development via MapTiler search plus launch-area fixtures; live MapTiler credentials remain required before beta. The admin map deliberately uses no tiles. Phase 4 authoritative price/availability calculations remain out of scope.
- Completion evidence: `npm run db:migrate` applied `0006_search2_phase03_data_quality_tools.sql` and `0007_search2_phase03_location_override.sql`; prior Phase 3 mutation/RBAC proofs plus the extended geocoding verifier path (development fixtures, mocked MapTiler request, out-of-bbox filtering). Re-run `npm run search2:phase03:verify`, typecheck, lint, build, and 375px/`lg` owner QA after this address-search slice.
- Resume Here: Re-run Phase 3 verification and owner/admin 375px/`lg` QA for the MapTiler address-search control. If those pass, mark Phase 3 verified for development and begin Phase 4. Keep PD-036 polygon approval and live `MAPTILER_API_KEY` as beta follow-ups.

---

## Phase 4 — Authoritative Pricing, Capacity, and Availability Engine

### Goal

Guarantee that search never displays a price or availability claim that
checkout contradicts.

### Pricing model

Replace ambiguous price-unit behavior with explicit dimensions:

- Billing period: once, per night, per day, or per hour.
- Billing unit: inventory unit, person, or group.
- Capacity per inventory unit.
- Included pax.
- Extra-pax charge.
- Minimum and maximum pax.
- Required room/unit count.
- Available quantity by date.
- Overrides by date.

### Shared quote behavior

- Accept listing, rate, dates/visit duration, pax, and requested rooms/units.
- Determine the number of units needed.
- Reject plans that cannot fit the party.
- Check every applicable date and availability override.
- Account for already reserved inventory units.
- Calculate the exact total and human-readable breakdown.
- Return the cheapest eligible plan for search.
- Return structured rejection reasons for filter counts and diagnostics.
- Use the same engine in:
  - Search.
  - Map price pins.
  - Listing details.
  - Booking form.
  - Checkout.
  - Owner preview.
- Migrate current rate units through explicit mappings.
- Send ambiguous legacy records to admin review instead of estimating.

### Gate

- Search, listing page, and checkout totals are identical for the same inputs.
- Multi-room and multi-unit capacity works.
- Concurrent bookings cannot over-reserve inventory.
- All billing period/unit combinations have unit and integration tests.
- Existing bookings retain their recorded financial meaning.

### Prompt boundary

Pricing, inventory, availability, and booking compatibility only.

### Phase 4 Handoff

- Status: `[x]` Verified for development — the existing Search and seeded Map now consume the same server-side authoritative quote result as listing/owner panels and checkout. Manual 375px/`lg` visual QA is explicitly deferred by product direction; automated validation passed.
- Completed checklist items: Added `0008_search2_phase04_pricing_inventory.sql`, `0009_search2_phase04_quote_eligibility.sql`, and `0010_search2_phase04_fixed_fee_basis.sql`; explicit legacy mappings, review items for ambiguous rates, strict no-unknown quote eligibility, one fixed per-booking fee disclosure, trust/freshness eligibility with required verification timestamps, date-level unit reservations, listing-wide transactional inventory locks, atomic rate/listing availability overrides, immutable booking quote snapshots, required-unit calculation, explicit billing-period/unit quote math, structured rejections, and booking API UUID rate selection/error recovery. Listing and owner panels call `/api/quotes`; Search enumerates active server-side rates through `getCheapestAuthoritativeQuote`, and forwards that result to cards and Map pins. With complete trip inputs, the UI displays an exact fee-aware total or an unavailable state; without them it only labels a non-authoritative starting price. Selected exact-trip rate and inputs carry into listing and booking prefill. The Phase 05 fixture remains compatible and passes.
- Product decisions needed: PD-038 through PD-040 are recorded in the shared register: Manila date/hour semantics, required-unit and hold behavior, and conservative legacy mapping. PD-041 is decided for development: each rate must explicitly declare no charge or one named fixed mandatory fee/tax; richer tax/percentage rules remain a later reviewed extension.
- Limitations and gaps: GAP-040 is explicitly deferred and unchanged because no Search 1 baseline exists. GAP-045 is mitigated for development: an exact quote supports only a declared zero or one named fixed per-booking fee; percentage, per-person, per-period, inclusive, and unmodeled taxes remain ineligible and require a reviewed charge ledger. Only fresh team-verified/verified evidence with recorded verification timestamps passes `verifiedTotalEligible`. GAP-046 is resolved for the current Search/card and seeded-Map consumer slice: numeric Map pins are reserved for verified totals, while owner-provided totals remain in listing details. Phase 5 must not claim its existing generic starting-price filters are verified-price filters, and any Phase 7 Map replacement must retain and revalidate this adapter. Existing generic starting-price cards are not authoritative quote claims.
- Completion evidence: `npm run db:migrate` applied `0008_search2_phase04_pricing_inventory.sql`, `0009_search2_phase04_quote_eligibility.sql`, and `0010_search2_phase04_fixed_fee_basis.sql`; `npm run db:verify` passed; `npm run search2:phase04:verify` passed all 12 billing-period/unit combinations, extra-pax, disclosed mandatory fee/date override, cheapest eligible Search/Map adapter selection, verification-timestamp trust eligibility, unknown/ambiguous rejection, concurrent final-unit reservation, snapshot, and reservation-row proofs; `npm run phase05:verify`, `npm run typecheck`, `npm run lint`, targeted formatting checks, `git diff --check`, and `npm run build` passed.
- Resume Here: Phase 4 is verified for development. Manual 375px/`lg` owner/admin, address-search, and quote-panel QA remains explicitly deferred. Begin Phase 5 only when its scope is active; implement verified-price filtering/faceting from authoritative quote results rather than `price_min`. If Phase 7 replaces the seeded Map, reconnect it to `getAuthoritativeQuote` and rerun parity evidence. Keep GAP-040 deferred; do not introduce Search 1 analytics.

---

## Phase 5 — Search Query, Faceting, and Ranking Platform

### Goal

Build a production search service independent of the eventual visual
interface.

### Search contract

Create a validated `SearchQuery` containing:

- Text.
- Category.
- Area, bounds, radius, or named location.
- Dates or visit time.
- Pax and rooms.
- Verified total-price constraints.
- Rate types.
- Amenities and category attributes.
- Rating, booking, crowd, DOT, and trust filters.
- Optional route origin and route constraints.
- Sort.
- Cursor and limit.

Return a `SearchResponse` containing:

- Matching listings.
- Verified matched rate and total.
- Availability evidence.
- Geographic distance.
- Route summary when requested.
- Match explanations.
- Data warnings.
- Dynamic facets and counts.
- Total count.
- Result bounds.
- Stable pagination cursor.
- Timing metadata.

### Text and location search

- Use weighted PostgreSQL full-text search with the `simple` configuration for
  local names.
- Retain trigram typo tolerance.
- Include aliases, barangays, municipalities, amenities, and selected
  structured attributes.
- Rank exact name and location matches above description matches.
- Add search suggestions for:
  - Listings.
  - Barangays and areas.
  - Landmarks and route stops.
  - Category queries.
- Use PostGIS for radius and bounds queries.
- Add cursor pagination with deterministic secondary ordering.

### Hard-filter rules

- Unknown price cannot satisfy maximum price.
- Unknown availability cannot satisfy “available for these dates.”
- Unknown capacity cannot satisfy a pax/rooms constraint.
- Unknown route cannot satisfy time, fare, walking, transfer, or mode
  constraints.
- Empty exact results remain empty; the system does not inject nonmatching
  listings.
- Near matches may be calculated separately with explicit failed-constraint
  explanations.

### Ranking

“Best match” uses:

1. Text/category relevance.
2. Hard-filter compliance.
3. Availability and capacity confidence.
4. Price fit.
5. Distance or route fit.
6. Review confidence rather than raw average alone.
7. Information freshness and completeness.

Sponsored placement remains a separate labeled layer and never alters the
organic score.

### Gate

- All hard filters have database integration tests.
- Dynamic facet counts remain correct with multiple combined filters.
- Pagination has no duplicates or unstable reordering.
- Common warm queries meet the agreed latency budget.
- Zero-result and failed-constraint diagnostics are recorded.

### Prompt boundary

Backend search services and contracts only.

### Phase 5 Handoff

- Status: `[x]` Verified for development — validated backend search contracts,
  faceting, ranking, suggestions, pagination, and authoritative verified-price
  filtering are available independently of the Phase 6 workspace UI.
- Completed checklist items: Added the strict Zod `SearchQuery` and typed
  `SearchResponse`; weighted `simple` PostgreSQL FTS search documents covering
  listing/area aliases, address, amenities, selected attributes, and
  descriptions; trigram suggestions for listings, areas, stops, and
  categories; PostGIS radius/bounds filtering; deterministic opaque
  query-fingerprinted cursors; result bounds, dynamic facets, explanations,
  warnings, timing, and review-confidence ranking. Added `/api/search` with
  bounded request validation and rate limiting. Verified-total and availability
  filters now call the canonical quote service with fresh verified evidence and
  explicit per-date coverage; they never use `price_min` or the legacy
  absent-row availability fallback. Strict route constraints return an exact
  empty response until Phase 9 can supply fresh per-listing route evidence.
- Product decisions needed: PD-042 is decided for development: every searched
  service date requires an explicit rate/listing availability record plus fresh
  `verified`/`team_verified` price and availability evidence before a listing
  can satisfy an availability or verified-total constraint. The checkout
  fallback remains only for its pre-existing non-search compatibility path.
- Limitations and gaps: Origin-only results retain a `route: null` warning;
  route summaries and strict route evaluation are Phase 9 work, and strict
  limits deliberately remain exact-empty. Quote evaluation is canonical but
  per candidate (N+1); the development fixture p95 is under 500ms, but it must
  be remeasured at beta inventory/launch volume and replaced with a set-based
  adapter if needed. Production rate-limit backing and HTTP error/rate-limit
  integration probes remain beta hardening work. GAP-040 remains open: timing
  metadata is not analytics or a production baseline.
- Completion evidence: `npm run db:migrate` applied
  `0011_search2_phase05_search_documents.sql`; `npm run search2:phase05:verify`
  passed strict payload/context/origin validation, explicit fresh daily
  coverage, verified total parity, PostGIS radius, combined amenity/DOT facets,
  unknown capacity rejection, FTS aliases, all-page cursor uniqueness, facets,
  bounds, suggestions, strict-route exact-empty behavior, and contextual
  verified-price warm p95 under 500ms. `npm run db:verify`, `npm run typecheck`,
  `npm run lint`, targeted Phase 5 Prettier, `git diff --check`, and
  `npm run build` passed. The full-repository format command still reports only
  eight pre-existing Phase 3 files; the new Phase 5 files are formatted.
- Resume Here: Phase 5 is verified for development. Begin Phase 6 only when
  its UI/state-management scope is active; use `/api/search` and the new typed
  contract rather than the legacy discovery parser, preserve public URL
  compatibility, and do not expose precise coordinates in URLs. Phase 9 must
  replace the `route: null` adapter with batch route summaries and revalidate
  strict route limits. Keep GAP-040 open and remeasure query latency with beta
  inventory before release.

---

## Phase 6 — Responsive Search Workspace

### Goal

Implement the approved design without the production map complexity yet.

### Core behaviors

- Server-render initial results for performance and SEO.
- Hydrate only the interactive search workspace.
- Preserve public filters in the URL.
- Keep exact current-location coordinates out of URLs.
- Debounce lightweight filters and cancel stale requests.
- Apply the advanced filter sheet as one transaction.
- Preserve scroll and selection across back navigation.
- Provide:
  - Loading skeletons.
  - Empty exact results.
  - Separately labeled near matches.
  - Partial-data warnings.
  - API failure recovery.
  - Clear all and individual chip removal.
- Mobile must show results immediately; the filter form is never permanently
  expanded above them.
- Result cards show:
  - Photo and name.
  - Area.
  - Review confidence.
  - Verified total or clearly labeled starting price.
  - Party/date context.
  - Primary matched features.
  - Route summary when available.
  - Trust/freshness status.
  - One clear primary action.

### Accessibility

- Complete keyboard operation.
- Focus restoration when sheets close.
- Result-count announcements.
- Accessible autocomplete behavior.
- Visible focus states.
- Minimum 44px application touch targets.
- No drag-only operation.
- Reduced-motion support.
- Semantic fallback for all geographic information.

### Gate

The five primary journeys work at all required breakpoints without a map,
horizontal overflow, state loss, or filter ambiguity.

### Prompt boundary

Search workspace UI and state management only.

### Phase 6 Handoff

- Status: `[x]` Verified for development — `/search` server-renders its first
  typed Phase 5 result page, then hydrates only the responsive workspace. The
  2026-07-25 visual-fidelity follow-up realigned the result composition to the
  approved Daylight Explorer: editorial display type, warm card surfaces,
  horizontal desktop comparison cards, and a map-first desktop split.
- Completed checklist items: Legacy public URLs are converted to the typed
  `/api/search` contract; public filters remain shareable while coordinates,
  map bounds, permission state, and session origin are scrubbed. The workspace
  has debounced/cancelled text and suggestion requests, atomic mobile/desktop
  filter-sheet application, back-navigation scroll/selection restoration,
  loading skeletons, exact-empty plus separately labeled near matches,
  partial-data/API recovery, chips, and clear-all. Cards expose photos, area,
  review confidence, contextual verified totals or explicit starting-price
  basis/trust, route-unknown state, and a single detail action.
- Product decisions needed: PD-044 — reconcile the cyan primary in the
  development design guide with the canonical Pasadya Daylight cobalt in
  `docs/06-ui-ux-design.md`; this implementation follows the canonical
  Daylight cobalt mapping as required when product and development docs differ.
- Limitations and gaps: GAP-040 and GAP-047 remain open. Exact route summaries
  remain intentionally unavailable until Phase 9. The current development
  database has no fresh verified totals, so the verified-total card variant is
  covered by contract tests rather than a production-data visual check.
- Completion evidence: `npm run search2:phase06:verify`, `npm run typecheck`,
  `npm run lint`, `npm run db:verify`, `npm run search2:phase05:verify`,
  `git diff --check`, and `npm run build` passed on 2026-07-25. In-app-browser
  QA at 375px verified first-result list access, mobile List/Map controls,
  disabled contextual budget controls until dates/guests exist, accessible
  filter sheet, and list-only recovery. The visual-fidelity follow-up passed
  targeted Prettier, TypeScript, lint, the Phase 6/7 verifiers, `git diff
  --check`, and a browser 914px visual review.
- Resume Here: Phase 6 is complete for development. Phase 7 owns the MapLibre
  implementation and list/map synchronization; do not reintroduce the legacy
  discovery parser or persist precise current location in the URL.

---

## Phase 7 — Production Map Experience

### Goal

Turn geography into a genuine search and comparison tool.

### Map behaviors

- Load MapLibre lazily with MapTiler tiles.
- Keep OSM attribution permanently visible.
- Render GeoJSON sources and layers instead of one DOM marker per result.
- Show:
  - Clusters at low zoom.
  - Verified total-price pins where comparable.
  - Neutral place pins where total pricing is unavailable.
  - Selected, hovered, and focused states.
  - Route availability indicators without overloading the pin.
- Synchronize:
  - Card hover/focus with pin highlight.
  - Pin selection with list scroll and mobile preview.
  - Filter changes with visible map results.
- Map movement does not immediately replace results. Show “Search this area”
  after meaningful pan/zoom movement.
- Refit bounds only after a new destination search or explicit user request,
  not after every filter.
- Provide locate-me, zoom, reset orientation, full-map/collapse, and
  keyboard-accessible alternatives.
- Mobile map includes a result preview and a stable return-to-list control.
- Handle:
  - No mappable results.
  - Tile-provider failure.
  - Geolocation denied.
  - Slow network.
  - WebGL unavailable.
  - Very dense clusters.
  - Results crossing the anti-meridian if future expansion requires it.

### Gate

- Map and list never disagree about matching result count.
- Selected state remains synchronized.
- Bounds queries are deterministic.
- List-only fallback remains fully functional.
- Map code does not break initial page performance budgets.

### Prompt boundary

Map and map/list synchronization only.

### Phase 7 Handoff

- Status: `[x]` Verified for development — MapLibre is a lazy client chunk
  with GeoJSON clustering/layers and a complete list-only fallback.
- Completed checklist items: Added clustered GeoJSON place and price layers;
  neutral unpriced pins; selected/hovered states; explicit map/list count and
  unmappable-record disclosure; pin-to-card scrolling; card hover/focus-to-pin
  highlighting; full-map, zoom, reset-orientation, locate, and explicit
  Search-this-area controls; no automatic map-movement query; mobile result
  preview and stable return-to-list; desktop map collapse; linked permanent
  MapTiler/OSM attribution; WebGL/tile/no-location/no-mappable fallback; and
  anti-meridian-safe bounds rejection. Current location stays only in mounted
  client state and request bodies, never URL/history/storage.
- Product decisions needed: PD-043 decided on 2026-07-25 — before beta, restrict the existing
  MapTiler API key to Pasadya's production and preview origins where the
  provider account supports a protected key, make it rotatable, and configure
  it once as `NEXT_PUBLIC_MAPTILER_API_KEY`. This is the same MapTiler
  credential used for browser tiles; an optional
  `MAPTILER_API_KEY` may override it for server geocoding but is not required.
  Confirm whether the selected MapTiler plan also requires a persistent
  provider logo.
- Limitations and gaps: GAP-048 is open for live API-key origin restriction,
  provider-attribution/logo verification, and 4G/WebGL QA. GAP-049 is open
  for privacy/legal review of the transient location processing disclosure:
  location may affect MapTiler tile requests and a transient search POST but
  is not retained by the workspace. Route availability indicators are wired
  but no route can be positive until Phase 9 returns batch route summaries.
- Completion evidence: `npm run search2:phase07:verify`, `npm run
  search2:phase06:verify`, `npm run typecheck`, `npm run lint`, `npm run
  db:verify`, `npm run search2:phase05:verify`, `git diff --check`, and
  `npm run build` passed on 2026-07-25. The visual-fidelity follow-up passed
  targeted Prettier, TypeScript, lint, the Phase 6/7 verifiers, `git diff
  --check`, and a browser 914px visual review. Browser QA at 375px confirmed list
  first render, Map switch, explicit list-only tile fallback, visible matching
  vs mappable-count explanation, keyboard-named controls, permanent
  attribution links, and filter-sheet context safeguards; desktop `lg` QA
  confirmed the split workspace and independent map collapse.
- Resume Here: Phases 6 and 7 are verified for development. Before beta,
  configure `NEXT_PUBLIC_MAPTILER_API_KEY` with the existing restricted
  MapTiler key, verify live map tiles,
  MapTiler branding requirements, denied geolocation, and WebGL/slow-network
  behavior on real devices. Phase 8 may now build adaptive filters; Phase 9
  must supply canonical batch route summaries without changing the privacy
  boundary.

---

## Phase 8 — Category-Adaptive Filter System

### Phase 8 Handoff

- Status: `[x]` Verified for development — category-adaptive filter registry,
  shareable category-specific URL state, facet counts, orphan confirmation,
  and price-basis labeling are live in the Search workspace.
- Completed checklist items: Universal and category-group filter profiles for
  lodging/dining/experience/mixed/all; adaptive `SearchFilterSheet`; URL
  mapping for rate types, cancellation, attributes, visit time, and available
  inventory; applied chips for the new filters; unknown-data copy beside hard
  filters; session-only route draft plumbing (evaluation owned by Phase 9).
- Product decisions needed: PD-047 — dining reservation availability and
  dietary suitability need a structured data/quote model before those controls
  can be shown without inventing evidence. PD-044 remains open for the cyan vs
  Daylight cobalt token reconciliation.
- Limitations and gaps: Multi-category URL state remains single-`category` for
  public shareability; mixed-category registry behavior is covered by contract
  tests. Reservation/dietary filters are intentionally deferred (PD-047).
  Manual 375px/`lg` visual QA is deferred to the same explicit pattern as
  earlier Search 2.0 UI phases.
- Completion evidence: `npm run search2:phase08:verify`, prior Phase 5–7
  verifiers, `npm run typecheck`, `npm run lint`, and `npm run build` passed on
  2026-07-26.
- Resume Here: Phase 8 is verified for development. Phase 9 owns batch route
  summaries and hard route ceilings. Do not expand dining reservation/dietary
  filters until PD-047 is decided.

### Goal

Provide powerful filtering without presenting every possible control at once.

### Universal quick filters

- Dates or visit time.
- Pax/rooms.
- Verified price.
- Route.
- Amenities.
- More filters.

### Rooms and resorts

- Overnight or day-use.
- Dates.
- Guests and rooms.
- Exact total budget.
- Available inventory.
- Room/property type.
- Private/shared configuration where applicable.
- Capacity.
- Cancellation terms.
- Instant/inquiry booking.
- Relevant amenities and accessibility.

### Restaurants

- Visit date/time.
- Party size.
- Cuisine.
- Dietary suitability.
- Verified per-person budget.
- Open at selected time.
- Reservation availability.
- Dining and accessibility amenities.

### Activities and services

- Date/time.
- Pax.
- Duration.
- Exact total/group budget.
- Package or per-person pricing.
- Included equipment/services.
- Booking mode.
- Category-specific amenities.

### Interaction rules

- Only show filters meaningful for the selected category.
- When multiple incompatible categories are selected, show universal filters
  and explain why category-specific controls are hidden.
- Display result counts beside useful categorical options.
- Disable impossible combinations with a reason.
- Preserve hidden category-specific values only when the user temporarily
  changes category; clear them with confirmation when they become invalid.
- Label price basis explicitly.
- Show all applied filters above results on mobile and desktop.

### Gate

Every visible filter has sufficient structured data, a documented unknown-data
rule, a query test, a URL/state test, and an accessible control.

### Prompt boundary

Adaptive filter registry and category-specific UX only.

---

## Phase 9 — Origin-Aware Route Search

### Phase 9 Handoff

- Status: `[x]` Verified for development — `route_edges` /
  `listing_stop_access`, shared graph planner, search batch summaries, and
  hard route filters are live.
- Completed checklist items: Migration `0012` materializes directed route edges
  and listing stop access; seed and search-refresh rebuild the graph;
  `batchRouteSummaries` evaluates one origin against many destinations;
  `planJourney` uses the same graph engine with modeled/confidence disclaimer
  notes; search attaches route summaries, boosts reachable places for
  origin-only queries, and hard-fails missing route evidence for any selected
  route limit; cards show modeled travel estimates; route ceilings stay out of
  public URLs.
- Product decisions needed: PD-045 — fare-ceiling semantics when fare ranges
  differ (default: reject when `fareMax` exceeds the ceiling). PD-046 —
  constrained-route selection and required/avoided mode vocabulary (current
  development default: selected modes are hard allow-lists; fastest feasible
  path wins).
- Limitations and gaps: GAP-040/047 remain open. GAP-050 records that
  route-aware p95 is proven on seeded inventory under 800ms, not beta volume.
  GAP-051 records that listing/route mutation rebuilds currently ride the
  search-refresh job rather than synchronous per-edit hooks. Place-page
  directions inherit planner parity through `planJourney`.
- Completion evidence: `npm run search2:phase09:verify`,
  `npm run search2:phase08:verify`, Phase 5–7 verifiers, `npm run typecheck`,
  `npm run lint`, and `npm run build` passed on 2026-07-26.
- Resume Here: Phases 8 and 9 are verified for development. Phase 10 hardening
  is complete for development — see Phase 10 Handoff. Before beta, decide
  PD-045/046/047/048/049, configure restricted MapTiler origins (GAP-048),
  finish GAP-049 legal review, and remeasure route-aware latency on beta
  inventory (GAP-050).

### Goal

Make “Can I afford and manage the trip there?” a Pasadya differentiator.

### Route data foundation

- Add explicit route edges between ordered stops.
- Store:
  - Route and mode.
  - From/to stops.
  - Distance.
  - Duration.
  - Fare.
  - Service hours.
  - Source.
  - Confidence.
  - Last verification.
- Precompute each listing’s nearest usable stops and walking distances.
- Rebuild affected access links when a listing or route changes.

### Search behavior

- Accept origins from:
  - Named areas.
  - Landmarks.
  - Route stops.
  - Current location with permission.
  - Manually selected map point.
- Run one graph search from the origin to all candidate destinations rather
  than calling the planner once per listing.
- Return:
  - Total estimated duration.
  - Fare range.
  - Walking distance.
  - Transfer count.
  - Transport modes.
  - First/last-mile instructions.
  - Confidence.
  - Last verification.
- Provide filters for:
  - Maximum travel time.
  - Maximum fare.
  - Maximum walking.
  - Maximum transfers.
  - Required/avoided modes.
  - Route estimate required.
- Origin alone boosts reachable places but does not remove unknowns.
- Any selected route limit becomes a hard constraint.
- Update the existing transport planner and place pages to use the same graph
  engine.
- Estimated timings must be labeled as modeled when explicit schedules or
  segment timings are unavailable.

### Gate

- Search and transport planner return the same route summary.
- Route filters never treat missing data as passing.
- Batch route evaluation meets its latency budget.
- Stale or low-confidence routes are visible and never presented as live
  certainty.

### Prompt boundary

Transport graph, batch evaluation, and route-aware filters only.

---

## Phase 10 — Production Hardening and Staged Release

### Goal

Validate the complete system under production conditions and release it
safely.

### Engineering hardening

- Rate limiting and strict request validation.
- Map/geocoding key restrictions.
- Privacy review for current location.
- Query-cost limits and maximum bounds/radius controls.
- SQL execution-plan review.
- Load tests for text, bounds, availability, and route-aware searches.
- Provider failure and timeout handling.
- Cache policy and invalidation tests.
- Logging without precise-location retention.
- Accessibility audit against WCAG 2.2 AA, including non-drag alternatives.
- Cross-browser and low-end Android testing.
- 4G and constrained-data testing.
- Regression coverage for booking, portal, admin, transport, SEO, and existing
  URLs.

Accessibility reference:

- [W3C WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)

### Observability

Monitor:

- Search API latency and errors.
- Route-aware latency.
- Zero-result rate.
- Near-match exposure.
- Filter use/removal.
- Map/list switching.
- “Search this area” use.
- Search-to-detail and search-to-booking conversion.
- Quote mismatches.
- Unknown price/route exposure.
- Tile/geocoder failures.
- Search index freshness.
- Route-data freshness.

### Rollout

1. Internal feature flag.
2. Shadow-query comparison against current search.
3. Team acceptance using the five primary journeys.
4. Limited beta on Samal and Davao inventory.
5. Data-quality remediation.
6. Gradual traffic increase.
7. Replace `/search` while preserving legacy parameter parsing.
8. Retain instant rollback to the current implementation until stability
   targets are maintained.

### Production acceptance targets

- Search, listing, and checkout quote parity: 100%.
- Unknown records passing hard constraints: zero.
- Common warm search p95: under 500ms at launch volume.
- Route-aware p95: under 800ms at launch volume.
- Interaction response: under 100ms for local UI state.
- LCP: under 2.5 seconds.
- INP: under 200ms.
- CLS: under 0.1.
- First result begins within the initial mobile results viewport.
- Map/list result consistency: 100%.
- No horizontal overflow at 320px or wider.
- No search-critical function requires map, dragging, hover, or color
  perception.

### Prompt boundary

Hardening, production verification, feature-flag rollout, and rollback only.

### Phase 10 Handoff

- Status: `[x]` Verified for development — hardening, privacy-safe
  observability, feature-flag rollout/rollback, shadow comparison, and seed
  load evidence are live. Not beta/launch-ready until staged release soak,
  signed five-journey acceptance, MapTiler origin restriction, legal location
  disclosure review, and beta-volume/CWV evidence land.
- Rollout companion: [Search 2.0 Phase 10 Rollout](search-2.0-phase-10-rollout.md)
- Completed checklist items: `SEARCH_V2_MODE` / `SEARCH_V2_ROLLOUT_PERCENT`
  with opaque bucket cookie middleware and legacy `/search` rollback surface;
  shadow compare against legacy discovery for overlapping shapes; candidate
  cap (250), body-size/timeout hardening, short-TTL anonymous cache +
  search-refresh invalidation; privacy-safe aggregate metrics + client UI
  events; visible current-location disclosure; SQL EXPLAIN + warm load samples
  for text/bounds/availability/route; Phase 5–9 regression verifiers green;
  `search2:phase10:verify` script.
- Product decisions needed: PD-048 rollout promotion gates; PD-049 durable
  metrics export before public traffic. Carry-forward PD-036/043–047 and
  GAP-036/047–051 remain beta blockers.
- Limitations and gaps: Instrumentation starts a forward baseline only —
  GAP-040 is not closed with fabricated Search 1 history. Near-match /
  booking-click / quote-mismatch / geocoder-failure metrics remain thin.
  Cross-browser, low-end Android, 4G, and CWV are not measured here.
  Staging must still execute shadow → limited % → 100% with signed journeys.
- Completion evidence: `npm run search2:phase10:verify`, Phase 5–9 verifiers,
  `npm run typecheck`, `npm run lint`, and `npm run build` passed on
  2026-07-26. Specialist security/UX/product reviews drove visible location
  disclosure, metrics GET job-auth alignment, and SSR timeout.
- Resume Here: Phase 10 is verified for development. Begin Phase 11 only when
  activated. Before beta: set staging to `SEARCH_V2_MODE=shadow`, complete the
  five-journey acceptance table, decide PD-048/049, configure MapTiler origins
  (GAP-048), finish GAP-049 legal review, and remeasure latency/CWV on beta
  inventory.

---

## Phase 11 — Post-Launch Search Quality Program

### Goal

Improve ranking and filter design using real Pasadya behavior rather than
assumptions.

### Work

- Review zero-result and frequently removed filters.
- Identify misleading synonyms and missing local terminology.
- Measure where users switch between list and map.
- Compare price-filter use against booking conversion.
- Monitor route filters for excessive exclusion caused by incomplete data.
- Improve data-completeness prompts for owners.
- Tune ranking weights through offline replay before production changes.
- Add recommended quick filters only after sufficient behavior exists.
- Consider Typesense only if PostgreSQL misses measured relevance or latency
  requirements.
- Treat any future Google Places or external website connector as a separate
  reviewed epic with its own legal, retention, attribution, deduplication,
  moderation, and cost plan.

### Gate

Ranking or filter changes require offline comparison, regression tests, and a
reversible experiment.

## Guardrails

- Future Google Places usage must follow current restrictions on caching,
  attribution, and map display. Place IDs may be retained; this plan does not
  assume unrestricted copying of Places content.
  [Google Places policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- MapTiler is the production tile provider; public OpenStreetMap tile servers
  are not a production backend.
  [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/)
- No future importer may directly publish listings. Imported candidates must
  pass deduplication, provenance, quality review, and moderation.
- Existing unrelated homepage and Pasadya Daylight work must remain untouched
  throughout implementation.
