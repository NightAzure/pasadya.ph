-- Supabase installs PostGIS into `extensions` (not `public`). Keep both schemas
-- on the search_path so unqualified `geography` / ST_* resolve locally and remote.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
set search_path to public, extensions;

create type user_role as enum ('user', 'moderator', 'admin');
create type auth_provider as enum ('email', 'google', 'facebook');
create type listing_category as enum ('resort', 'room', 'restaurant', 'activity', 'service');
create type listing_status as enum ('draft', 'published', 'closed', 'archived');
create type claim_status as enum ('unclaimed', 'pending', 'claimed', 'disputed');
create type booking_mode as enum ('inquiry', 'instant', 'none');
create type cancellation_policy as enum ('flexible', 'moderate', 'strict');
create type media_type as enum ('photo', 'video');
create type amenity_category as enum ('general', 'room', 'activity', 'dining');
create type rate_plan_type as enum ('overnight', 'day_use', 'entrance', 'package', 'hourly');
create type price_unit as enum ('per_night', 'per_person', 'per_group', 'flat');
create type booking_status as enum ('draft', 'requested', 'accepted', 'awaiting_payment', 'confirmed', 'completed', 'declined', 'expired', 'cancelled_by_guest', 'cancelled_by_owner', 'refunded', 'no_show');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');
create type payout_method as enum ('gcash', 'bank_transfer');
create type payout_status as enum ('pending', 'completed', 'failed');
create type claim_method as enum ('phone_otp', 'email', 'document', 'photo_verification');
create type claim_request_status as enum ('pending', 'approved', 'rejected', 'disputed', 'transferred');
create type moderation_type as enum ('claim', 'review', 'photo', 'route_contribution', 'listing_report', 'listing_edit');
create type moderation_status as enum ('pending', 'approved', 'rejected');
create type review_status as enum ('published', 'flagged', 'removed');
create type crowd_source as enum ('business', 'community', 'heuristic');
create type crowd_level as enum ('quiet', 'moderate', 'busy', 'full');
create type transport_mode as enum ('jeepney', 'bus', 'ferry', 'tricycle', 'multicab', 'habal_habal');
create type transport_status as enum ('draft', 'published', 'deprecated');
create type transport_source as enum ('official', 'community', 'seeded');
create type route_contribution_type as enum ('new_route', 'correction', 'new_stop', 'fare_update');
create type contribution_status as enum ('pending', 'approved', 'rejected');
create type notification_channel as enum ('in_app', 'email', 'sms');
create type job_status as enum ('pending', 'running', 'completed', 'failed');

create table users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  name text,
  avatar_url text,
  role user_role not null default 'user',
  auth_provider auth_provider not null default 'email',
  email_verified timestamptz,
  phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index users_email_unique on users (email);
create unique index users_phone_unique on users (phone);

create table accounts (
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  provider text not null,
  provider_account_id text not null,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  primary key (provider, provider_account_id)
);
create index accounts_user_id_idx on accounts (user_id);

create table sessions (
  session_token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires timestamptz not null
);
create index sessions_user_id_idx on sessions (user_id);

create table verification_tokens (
  identifier text not null,
  token text not null,
  expires timestamptz not null,
  primary key (identifier, token)
);

create table authenticators (
  credential_id text not null unique,
  user_id uuid not null references users(id) on delete cascade,
  provider_account_id text not null,
  credential_public_key text not null,
  counter integer not null,
  credential_device_type text not null,
  credential_backed_up boolean not null,
  transports text,
  primary key (user_id, credential_id)
);

create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete restrict,
  legal_name text,
  display_name text not null,
  contact_phone text,
  contact_email text,
  payout_gcash text,
  payout_bank jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index businesses_owner_id_idx on businesses (owner_id);

create table listings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete set null,
  slug text not null,
  name text not null,
  category listing_category not null,
  description text,
  status listing_status not null default 'draft',
  claim_status claim_status not null default 'unclaimed',
  location geography(Point, 4326),
  address jsonb not null default '{}'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  price_min integer,
  price_max integer,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  dot_accredited boolean not null default false,
  booking_mode booking_mode not null default 'inquiry',
  cancellation_policy cancellation_policy not null default 'flexible',
  downpayment_pct integer not null default 50,
  contact_phone text,
  contact_facebook text,
  contact_website text,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create unique index listings_slug_unique on listings (slug);
