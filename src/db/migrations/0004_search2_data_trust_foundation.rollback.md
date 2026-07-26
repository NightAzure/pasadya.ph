# Rollback: Search 2.0 Phase 2 data-trust foundation

This migration is additive and does not change legacy `listings.address` or
`listings.location` values. Normal rollback is therefore an application rollback:
keep using the existing readers, which do not depend on the Phase 2 tables or
columns.

Do not run a destructive schema rollback against a populated database unless a
database backup has been taken and a maintainer has confirmed no later migration
or service depends on these objects. If a pre-release environment must be reset,
drop dependents in this order: the Phase 2 timezone/source-URL constraints and
`hours_timezone` column from `0005_search2_data_trust_hours_timezone.sql`, then
`listing_field_provenance`, `listing_sources`,
`listing_special_hours`, `listing_opening_hours`, `listing_aliases`,
`area_aliases`; then remove the new `listings` columns, then `areas`, indexes,
and finally the Phase 2 enum types. The migration runner records filenames, so a
reset also requires removing `0004_search2_data_trust_foundation.sql` from
`schema_migrations` only after the schema has been returned to its pre-migration
shape.

The backfill is deliberately rerunnable. Re-run `npm run search2:phase02:backfill`
after restoring a backup or adding legacy listings, then use
`npm run search2:phase02:verify` to prove it reaches a stable result and reports
every listing.
