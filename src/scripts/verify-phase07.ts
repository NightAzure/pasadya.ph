import { sql } from "drizzle-orm";

import { db, pool } from "@/db/client";
import {
  answerQuestion,
  createCrowdReport,
  createQuestion,
  createReview,
  getCrowdDisplay,
  respondToReview,
} from "@/modules/community/service";
import {
  dispatchEvent,
  listNotificationsForActor,
  markNotificationRead,
} from "@/modules/notifications/service";

const marker = "Phase 07 verification";

async function getOrCreateUser(email: string, ageDays: number) {
  const result = await db.execute<{ id: string }>(sql`
    insert into users (email, name, role, auth_provider, email_verified)
    values (${email}, ${email.split("@")[0]}, 'user'::user_role, 'email'::auth_provider, now())
    on conflict (email) do update set name = excluded.name
    returning id::text
  `);
  const id = result.rows[0]?.id;
  if (!id) throw new Error(`Could not create verification user ${email}`);
  await db.execute(sql`
    update users set created_at = now() - (${ageDays} || ' days')::interval,
      updated_at = now()
    where id = ${id}::uuid
  `);
  return id;
}

async function expectFailure(label: string, operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch {
    return;
  }
  throw new Error(`${label} unexpectedly succeeded`);
}

async function run() {
  const listing = await db.execute<{
    id: string;
    lat: number;
    lng: number;
    ownerId: string;
    ratePlanId: string;
  }>(sql`
    select l.id::text, ST_Y(l.location::geometry)::float8 as lat,
      ST_X(l.location::geometry)::float8 as lng, b.owner_id::text as "ownerId",
      (select id::text from rate_plans where listing_id = l.id and active = true limit 1) as "ratePlanId"
    from listings l join businesses b on b.id = l.business_id
    where l.slug = 'kaputian-tide-beach-resort' limit 1
  `);
  const place = listing.rows[0];
  if (!place?.id || !place.ownerId || !place.ratePlanId)
    throw new Error("Seeded Phase 07 listing is incomplete");

  const reviewer = await getOrCreateUser("phase07-reviewer@example.test", 30);
  const reviewerTwo = await getOrCreateUser(
    "phase07-reviewer-two@example.test",
    30,
  );
  const reviewerThree = await getOrCreateUser(
    "phase07-reviewer-three@example.test",
    30,
  );
  const newUser = await getOrCreateUser("phase07-new@example.test", 1);
  const devUser = await getOrCreateUser("dev-user@example.test", 30);

  await db.execute(sql`
    delete from moderation_queue where reference_id in (select id from reviews where body like ${marker + "%"})
      or reference_id in (select id from questions where body like ${marker + "%"})
  `);
  await db.execute(sql`delete from reviews where body like ${marker + "%"}`);
  await db.execute(sql`delete from questions where body like ${marker + "%"}`);
  await db.execute(
    sql`delete from crowd_reports where user_id in (${reviewer}::uuid, ${reviewerTwo}::uuid, ${reviewerThree}::uuid, ${devUser}::uuid)`,
  );
  await db.execute(
    sql`delete from notifications where user_id in (${reviewer}::uuid, ${reviewerTwo}::uuid, ${reviewerThree}::uuid)`,
  );
  await db.execute(
    sql`delete from bookings where guest_email in ('phase07-reviewer@example.test', 'phase07-reviewer-two@example.test')`,
  );

  const booking = await db.execute<{ id: string }>(sql`
    insert into bookings (
      listing_id, user_id, rate_plan_id, status, check_in, check_out, pax,
      guest_name, guest_email, subtotal, downpayment_amount, balance_due, currency,
      completed_at
    ) values (
      ${place.id}::uuid, ${reviewer}::uuid, ${place.ratePlanId}::uuid, 'completed'::booking_status,
      current_date - 3, current_date - 2, 2, 'Phase 07 Reviewer',
      'phase07-reviewer@example.test', 10000, 5000, 5000, 'PHP', now()
    ) returning id::text
  `);
  const bookingId = booking.rows[0]?.id;
  if (!bookingId)
    throw new Error("Completed verification booking was not created");

  const verified = await createReview(
    {
      listingId: place.id,
      bookingId,
      rating: 5,
      body: `${marker} verified stay was clean and welcoming.`,
    },
    reviewer,
  );
  if (verified.flagged || !verified.review?.verifiedStay)
    throw new Error("Verified review was not published with the stay badge");
  const unverified = await createReview(
    {
      listingId: place.id,
      rating: 4,
      body: `${marker} unverified visit had clear rates and helpful staff.`,
    },
    reviewerTwo,
  );
  if (unverified.flagged || unverified.review?.verifiedStay)
    throw new Error("Unverified review did not publish with the correct label");
  await expectFailure("own-listing review", () =>
    createReview(
      {
        listingId: place.id,
        rating: 5,
        body: `${marker} owner review should be blocked.`,
      },
      place.ownerId,
    ),
  );
  const duplicate = await createReview(
    {
      listingId: place.id,
      rating: 4,
      body: `${marker} unverified visit had clear rates and helpful staff.`,
    },
    reviewerThree,
  );
  if (!duplicate.flagged)
    throw new Error("Duplicate review was not held for moderation");
  const held = await createReview(
    {
      listingId: place.id,
      rating: 3,
      body: `${marker} new account review should be held for moderation.`,
    },
    newUser,
  );
  if (!held.flagged)
    throw new Error("New-account review was not held for moderation");

  const rating = await db.execute<{ count: number; average: number }>(sql`
    select rating_count as count, rating_avg::float8 as average from listings where id = ${place.id}::uuid
  `);
  if (
    Number(rating.rows[0]?.count) < 2 ||
    Number(rating.rows[0]?.average) < 4.4
  )
    throw new Error("Published review rating did not recalculate");
  await respondToReview(
    verified.review.id,
    { response: `${marker} thanks for visiting.` },
    place.ownerId,
  );

  const question = await createQuestion(
    {
      listingId: place.id,
      body: `${marker} Is the ferry terminal easy to reach?`,
    },
    reviewerTwo,
  );
  if (!question) throw new Error("Question was not created");
  const answered = await answerQuestion(
    question.id,
    { answer: "Yes, the route guide shows the terminal steps." },
    place.ownerId,
  );
  if (!answered?.answer) throw new Error("Question answer was not stored");

  const businessCrowd = await createCrowdReport(
    { listingId: place.id, source: "business", level: "busy" },
    place.ownerId,
  );
  if (businessCrowd.display.source !== "business")
    throw new Error("Business crowd report did not take priority");
  await db.execute(
    sql`delete from crowd_reports where listing_id = ${place.id}::uuid and source = 'business'::crowd_source`,
  );
  await expectFailure("community report without GPS", () =>
    createCrowdReport(
      { listingId: place.id, source: "community", level: "moderate" },
      reviewer,
    ),
  );
  await createCrowdReport(
    {
      listingId: place.id,
      source: "community",
      level: "moderate",
      lat: place.lat,
      lng: place.lng,
    },
    reviewer,
  );
  await createCrowdReport(
    {
      listingId: place.id,
      source: "community",
      level: "moderate",
      lat: place.lat,
      lng: place.lng,
    },
    reviewerTwo,
  );
  await createCrowdReport(
    {
      listingId: place.id,
      source: "community",
      level: "moderate",
      lat: place.lat,
      lng: place.lng,
    },
    devUser,
  );
  const communityCrowd = await getCrowdDisplay(place.id);
  if (communityCrowd.source !== "community" || communityCrowd.reportCount < 3)
    throw new Error("Community crowd threshold did not resolve");

  const dispatched = await dispatchEvent({
    userId: reviewer,
    event: "booking.requested",
    data: { title: marker, body: "Notification adapter smoke test" },
  });
  const notification = dispatched.deliveries.find(
    (delivery) => delivery.channel === "in_app",
  )?.notification;
  if (!notification) throw new Error("In-app notification was not created");
  const center = await listNotificationsForActor(reviewer);
  if (center.unreadCount < 1)
    throw new Error("Unread notification count did not increment");
  await markNotificationRead(reviewer, notification.id);

  console.log("Phase 07 verification passed");
  console.log(
    JSON.stringify({
      verifiedReviewId: verified.review?.id,
      flaggedReviewId: duplicate.review?.id,
      questionId: question.id,
      communityCrowd: communityCrowd.reportCount,
      notificationId: notification.id,
    }),
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