create index listings_business_id_idx on listings (business_id);
create index listings_category_status_idx on listings (category, status) where status = 'published';
create index listings_price_idx on listings (price_min, price_max);
create index listings_location_gist_idx on listings using gist (location);
create index listings_search_gin_idx on listings using gin (search_vector);
create index listings_name_trgm_idx on listings using gin (name gin_trgm_ops);

create table listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  url text not null,
  type media_type not null default 'photo',
  caption text,
  sort_order integer not null default 0,
  uploaded_by uuid references users(id) on delete set null,
  moderated boolean not null default false,
  created_at timestamptz not null default now()
);
create index listing_media_listing_id_idx on listing_media (listing_id);
create index listing_media_uploaded_by_idx on listing_media (uploaded_by);

create table amenities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text not null,
  category amenity_category not null default 'general'
);

create table listing_amenities (
  listing_id uuid not null references listings(id) on delete cascade,
  amenity_id uuid not null references amenities(id) on delete cascade,
  primary key (listing_id, amenity_id)
);
create index listing_amenities_amenity_id_idx on listing_amenities (amenity_id);

create table rate_plans (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  name text not null,
  type rate_plan_type not null,
  price integer not null,
  price_unit price_unit not null,
  max_pax integer,
  min_pax integer not null default 1,
  description text,
  active boolean not null default true,
  sort_order integer not null default 0
);
create index rate_plans_listing_id_idx on rate_plans (listing_id);

create table availability_blocks (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  rate_plan_id uuid references rate_plans(id) on delete cascade,
  date date not null,
  available boolean not null default false,
  quantity integer not null default 1,
  price_override integer,
  unique (listing_id, rate_plan_id, date)
);
create index availability_blocks_listing_id_idx on availability_blocks (listing_id);
create index availability_blocks_rate_plan_id_idx on availability_blocks (rate_plan_id);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete restrict,
  user_id uuid not null references users(id) on delete restrict,
  rate_plan_id uuid references rate_plans(id) on delete restrict,
  status booking_status not null default 'draft',
  check_in date not null,
  check_out date not null,
  pax integer not null,
  guest_name text not null,
  guest_phone text,
  guest_email text,
  special_requests text,
  subtotal integer not null,
  downpayment_amount integer not null,
  balance_due integer not null,
  currency text not null default 'PHP',
  expires_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_listing_id_idx on bookings (listing_id);
