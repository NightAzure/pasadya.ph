-- Search 2.0 Phase 2: weekly and special hours are interpreted in local PH time
-- until future geographic coverage requires a listing-specific override.
alter table listings
  add column if not exists hours_timezone text not null default 'Asia/Manila';

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'listings_hours_timezone_nonblank'
  ) then
    alter table listings add constraint listings_hours_timezone_nonblank
      check (char_length(trim(hours_timezone)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'listing_sources_source_url_http_check'
  ) then
    alter table listing_sources add constraint listing_sources_source_url_http_check
      check (source_url is null or source_url ~* '^https?://');
  end if;
end $$;
