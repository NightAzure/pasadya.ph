-- Search 2.0 Phase 3: owner/admin data collection. These fields capture
-- declared rate semantics only; Phase 4 remains responsible for quoting and
-- availability calculations.
alter table rate_plans
  add column if not exists billing_period text,
  add column if not exists billing_unit text,
  add column if not exists included_pax integer,
  add column if not exists extra_pax_charge integer,
  add column if not exists capacity_per_unit integer,
  add column if not exists inventory_unit_label text,
  add column if not exists available_quantity integer,
  add column if not exists is_primary boolean not null default false;

alter table transport_routes
  add column if not exists last_verified_at timestamptz,
  add column if not exists source_note text;

create unique index if not exists rate_plans_primary_per_listing_unique
  on rate_plans (listing_id)
  where is_primary and active;

create index if not exists rate_plans_data_quality_idx
  on rate_plans (listing_id, active, is_primary);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'rate_plans_billing_period_check') then
    alter table rate_plans add constraint rate_plans_billing_period_check
      check (billing_period is null or billing_period in ('once', 'night', 'day', 'hour'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rate_plans_billing_unit_check') then
    alter table rate_plans add constraint rate_plans_billing_unit_check
      check (billing_unit is null or billing_unit in ('inventory_unit', 'person', 'group'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rate_plans_pax_range_check') then
    alter table rate_plans add constraint rate_plans_pax_range_check
      check (max_pax is null or min_pax <= max_pax);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rate_plans_included_pax_check') then
    alter table rate_plans add constraint rate_plans_included_pax_check
      check (included_pax is null or included_pax >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rate_plans_capacity_quantity_check') then
    alter table rate_plans add constraint rate_plans_capacity_quantity_check
      check ((capacity_per_unit is null or capacity_per_unit > 0) and (available_quantity is null or available_quantity >= 0));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listing_opening_hours_time_check') then
    alter table listing_opening_hours add constraint listing_opening_hours_time_check
      check (is_closed or (opens_at is not null and closes_at is not null and opens_at <> closes_at));
  end if;
end $$;
