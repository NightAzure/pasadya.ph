import { sql } from "drizzle-orm";

import { db, pool } from "@/db/client";
import { seedTransportData } from "@/modules/transport/seed-data";

const amenities = [
  ["pool", "Pool", "Waves", "general"],
  ["beach-access", "Beach access", "Umbrella", "general"],
  ["wifi", "WiFi", "Wifi", "general"],
  ["aircon", "Air conditioning", "Snowflake", "room"],
  ["karaoke", "Karaoke", "Mic2", "general"],
  ["parking", "Parking", "ParkingCircle", "general"],
  ["kitchen", "Kitchen", "CookingPot", "room"],
  ["pet-friendly", "Pet friendly", "PawPrint", "general"],
  ["kiddie-pool", "Kiddie pool", "Baby", "general"],
  ["atv", "ATV", "Bike", "activity"],
  ["bonfire", "Bonfire", "Flame", "activity"],
  ["snorkeling", "Snorkeling", "Fish", "activity"],
] as const;

async function run() {
  for (const [slug, name, icon, category] of amenities) {
    await db.execute(sql`
      insert into amenities (slug, name, icon, category)
      values (${slug}, ${name}, ${icon}, ${category}::amenity_category)
      on conflict (slug) do update
      set name = excluded.name,
          icon = excluded.icon,
          category = excluded.category
    `);
  }

  await db.execute(sql`
    insert into users (email, name, role, auth_provider)
    values ('dev-user@example.test', 'Dev User', 'user', 'email')
    on conflict (email) do nothing
  `);

  await db.execute(sql`
    insert into listings (
      slug,
      name,
      category,
      description,
      status,
      claim_status,
      location,
      address,
      attributes,
      price_min,
      price_max,
      search_vector
    )
    values (
      'samal-foundation-placeholder',
      'Samal Foundation Placeholder',
      'resort',
      'Minimal development record for schema verification only.',
      'draft',
      'unclaimed',
      ST_SetSRID(ST_MakePoint(125.7100, 7.0744), 4326)::geography,
      '{"municipality":"Samal","province":"Davao del Norte"}'::jsonb,
      '{"day_use":true}'::jsonb,
      15000,
      15000,
      to_tsvector('english', 'Samal Foundation Placeholder resort')
    )
    on conflict (slug) do nothing
  `);

  await db.execute(sql`
    insert into users (email, name, role, auth_provider, email_verified)
    values ('owner-seed@example.test', 'Seed Owner', 'user', 'email', now())
    on conflict (email) do update
    set name = excluded.name
  `);

  await db.execute(sql`
    insert into businesses (owner_id, display_name, contact_phone, contact_email, verified_at)
    select id, 'Seeded Public Places', '+639170000000', 'owner-seed@example.test', now()
    from users
    where email = 'owner-seed@example.test'
      and not exists (
        select 1 from businesses where display_name = 'Seeded Public Places'
      )
  `);

  await db.execute(sql`
    with owner_business as (
      select id from businesses where display_name = 'Seeded Public Places' limit 1
    )
    insert into listings (
      business_id,
      slug,
      name,
      category,
      description,
      status,
      claim_status,
      location,
      address,
      attributes,
      price_min,
      price_max,
      rating_avg,
      rating_count,
      dot_accredited,
      booking_mode,
      cancellation_policy,
      contact_phone,
      contact_facebook,
      contact_website,
      published_at,
      search_vector
    )
    values
      (
        (select id from owner_business),
        'kaputian-tide-beach-resort',
        'Kaputian Tide Beach Resort',
        'resort',
        'A calm beachside stay in Kaputian with day-use cottages, simple rooms, and clear water for weekend groups.',
        'published',
        'claimed',
        ST_SetSRID(ST_MakePoint(125.7306, 6.9459), 4326)::geography,
        '{"street":"Kaputian Road","barangay":"Kaputian","municipality":"Samal","province":"Davao del Norte","postal_code":"8119"}'::jsonb,
        '{"day_use":true,"overnight":true,"room_count":12,"beach_access":true,"crowd_level":"moderate","crowd_source":"typically moderate on weekends"}'::jsonb,
        20000,
        320000,
        4.6,
        128,
        true,
        'inquiry',
        'moderate',
        '+639171111111',
        'https://facebook.com/pasadya-seed',
        null,
        now(),
        to_tsvector('english', 'Kaputian Tide Beach Resort resort beach pool day use overnight Samal Kaputian')
      ),
      (
        null,
        'babak-harbor-day-resort',
        'Babak Harbor Day Resort',
        'resort',
        'A practical day-use resort near Babak port with pools, parking, and cottage packages for families.',
        'published',
        'unclaimed',
        ST_SetSRID(ST_MakePoint(125.6958, 7.1157), 4326)::geography,
        '{"street":"Babak Port Road","barangay":"Babak","municipality":"Samal","province":"Davao del Norte","postal_code":"8119"}'::jsonb,
        '{"day_use":true,"overnight":false,"beach_access":true,"crowd_level":"busy","crowd_source":"typically busy on Sundays"}'::jsonb,
        15000,
        90000,
        4.2,
        56,
        false,
        'inquiry',
        'flexible',
        '+639172222222',
        'https://facebook.com/pasadya-seed',
        null,
        now(),
        to_tsvector('english', 'Babak Harbor Day Resort resort pool parking day use Samal Babak')
      ),
      (
        null,
        'talicud-blue-cove-cottages',
        'Talicud Blue Cove Cottages',
        'resort',
        'Simple beachfront cottages on Talicud for groups that want a quieter island stay.',
        'published',
        'unclaimed',
        ST_SetSRID(ST_MakePoint(125.6704, 6.9168), 4326)::geography,
        '{"street":"Talicud Island Road","barangay":"Dadatan","municipality":"Samal","province":"Davao del Norte","postal_code":"8119"}'::jsonb,
        '{"day_use":true,"overnight":true,"beach_access":true,"crowd_level":"quiet","crowd_source":"typically quiet on weekdays"}'::jsonb,
        18000,
        250000,
        4.5,
        42,
        false,
        'inquiry',
        'flexible',
        '+639173333333',
        null,
        null,
        now(),
        to_tsvector('english', 'Talicud Blue Cove Cottages resort beach quiet island cottages Samal Talicud')
      ),
      (
        null,
        'matina-garden-stay',
        'Matina Garden Stay',
        'room',
        'A clean city stay near Matina with air-conditioned rooms, WiFi, and easy access to downtown Davao.',
        'published',
        'unclaimed',
        ST_SetSRID(ST_MakePoint(125.6021, 7.0581), 4326)::geography,
        '{"street":"MacArthur Highway","barangay":"Matina","municipality":"Davao City","province":"Davao del Sur","postal_code":"8000"}'::jsonb,
        '{"room_count":18,"aircon":true,"price_range":"budget","crowd_level":"moderate","crowd_source":"typical city demand"}'::jsonb,
        120000,
        260000,
        4.3,
        89,
        false,
        'instant',
        'moderate',
        '+639174444444',
        null,
        'https://example.test/matina-garden-stay',
        now(),
        to_tsvector('english', 'Matina Garden Stay room hotel pension house aircon wifi Davao City Matina')
      ),
      (
        null,
        'lanang-airport-pension',
        'Lanang Airport Pension',
        'room',
        'A no-frills pension house in Lanang for early flights, quick overnights, and budget city trips.',
        'published',
        'unclaimed',
        ST_SetSRID(ST_MakePoint(125.6456, 7.0996), 4326)::geography,
        '{"street":"J.P. Laurel Avenue","barangay":"Lanang","municipality":"Davao City","province":"Davao del Sur","postal_code":"8000"}'::jsonb,
        '{"room_count":24,"aircon":true,"price_range":"budget","crowd_level":"quiet","crowd_source":"typical weekday occupancy"}'::jsonb,
        95000,
        190000,
        4.0,
        34,
        false,
        'inquiry',
        'flexible',
        '+639175555555',
        null,
        null,
        now(),
        to_tsvector('english', 'Lanang Airport Pension room hotel aircon parking Davao City airport')
      ),
      (
        null,
        'roxas-night-market-grill',
        'Roxas Night Market Grill',
        'restaurant',
        'Casual Filipino grilled seafood and barbecue close to Roxas night market and downtown hotels.',
        'published',
        'unclaimed',
        ST_SetSRID(ST_MakePoint(125.6132, 7.0716), 4326)::geography,
        '{"street":"Roxas Avenue","barangay":"Poblacion","municipality":"Davao City","province":"Davao del Sur","postal_code":"8000"}'::jsonb,
        '{"cuisine":["filipino","seafood","barbecue"],"price_range":"mid","reservations":false,"crowd_level":"busy","crowd_source":"typically busy after 6 PM"}'::jsonb,
        18000,
        65000,
        4.4,
        211,
        false,
        'none',
        'flexible',
        '+639176666666',
        null,
        null,
        now(),
        to_tsvector('english', 'Roxas Night Market Grill restaurant seafood barbecue Filipino Davao City')
      ),
      (
        null,
        'davao-riverfront-cafe',
        'Davao Riverfront Cafe',
        'restaurant',
        'Coffee, breakfast plates, and simple local meals near the riverfront for relaxed city meetups.',
        'published',
        'unclaimed',
        ST_SetSRID(ST_MakePoint(125.6098, 7.0858), 4326)::geography,
        '{"street":"Riverfront Drive","barangay":"Buhangin","municipality":"Davao City","province":"Davao del Sur","postal_code":"8000"}'::jsonb,
        '{"cuisine":["filipino","coffee","breakfast"],"price_range":"mid","reservations":false,"crowd_level":"moderate","crowd_source":"typical brunch demand"}'::jsonb,
        12000,
        45000,
        4.1,
        67,
        false,
        'none',
        'flexible',
        '+639177777777',
        null,
        null,
        now(),
        to_tsvector('english', 'Davao Riverfront Cafe restaurant coffee breakfast Filipino Davao City')
      ),
      (
        null,
        'samal-island-hopping-co',
        'Samal Island Hopping Co.',
        'activity',
        'A half-day island-hopping activity with snorkeling stops, boat crew, and optional lunch package.',
        'published',
        'unclaimed',
        ST_SetSRID(ST_MakePoint(125.6899, 7.1073), 4326)::geography,
        '{"street":"Babak Wharf","barangay":"Babak","municipality":"Samal","province":"Davao del Norte","postal_code":"8119"}'::jsonb,
        '{"duration_hours":4,"max_pax":20,"includes":["boat crew","snorkeling stop"],"crowd_level":"moderate","crowd_source":"weather-dependent demand"}'::jsonb,
        85000,
        450000,
        4.7,
        73,
        false,
        'inquiry',
        'strict',
        '+639178888888',
        null,
        null,
        now(),
        to_tsvector('english', 'Samal Island Hopping activity snorkeling boat Babak island tour')
      )
    on conflict (slug) do update
    set business_id = excluded.business_id,
        name = excluded.name,
        category = excluded.category,
        description = excluded.description,
        status = excluded.status,
        claim_status = excluded.claim_status,
        location = excluded.location,
        address = excluded.address,
        attributes = excluded.attributes,
        price_min = excluded.price_min,
        price_max = excluded.price_max,
        rating_avg = excluded.rating_avg,
        rating_count = excluded.rating_count,
        dot_accredited = excluded.dot_accredited,
        booking_mode = excluded.booking_mode,
        cancellation_policy = excluded.cancellation_policy,
        contact_phone = excluded.contact_phone,
        contact_facebook = excluded.contact_facebook,
        contact_website = excluded.contact_website,
        published_at = excluded.published_at,
        search_vector = excluded.search_vector,
        updated_at = now()
  `);

  await db.execute(sql`
    delete from listing_media
    where listing_id in (
      select id from listings
      where slug in (
        'kaputian-tide-beach-resort',
        'babak-harbor-day-resort',
        'talicud-blue-cove-cottages',
        'matina-garden-stay',
        'lanang-airport-pension',
        'roxas-night-market-grill',
        'davao-riverfront-cafe',
        'samal-island-hopping-co'
      )
    )
  `);

  await db.execute(sql`
    insert into listing_media (listing_id, url, type, caption, sort_order, moderated)
    select l.id, media.url, 'photo', media.caption, media.sort_order, true
    from listings l
    join (
      values
        ('kaputian-tide-beach-resort', '/listings/samal-beach-resort-placeholder.png', 'Generated placeholder beach resort photo for seed data.', 1),
        ('kaputian-tide-beach-resort', '/listings/samal-island-hopping-placeholder.png', 'Generated placeholder Davao Gulf activity photo for seed data.', 2),
        ('babak-harbor-day-resort', '/listings/samal-beach-resort-placeholder.png', 'Generated placeholder beach resort photo for seed data.', 1),
        ('talicud-blue-cove-cottages', '/listings/samal-beach-resort-placeholder.png', 'Generated placeholder island cottages photo for seed data.', 1),
        ('matina-garden-stay', '/listings/davao-city-stay-placeholder.png', 'Generated placeholder city stay photo for seed data.', 1),
        ('lanang-airport-pension', '/listings/davao-city-stay-placeholder.png', 'Generated placeholder pension house photo for seed data.', 1),
        ('roxas-night-market-grill', '/listings/davao-seafood-restaurant-placeholder.png', 'Generated placeholder restaurant photo for seed data.', 1),
        ('davao-riverfront-cafe', '/listings/davao-seafood-restaurant-placeholder.png', 'Generated placeholder cafe photo for seed data.', 1),
        ('samal-island-hopping-co', '/listings/samal-island-hopping-placeholder.png', 'Generated placeholder island hopping photo for seed data.', 1)
    ) as media(slug, url, caption, sort_order)
      on media.slug = l.slug
  `);

  await db.execute(sql`
    delete from listing_amenities
    where listing_id in (
      select id from listings
      where slug in (
        'kaputian-tide-beach-resort',
        'babak-harbor-day-resort',
        'talicud-blue-cove-cottages',
        'matina-garden-stay',
        'lanang-airport-pension',
        'roxas-night-market-grill',
        'davao-riverfront-cafe',
        'samal-island-hopping-co'
      )
    )
  `);

  await db.execute(sql`
    insert into listing_amenities (listing_id, amenity_id)
    select l.id, a.id
    from listings l
    join (
      values
        ('kaputian-tide-beach-resort', 'pool'),
        ('kaputian-tide-beach-resort', 'beach-access'),
        ('kaputian-tide-beach-resort', 'wifi'),
        ('kaputian-tide-beach-resort', 'parking'),
        ('babak-harbor-day-resort', 'pool'),
        ('babak-harbor-day-resort', 'parking'),
        ('babak-harbor-day-resort', 'kiddie-pool'),
        ('talicud-blue-cove-cottages', 'beach-access'),
        ('talicud-blue-cove-cottages', 'kitchen'),
        ('talicud-blue-cove-cottages', 'snorkeling'),
        ('matina-garden-stay', 'wifi'),
        ('matina-garden-stay', 'aircon'),
        ('matina-garden-stay', 'parking'),
        ('lanang-airport-pension', 'aircon'),
        ('lanang-airport-pension', 'parking'),
        ('roxas-night-market-grill', 'parking'),
        ('davao-riverfront-cafe', 'wifi'),
        ('samal-island-hopping-co', 'snorkeling')
    ) as pairs(slug, amenity_slug)
      on pairs.slug = l.slug
    join amenities a
      on a.slug = pairs.amenity_slug
    on conflict do nothing
  `);

  await db.execute(sql`
    delete from rate_plans rp
    where not exists (select 1 from bookings b where b.rate_plan_id = rp.id)
      and listing_id in (
      select id from listings
      where slug in (
        'kaputian-tide-beach-resort',
        'babak-harbor-day-resort',
        'talicud-blue-cove-cottages',
        'matina-garden-stay',
        'lanang-airport-pension',
        'roxas-night-market-grill',
        'davao-riverfront-cafe',
        'samal-island-hopping-co'
      )
    )
  `);

  await db.execute(sql`
    insert into rate_plans (listing_id, name, type, price, price_unit, min_pax, max_pax, description, active, sort_order)
    select l.id, plans.name, plans.type::rate_plan_type, plans.price, plans.price_unit::price_unit, plans.min_pax, plans.max_pax, plans.description, true, plans.sort_order
    from listings l
    join (
      values
        ('kaputian-tide-beach-resort', 'Day-use entrance', 'entrance', 20000, 'per_person', 1, null, 'Beach and pool access for one guest.', 1),
        ('kaputian-tide-beach-resort', 'Standard room', 'overnight', 320000, 'per_night', 2, 4, 'Air-conditioned overnight room.', 2),
        ('babak-harbor-day-resort', 'Day-use entrance', 'entrance', 15000, 'per_person', 1, null, 'Pool and cottage access.', 1),
        ('talicud-blue-cove-cottages', 'Beach cottage', 'package', 250000, 'per_group', 1, 10, 'Group cottage package for island stays.', 1),
        ('matina-garden-stay', 'Queen room', 'overnight', 180000, 'per_night', 1, 2, 'Air-conditioned city room.', 1),
        ('lanang-airport-pension', 'Budget room', 'overnight', 95000, 'per_night', 1, 2, 'Basic room for overnight stays.', 1),
        ('roxas-night-market-grill', 'Average meal', 'package', 28000, 'per_person', 1, null, 'Typical grilled seafood meal.', 1),
        ('davao-riverfront-cafe', 'Breakfast plate', 'package', 18000, 'per_person', 1, null, 'Coffee and breakfast plate estimate.', 1),
        ('samal-island-hopping-co', 'Half-day boat share', 'package', 85000, 'per_person', 4, 20, 'Shared island-hopping activity.', 1)
    ) as plans(slug, name, type, price, price_unit, min_pax, max_pax, description, sort_order)
      on plans.slug = l.slug
    where not exists (
      select 1 from rate_plans existing
      where existing.listing_id = l.id
        and existing.name = plans.name
        and existing.price = plans.price
    )
  `);

  await db.execute(sql`
    with selected_listings as (
      select id, slug
      from listings
      where slug in (
        'kaputian-tide-beach-resort',
        'babak-harbor-day-resort',
        'talicud-blue-cove-cottages',
        'matina-garden-stay',
        'lanang-airport-pension',
        'roxas-night-market-grill',
        'davao-riverfront-cafe',
        'samal-island-hopping-co'
      )
    )
    insert into collections (slug, title, description, cover_image, listing_ids, published)
    values
      (
        'samal-day-use-under-200',
        'Samal day-use picks under PHP 200',
        'Seeded resorts and beach spots for affordable Samal day trips.',
        '/listings/samal-beach-resort-placeholder.png',
        array(
          select id from selected_listings
          where slug in ('babak-harbor-day-resort', 'talicud-blue-cove-cottages', 'kaputian-tide-beach-resort')
          order by array_position(array['babak-harbor-day-resort', 'talicud-blue-cove-cottages', 'kaputian-tide-beach-resort'], slug)
        ),
        true
      ),
      (
        'davao-weekend-starter',
        'Davao weekend starter guide',
        'A compact set of places for first-time visitors staying in Davao City and crossing to Samal.',
        '/listings/davao-city-stay-placeholder.png',
        array(
          select id from selected_listings
          where slug in ('matina-garden-stay', 'roxas-night-market-grill', 'samal-island-hopping-co', 'kaputian-tide-beach-resort')
          order by array_position(array['matina-garden-stay', 'roxas-night-market-grill', 'samal-island-hopping-co', 'kaputian-tide-beach-resort'], slug)
        ),
        true
      )
    on conflict (slug) do update
    set title = excluded.title,
        description = excluded.description,
        cover_image = excluded.cover_image,
        listing_ids = excluded.listing_ids,
        published = excluded.published
  `);

  const seededRoutes = await seedTransportData();
  console.log(`Seeded transport routes: ${seededRoutes}`);

  const count = await db.execute<{ count: string }>(sql`
    select count(*)::text as count from amenities
  `);
  console.log(`Seeded amenities: ${count.rows[0]?.count ?? "0"}`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
