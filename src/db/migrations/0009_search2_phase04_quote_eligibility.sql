-- Phase 4 follow-up: explicit fee disclosure and freshness/trust eligibility.
-- Null fee disclosure remains intentionally ineligible; do not infer zero fees.
alter table rate_plans
  add column if not exists mandatory_fee integer,
  add column if not exists mandatory_fee_label text,
  add column if not exists fees_declared_at timestamptz,
  add column if not exists mandatory_charge_disclosure_status text not null default 'undisclosed',
  add column if not exists pricing_trust_status listing_trust_status not null default 'unknown',
  add column if not exists pricing_verified_at timestamptz,
  add column if not exists pricing_valid_until timestamptz,
  add column if not exists availability_trust_status listing_trust_status not null default 'unknown',
  add column if not exists availability_verified_at timestamptz,
  add column if not exists availability_valid_until timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'rate_plans_mandatory_fee_nonnegative') then
    alter table rate_plans add constraint rate_plans_mandatory_fee_nonnegative
      check (mandatory_fee is null or mandatory_fee >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rate_plans_fee_label_when_positive') then
    alter table rate_plans add constraint rate_plans_fee_label_when_positive
      check (mandatory_fee is null or mandatory_fee = 0 or mandatory_fee_label is not null) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rate_plans_mandatory_charge_disclosure_check') then
    alter table rate_plans add constraint rate_plans_mandatory_charge_disclosure_check
      check (mandatory_charge_disclosure_status in ('undisclosed', 'none', 'itemized')) not valid;
  end if;
end $$;

create index if not exists rate_plans_quote_freshness_idx
  on rate_plans (pricing_trust_status, pricing_verified_at, availability_trust_status, availability_verified_at)
  where active;
