# Pasadya — Local Discovery Platform

> **Find, book, and get there** — a modern all-in-one platform for discovering and managing local places in Davao Del Sur and Mindanao.

Public brand: **Pasadya** (`pasadya.ph`). Internal repo/codename: `project-z`.

## Elevator Pitch

Planning a weekend in Samal? Trying to find a resort without wading through ad-heavy directories? Wondering which jeepney to take from Toril to your destination? **Pasadya** solves these gaps with an Airbnb-quality experience built for Mindanao — starting with Davao Del Sur.

Unlike fragmented Facebook pages, outdated blogs, and ad-ridden directories like [samalguide.com](https://samalguide.com), Pasadya offers:

- **Clean discovery** — search, filter, and map resorts, restaurants, rooms, and activities
- **Business ownership** — owners can claim, verify, and manage their listings
- **Easy booking** — availability calendars, instant or inquiry-based booking, GCash/Maya/card payments
- **Crowd awareness** — community check-ins and occupancy signals so you know when places are busy
- **How to get there** — jeepney, bus, ferry, and multi-modal commute directions for Davao and beyond

## Tech Stack (Planned)

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15+ (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js Route Handlers / tRPC |
| Database | PostgreSQL + PostGIS |
| ORM | Drizzle |
| Search | Postgres FTS + pg_trgm (MVP); Typesense when scale requires |
| Maps | MapLibre GL + OpenStreetMap |
| Payments | PayMongo (GCash, Maya, cards) |
| Auth | Auth.js (email/OTP, Google, Facebook) |
| Storage | S3-compatible (Cloudflare R2 / AWS S3) |
| Cache | Redis (Upstash) |

## Documentation Index

Read these in order for the full picture:

| # | Document | Description |
|---|----------|-------------|
| 01 | [Vision & Research](docs/01-vision-and-research.md) | Problem statement, market research, personas, competitive positioning, monetization |
| 02 | [Product Specification](docs/02-product-spec.md) | Feature spec by module, user roles, MVP scope |
| 03 | [System Architecture](docs/03-system-architecture.md) | Stack decisions, infrastructure, service diagram |
| 04 | [Data Model](docs/04-data-model.md) | Entity-relationship design, PostGIS schema, transport data |
| 05 | [System Flows](docs/05-system-flows.md) | Booking, claiming, payments, crowd, route flows |
| 06 | [UI/UX Design](docs/06-ui-ux-design.md) | Design principles, page inventory, design system |
| 07 | [Transport Module](docs/07-transport-module.md) | Jeepney/bus/ferry routes, community sourcing, routing engine |
| 08 | [Roadmap & Operations](docs/08-roadmap-and-operations.md) | Phased delivery, data seeding, compliance, metrics |
| 09 | [Search 2.0 Production Program](docs/09-search-2.0-production-program.md) | Research, design, data, search, map, filters, transport, and staged production rollout |

## Development Execution Docs

After reading the product docs above, use the development docs to implement the platform across multiple AI prompts:

| Document | Description |
|----------|-------------|
| [Development Index](docs/development/README.md) | Phase order, working rules, and MVP completion definition |
| [AI Handoff Protocol](docs/development/00-ai-handoff-protocol.md) | Cross-prompt continuity rules and resume format |
| [Agent Playbook](docs/development/09-agent-playbook.md) | Specialist AI agent roles for build, test, UX, security, product, and release review |
| [Verification, Decisions & Gaps Register](docs/development/10-verification-decisions-and-gaps.md) | Phase evidence, unresolved product decisions, and known limitations |
| [Design System Implementation Guide](docs/development/11-design-system.md) | UI tokens, components, layout rules, accessibility, and visual QA |

## MVP Scope

The MVP launches all three pillars in a focused geographic area (**Samal Island + Davao City**):

1. **Directory** — searchable/filterable listings with map view
2. **Booking** — inquiry + instant book with PayMongo payments
3. **Transport** — "how to get there" per listing + point-A-to-B commute planner

## Geographic Focus

| Phase | Coverage |
|-------|----------|
| MVP | Samal Island, Davao City, key Davao Del Sur destinations |
| Phase 2 | Davao Region (Davao del Norte, Davao Oriental, Davao de Oro) |
| Phase 3 | Greater Mindanao (Bukidnon, Surigao, Zamboanga, etc.) |

## Status

**Phase 08 admin operations and launch readiness in progress** — Public brand is **Pasadya** (`pasadya.ph`). Phases 01–07 and Phase 08 ops gaps are verified locally. Remaining before beta/public launch: live provider credentials, legal approval, real/licensed content, and Core Web Vitals.

## Local Development

Use npm for this project.

```bash
npm install
cp .env.example .env
npm run db:start
npm run db:migrate
npm run db:seed
npm run dev
```

The local Docker database defaults to `postgresql://project_z:project_z@localhost:5432/project_z`.

Open [http://localhost:3000](http://localhost:3000).
