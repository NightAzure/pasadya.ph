-- A controlled admin exception must remain visible to the publish guard after
-- the repair request ends. Owner edits never set this field.
alter table listings
  add column if not exists location_override_reason text;
