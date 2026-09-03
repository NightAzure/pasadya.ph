-- Search 2.0 Phase 9: materialized transport graph and listing stop access.
set search_path to public, extensions;

create table if not exists route_edges (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references transport_routes(id) on delete cascade,
  from_stop_id uuid not null references route_stops(id) on delete cascade,
  to_stop_id uuid not null references route_stops(id) on delete cascade,
  distance_m integer not null,
  duration_min integer not null,
  fare integer not null default 0,
  service_hours jsonb not null default '{}'::jsonb,
  source transport_source not null default 'seeded',
  confidence text not null default 'medium' check (confidence in ('high', 'medium', 'low')),
  last_verified_at timestamptz,
  modeled boolean not null default true,
  unique(route_id, from_stop_id, to_stop_id)
);

create index if not exists route_edges_from_stop_id_idx on route_edges(from_stop_id);
create index if not exists route_edges_to_stop_id_idx on route_edges(to_stop_id);
create index if not exists route_edges_route_id_idx on route_edges(route_id);

create table if not exists listing_stop_access (
  listing_id uuid not null references listings(id) on delete cascade,
  stop_id uuid not null references route_stops(id) on delete cascade,
  walking_distance_m integer not null,
  walking_duration_min integer not null,
  is_primary boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (listing_id, stop_id)
);

create index if not exists listing_stop_access_stop_id_idx on listing_stop_access(stop_id);
create index if not exists listing_stop_access_primary_listing_id_idx
  on listing_stop_access(listing_id) where is_primary;

with ordered_stops as (
  select
    tr.id as route_id,
    tr.mode,
    tr.fare_min,
    tr.fare_max,
    tr.operating_hours,
    tr.source,
    tr.last_verified_at,
    rs.id as from_stop_id,
    rs.location as from_location,
    lead(rs.id) over (partition by tr.id order by rs.stop_order) as to_stop_id,
    lead(rs.location) over (partition by tr.id order by rs.stop_order) as to_location
  from transport_routes tr
  join route_stops rs on rs.route_id = tr.id
  where tr.status = 'published'
),
directed_edges as (
  select * from ordered_stops where to_stop_id is not null
  union all
  select
    route_id, mode, fare_min, fare_max, operating_hours, source, last_verified_at,
    to_stop_id as from_stop_id, to_location as from_location,
    from_stop_id as to_stop_id, from_location as to_location
  from ordered_stops
  where to_stop_id is not null and mode <> 'ferry'
)
insert into route_edges (
  route_id, from_stop_id, to_stop_id, distance_m, duration_min, fare,
  service_hours, source, confidence, last_verified_at, modeled
)
select
  route_id,
  from_stop_id,
  to_stop_id,
  round(ST_Distance(from_location, to_location))::integer,
  greatest(5, round(ST_Distance(from_location, to_location) / 250.0))::integer,
  coalesce(fare_min, fare_max, 0),
  operating_hours,
  source,
  case when source = 'official' then 'high' when source = 'community' then 'medium' else 'low' end,
  last_verified_at,
  true
from directed_edges
on conflict (route_id, from_stop_id, to_stop_id) do update set
  distance_m = excluded.distance_m,
  duration_min = excluded.duration_min,
  fare = excluded.fare,
  service_hours = excluded.service_hours,
  source = excluded.source,
  confidence = excluded.confidence,
  last_verified_at = excluded.last_verified_at,
  modeled = excluded.modeled;

with nearest_stops as (
  select
    l.id as listing_id,
    rs.id as stop_id,
    round(ST_Distance(l.location, rs.location))::integer as walking_distance_m,
    row_number() over (
      partition by l.id
      order by l.location <-> rs.location
    ) as stop_rank
  from listings l
  cross join lateral (
    select rs.id, rs.location
    from route_stops rs
    join transport_routes tr on tr.id = rs.route_id and tr.status = 'published'
    where ST_DWithin(l.location, rs.location, 5000)
    order by l.location <-> rs.location
    limit 3
  ) rs
  where l.status = 'published' and l.location is not null
)
insert into listing_stop_access (
  listing_id, stop_id, walking_distance_m, walking_duration_min, is_primary, updated_at
)
select
  listing_id,
  stop_id,
  walking_distance_m,
  greatest(1, round(walking_distance_m / 80.0))::integer,
  stop_rank = 1,
  now()
from nearest_stops
on conflict (listing_id, stop_id) do update set
  walking_distance_m = excluded.walking_distance_m,
  walking_duration_min = excluded.walking_duration_min,
  is_primary = excluded.is_primary,
  updated_at = excluded.updated_at;
