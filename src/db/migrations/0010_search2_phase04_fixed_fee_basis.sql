-- Exact totals support only an explicit fixed, per-booking mandatory charge.
-- Existing values stay unmodeled/ineligible until an owner or reviewer confirms
-- they are not per-person, per-period, percentage, inclusive-tax, or another
-- unsupported basis.
alter table rate_plans
  add column if not exists mandatory_fee_basis text not null default 'unmodeled';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rate_plans_mandatory_fee_basis_check') then
    alter table rate_plans add constraint rate_plans_mandatory_fee_basis_check
      check (mandatory_fee_basis in ('unmodeled', 'fixed_per_booking')) not valid;
  end if;
end $$;
