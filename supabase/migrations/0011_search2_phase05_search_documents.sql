-- Search 2.0 Phase 5: a separate simple-configuration search document keeps
-- local aliases and structured discovery fields out of the legacy English FTS.
set search_path to public, extensions;

alter table listings add column if not exists search_vector_simple tsvector;
create index if not exists listings_search_simple_gin_idx on listings using gin (search_vector_simple);
create index if not exists areas_name_trgm_idx on areas using gin (name gin_trgm_ops);
create index if not exists route_stops_name_trgm_idx on route_stops using gin (name gin_trgm_ops);

create or replace function refresh_listing_search_vector_simple(target_listing_id uuid)
returns void language plpgsql as $$
begin
  update listings l
  set search_vector_simple =
    setweight(to_tsvector('simple', coalesce(l.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce((select string_agg(la.alias, ' ') from listing_aliases la where la.listing_id = l.id), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce((select string_agg(value, ' ') from jsonb_each_text(l.address)), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce((select string_agg(a.name || ' ' || coalesce(aa.alias, ''), ' ') from areas a left join area_aliases aa on aa.area_id = a.id where a.id = l.canonical_area_id), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce((select string_agg(am.name || ' ' || am.slug, ' ') from listing_amenities lam join amenities am on am.id = lam.amenity_id where lam.listing_id = l.id), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce((select string_agg(value, ' ') from jsonb_each_text(l.attributes)), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(l.description, '')), 'C')
  where l.id = target_listing_id;
end $$;

create or replace function refresh_listing_search_vector_simple_listing_trigger()
returns trigger language plpgsql as $$ begin
  perform refresh_listing_search_vector_simple(new.id); return new;
end $$;

create or replace function refresh_listing_search_vector_simple_related_trigger()
returns trigger language plpgsql as $$ declare target_id uuid; begin
  target_id := coalesce(new.listing_id, old.listing_id);
  perform refresh_listing_search_vector_simple(target_id); return coalesce(new, old);
end $$;

create or replace function refresh_listing_search_vector_simple_amenity_trigger()
returns trigger language plpgsql as $$ declare listing_row record; begin
  for listing_row in select listing_id from listing_amenities where amenity_id = coalesce(new.id, old.id) loop
    perform refresh_listing_search_vector_simple(listing_row.listing_id);
  end loop;
  return coalesce(new, old);
end $$;

create or replace function refresh_listing_search_vector_simple_area_trigger()
returns trigger language plpgsql as $$ declare area_id uuid; listing_row record; begin
  area_id := coalesce(new.area_id, old.area_id);
  for listing_row in select id from listings where canonical_area_id = area_id loop
    perform refresh_listing_search_vector_simple(listing_row.id);
  end loop;
  return coalesce(new, old);
end $$;

create or replace function refresh_listing_search_vector_simple_area_name_trigger()
returns trigger language plpgsql as $$ declare listing_row record; begin
  for listing_row in select id from listings where canonical_area_id = coalesce(new.id, old.id) loop
    perform refresh_listing_search_vector_simple(listing_row.id);
  end loop;
  return coalesce(new, old);
end $$;

drop trigger if exists listings_search_vector_simple_refresh on listings;
create trigger listings_search_vector_simple_refresh after insert or update of name, description, address, attributes, canonical_area_id on listings
for each row execute function refresh_listing_search_vector_simple_listing_trigger();
drop trigger if exists listing_aliases_search_vector_simple_refresh on listing_aliases;
create trigger listing_aliases_search_vector_simple_refresh after insert or update or delete on listing_aliases
for each row execute function refresh_listing_search_vector_simple_related_trigger();
drop trigger if exists listing_amenities_search_vector_simple_refresh on listing_amenities;
create trigger listing_amenities_search_vector_simple_refresh after insert or update or delete on listing_amenities
for each row execute function refresh_listing_search_vector_simple_related_trigger();
drop trigger if exists amenities_search_vector_simple_refresh on amenities;
create trigger amenities_search_vector_simple_refresh after update of name, slug on amenities
for each row execute function refresh_listing_search_vector_simple_amenity_trigger();
drop trigger if exists areas_search_vector_simple_refresh on areas;
create trigger areas_search_vector_simple_refresh after update of name on areas
for each row execute function refresh_listing_search_vector_simple_area_name_trigger();
drop trigger if exists area_aliases_search_vector_simple_refresh on area_aliases;
create trigger area_aliases_search_vector_simple_refresh after insert or update or delete on area_aliases
for each row execute function refresh_listing_search_vector_simple_area_trigger();

select refresh_listing_search_vector_simple(id) from listings;
