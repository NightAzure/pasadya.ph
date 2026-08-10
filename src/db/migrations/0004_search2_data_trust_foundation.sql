-- Search 2.0 Phase 2 is additive. Existing address and location columns remain
-- authoritative for legacy reads until later services explicitly opt into the
-- structured fields.
set search_path to public, extensions;

do $$ begin
  create type area_type as enum ('country', 'region', 'province', 'city_municipality', 'island', 'barangay', 'landmark');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type listing_trust_status as enum ('verified', 'owner_provided', 'team_verified', 'estimated', 'stale', 'unknown');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type location_source as enum ('owner', 'team', 'geocoded', 'imported', 'seeded', 'unknown');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type location_accuracy as enum ('exact', 'approximate', 'area_only', 'unknown');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type source_rights_classification as enum ('owner_provided', 'team_collected', 'licensed', 'public_reference', 'unknown');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type source_retention_classification as enum ('retain', 'review', 'remove_on_request', 'unknown');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type alias_type as enum ('alternate', 'local', 'former', 'search_keyword');
exception when duplicate_object then null;
end $$;

create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references areas(id) on delete restrict,
  type area_type not null,
  name text not null,
  slug text not null,
  center geography(Point, 4326),
  boundary geography(MultiPolygon, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint areas_not_own_parent check (parent_id is null or parent_id <> id)
);
create unique index if not exists areas_slug_unique on areas (slug);
create index if not exists areas_parent_id_idx on areas (parent_id);
create index if not exists areas_type_name_idx on areas (type, name);
create index if not exists areas_center_gist_idx on areas using gist (center);
create index if not exists areas_boundary_gist_idx on areas using gist (boundary);

create table if not exists area_aliases (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references areas(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  type alias_type not null default 'alternate',
  created_at timestamptz not null default now()
);
create unique index if not exists area_aliases_area_normalized_unique on area_aliases (area_id, normalized_alias);
create index if not exists area_aliases_normalized_idx on area_aliases (normalized_alias);
create index if not exists area_aliases_alias_trgm_idx on area_aliases using gin (alias gin_trgm_ops);

alter table listings
  add column if not exists canonical_area_id uuid references areas(id) on delete set null,
  add column if not exists location_source location_source not null default 'unknown',
  add column if not exists location_accuracy location_accuracy not null default 'unknown',
  add column if not exists location_verification_status listing_trust_status not null default 'unknown',
  add column if not exists location_last_verified_at timestamptz,
  add column if not exists location_verified_by uuid references users(id) on delete set null;
create index if not exists listings_canonical_area_id_idx on listings (canonical_area_id);
create index if not exists listings_location_verification_idx on listings (location_verification_status, location_last_verified_at);

create table if not exists listing_aliases (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  type alias_type not null default 'alternate',
  created_at timestamptz not null default now()
);
create unique index if not exists listing_aliases_listing_normalized_unique on listing_aliases (listing_id, normalized_alias);
create index if not exists listing_aliases_normalized_idx on listing_aliases (normalized_alias);
create index if not exists listing_aliases_alias_trgm_idx on listing_aliases using gin (alias gin_trgm_ops);

create table if not exists listing_opening_hours (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listing_opening_hours_times_required check (is_closed or (opens_at is not null and closes_at is not null))
);
create unique index if not exists listing_opening_hours_listing_day_unique on listing_opening_hours (listing_id, day_of_week);
create index if not exists listing_opening_hours_listing_day_idx on listing_opening_hours (listing_id, day_of_week);

create table if not exists listing_special_hours (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  date date not null,
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listing_special_hours_times_required check (is_closed or (opens_at is not null and closes_at is not null))
);
create unique index if not exists listing_special_hours_listing_date_unique on listing_special_hours (listing_id, date);
create index if not exists listing_special_hours_listing_date_idx on listing_special_hours (listing_id, date);

create table if not exists listing_sources (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  provider text not null,
  external_identifier text,
  source_url text,
  rights_classification source_rights_classification not null default 'unknown',
  retention_classification source_retention_classification not null default 'unknown',
  last_checked_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists listing_sources_identity_unique
  on listing_sources (listing_id, provider, external_identifier)
  where external_identifier is not null;
create index if not exists listing_sources_listing_id_idx on listing_sources (listing_id);
create index if not exists listing_sources_provider_external_id_idx on listing_sources (provider, external_identifier);
create index if not exists listing_sources_verification_idx on listing_sources (last_verified_at, last_checked_at);

create table if not exists listing_field_provenance (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  field_name text not null,
  source_id uuid references listing_sources(id) on delete set null,
  trust_status listing_trust_status not null default 'unknown',
  is_canonical boolean not null default false,
  verified_by uuid references users(id) on delete set null,
  checked_at timestamptz,
  valid_until timestamptz,
  source_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists listing_field_provenance_canonical_unique
  on listing_field_provenance (listing_id, field_name)
  where is_canonical = true;
create index if not exists listing_field_provenance_listing_field_idx on listing_field_provenance (listing_id, field_name);
create index if not exists listing_field_provenance_verification_idx on listing_field_provenance (trust_status, valid_until);
create index if not exists listing_field_provenance_source_id_idx on listing_field_provenance (source_id);