create index bookings_user_id_idx on bookings (user_id);
create index bookings_rate_plan_id_idx on bookings (rate_plan_id);
create index bookings_status_expires_at_idx on bookings (status, expires_at);

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id) on delete restrict,
  paymongo_session_id text not null unique,
  paymongo_payment_id text,
  amount integer not null,
  status payment_status not null default 'pending',
  payment_method text,
  paid_at timestamptz,
  refunded_at timestamptz,
  refund_amount integer,
  created_at timestamptz not null default now()
);
create index payments_booking_id_idx on payments (booking_id);

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null
);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  amount integer not null,
  booking_ids uuid[] not null default '{}',
  method payout_method not null,
  reference text,
  status payout_status not null default 'pending',
  processed_by uuid references users(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index payouts_business_id_idx on payouts (business_id);
create index payouts_processed_by_idx on payouts (processed_by);

create table claim_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  method claim_method not null,
  status claim_request_status not null default 'pending',
  verification_data jsonb not null default '{}'::jsonb,
  admin_notes text,
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index claim_requests_listing_id_idx on claim_requests (listing_id);
create index claim_requests_user_id_idx on claim_requests (user_id);
create index claim_requests_reviewed_by_idx on claim_requests (reviewed_by);

create table moderation_queue (
  id uuid primary key default gen_random_uuid(),
  type moderation_type not null,
  reference_id uuid not null,
  status moderation_status not null default 'pending',
  reason text,
  reviewer_id uuid references users(id) on delete set null,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index moderation_queue_status_created_at_idx on moderation_queue (status, created_at);
create index moderation_queue_reviewer_id_idx on moderation_queue (reviewer_id);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  booking_id uuid unique references bookings(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  sub_ratings jsonb not null default '{}'::jsonb,
  body text not null,
  verified_stay boolean not null default false,
  owner_response text,
  owner_responded_at timestamptz,
  status review_status not null default 'published',
  created_at timestamptz not null default now()
);
create index reviews_listing_id_idx on reviews (listing_id);
create index reviews_user_id_idx on reviews (user_id);
create index reviews_booking_id_idx on reviews (booking_id);

create table questions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null,
  answer text,
  answered_by uuid references users(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
create index questions_listing_id_idx on questions (listing_id);
create index questions_user_id_idx on questions (user_id);
create index questions_answered_by_idx on questions (answered_by);

create table crowd_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  source crowd_source not null,
  level crowd_level not null,
  reporter_location geography(Point, 4326),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index crowd_reports_listing_id_idx on crowd_reports (listing_id);
create index crowd_reports_user_id_idx on crowd_reports (user_id);
create index crowd_reports_reporter_location_gist_idx on crowd_reports using gist (reporter_location);

create table favorites (
  user_id uuid not null references users(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index favorites_listing_id_idx on favorites (listing_id);

create table transport_routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  mode transport_mode not null,
  description text,
  geometry geography(LineString, 4326),
  fare_min integer,
  fare_max integer,
  operating_hours jsonb not null default '{}'::jsonb,
  status transport_status not null default 'draft',
  source transport_source not null default 'seeded',
  contributor_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transport_routes_status_mode_idx on transport_routes (status, mode);
create index transport_routes_contributor_id_idx on transport_routes (contributor_id);
create index transport_routes_geometry_gist_idx on transport_routes using gist (geometry);

create table route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references transport_routes(id) on delete cascade,
  name text not null,
  location geography(Point, 4326) not null,
  stop_order integer not null,
  is_terminal boolean not null default false
);
create index route_stops_route_id_idx on route_stops (route_id);
create index route_stops_location_gist_idx on route_stops using gist (location);

create table route_segments (
  id uuid primary key default gen_random_uuid(),
  from_route_id uuid not null references transport_routes(id) on delete cascade,
  to_route_id uuid not null references transport_routes(id) on delete cascade,
  transfer_stop_id uuid references route_stops(id) on delete set null,
  transfer_notes text,
  walking_distance_m integer
);
create index route_segments_from_route_id_idx on route_segments (from_route_id);
create index route_segments_to_route_id_idx on route_segments (to_route_id);
create index route_segments_transfer_stop_id_idx on route_segments (transfer_stop_id);

create table ferry_schedules (
  id uuid primary key default gen_random_uuid(),
  route_name text not null,
  origin text not null,
  destination text not null,
  origin_location geography(Point, 4326) not null,
  dest_location geography(Point, 4326) not null,
  departure_times time[] not null default '{}',
  duration_minutes integer,
  fare integer,
  operator text,
  notes text,
  days_of_week integer[] not null default '{}'
);

create table route_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type route_contribution_type not null,
  data jsonb not null,
  status contribution_status not null default 'pending',
  reviewed_by uuid references users(id) on delete set null,
  resulting_route_id uuid references transport_routes(id) on delete set null,
  created_at timestamptz not null default now()
);
create index route_contributions_user_id_idx on route_contributions (user_id);
create index route_contributions_reviewed_by_idx on route_contributions (reviewed_by);
create index route_contributions_resulting_route_id_idx on route_contributions (resulting_route_id);

create table collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  cover_image text,
  listing_ids uuid[] not null default '{}',
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  channel notification_channel not null default 'in_app',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_id_read_idx on notifications (user_id, read);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status job_status not null default 'pending',
  scheduled_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  error text
);
create index jobs_status_scheduled_at_idx on jobs (status, scheduled_at);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_actor_id_idx on audit_log (actor_id);
