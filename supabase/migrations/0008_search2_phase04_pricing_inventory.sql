-- Search 2.0 Phase 4: authoritative pricing, inventory, and quote snapshots.
-- Existing bookings retain their stored financial values. Only unambiguous
-- legacy rate semantics are mapped; every other legacy rate is review-only.

alter table rate_plans
  add column if not exists quote_eligibility text not null default 'unknown';

alter table bookings
  add column if not exists reserved_units integer not null default 1,
  add column if not exists quote_version text not null default 'legacy-v0',
  add column if not exists quote_snapshot jsonb;

create table if not exists inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete restrict,
  listing_id uuid not null references listings(id) on delete restrict,
  rate_plan_id uuid not null references rate_plans(id) on delete restrict,
  service_date date not null,
  units integer not null,
  created_at timestamptz not null default now(),
  unique (booking_id, rate_plan_id, service_date),
  check (units > 0)
);

create index if not exists inventory_reservations_rate_date_idx
  on inventory_reservations (rate_plan_id, service_date);
create index if not exists inventory_reservations_listing_date_idx
  on inventory_reservations (listing_id, service_date);

-- PostgreSQL considers NULL values distinct in the historic composite unique
-- index. Separate partial indexes make global and rate-specific overrides
-- genuinely unique and safe to upsert.
create unique index if not exists availability_blocks_global_scope_date_unique
  on availability_blocks (listing_id, date)
  where rate_plan_id is null;
create unique index if not exists availability_blocks_rate_scope_date_unique
  on availability_blocks (listing_id, rate_plan_id, date)
  where rate_plan_id is not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_reserved_units_positive') then
    alter table bookings add constraint bookings_reserved_units_positive
      check (reserved_units > 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bookings_amounts_nonnegative') then
    alter table bookings add constraint bookings_amounts_nonnegative
      check (subtotal >= 0 and downpayment_amount >= 0 and balance_due >= 0 and subtotal = downpayment_amount + balance_due) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rate_plans_quote_eligibility_check') then
    alter table rate_plans add constraint rate_plans_quote_eligibility_check
      check (quote_eligibility in ('eligible', 'legacy_mapped', 'legacy_ambiguous', 'incomplete', 'unknown')) not valid;
  end if;
end $$;

-- These mappings have a documented, direct legacy meaning. They still require
-- explicit capacity and inventory data before the quote engine will sell them.
update rate_plans
set billing_period = 'night', billing_unit = 'inventory_unit', quote_eligibility = 'legacy_mapped'
where billing_period is null and billing_unit is null
  and type = 'overnight'::rate_plan_type and price_unit = 'per_night'::price_unit;

update rate_plans
set billing_period = 'day', billing_unit = 'person', quote_eligibility = 'legacy_mapped'
where billing_period is null and billing_unit is null
  and type = 'day_use'::rate_plan_type and price_unit = 'per_person'::price_unit;

update rate_plans
set billing_period = 'once', billing_unit = 'person', quote_eligibility = 'legacy_mapped'
where billing_period is null and billing_unit is null
  and type = 'entrance'::rate_plan_type and price_unit = 'per_person'::price_unit;

update rate_plans
set billing_period = 'hour', billing_unit = case when price_unit = 'per_person'::price_unit then 'person' else 'group' end,
  quote_eligibility = 'legacy_mapped'
where billing_period is null and billing_unit is null
  and type = 'hourly'::rate_plan_type
  and price_unit in ('per_person'::price_unit, 'per_group'::price_unit);

update rate_plans
set quote_eligibility = case
  when billing_period is not null and billing_unit is not null then 'eligible'
  else 'legacy_ambiguous'
end;

create table if not exists rate_plan_review_items (
  id uuid primary key default gen_random_uuid(),
  rate_plan_id uuid not null unique references rate_plans(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (status in ('pending', 'resolved'))
);
create index if not exists rate_plan_review_items_pending_idx
  on rate_plan_review_items (status, created_at);

insert into rate_plan_review_items (rate_plan_id, listing_id, reason)
select id, listing_id,
  'Legacy price unit/period is ambiguous. Confirm explicit billing dimensions before this rate can quote.'
from rate_plans
where quote_eligibility = 'legacy_ambiguous'
on conflict (rate_plan_id) do nothing;
