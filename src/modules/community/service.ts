import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { AuthorizationError } from "@/lib/rbac";
import { uuidSchema } from "@/lib/validation";
import { dispatchEvent } from "@/modules/notifications/service";
import { photoUploadSchema } from "@/modules/portal/upload";

export const crowdLevels = ["quiet", "moderate", "busy", "full"] as const;
export type CrowdLevel = (typeof crowdLevels)[number];

type ReviewStatus = "published" | "flagged" | "removed";
const reviewTextSchema = z.string().trim().min(10).max(4_000);

export const reviewInputSchema = z.object({
  listingId: uuidSchema,
  bookingId: uuidSchema.optional(),
  rating: z.coerce.number().int().min(1).max(5),
  subRatings: z
    .record(z.string().trim().min(1).max(40), z.coerce.number().min(1).max(5))
    .optional()
    .default({}),
  body: reviewTextSchema,
});

export const reviewResponseSchema = z.object({
  response: z.string().trim().min(1).max(2_000),
});

export const reviewPhotoInputSchema = photoUploadSchema.extend({
  reviewId: uuidSchema,
  url: z
    .string()
    .trim()
    .min(1)
    .max(400)
    .refine(
      (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
      "Photo URL must be an HTTPS URL or an app-relative path.",
    ),
  caption: z.string().trim().max(240).optional(),
});

export const reviewPhotoReportSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const questionInputSchema = z.object({
  listingId: uuidSchema,
  body: z.string().trim().min(5).max(1_000),
});

export const answerInputSchema = z.object({
  answer: z.string().trim().min(1).max(2_000),
});

export const crowdReportInputSchema = z
  .object({
    listingId: uuidSchema,
    source: z.enum(["business", "community"]),
    level: z.enum(crowdLevels),
    lat: z.coerce.number().finite().min(-90).max(90).optional(),
    lng: z.coerce.number().finite().min(-180).max(180).optional(),
  })
  .superRefine((value, context) => {
    if (value.source === "community" && value.lat === undefined) {
      context.addIssue({
        code: "custom",
        path: ["lat"],
        message: "Latitude is required for community reports.",
      });
    }
    if (value.source === "community" && value.lng === undefined) {
      context.addIssue({
        code: "custom",
        path: ["lng"],
        message: "Longitude is required for community reports.",
      });
    }
  });

export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type ReviewResponseInput = z.infer<typeof reviewResponseSchema>;
export type ReviewPhotoInput = z.infer<typeof reviewPhotoInputSchema>;
export type QuestionInput = z.infer<typeof questionInputSchema>;
export type AnswerInput = z.infer<typeof answerInputSchema>;
export type CrowdReportInput = z.infer<typeof crowdReportInputSchema>;

type Executor = Pick<typeof db, "execute">;

export type ReviewView = {
  id: string;
  listingId: string;
  userId: string;
  bookingId: string | null;
  rating: number;
  subRatings: Record<string, unknown>;
  body: string;
  verifiedStay: boolean;
  ownerResponse: string | null;
  ownerRespondedAt: Date | null;
  status: ReviewStatus;
  photos: ReviewPhotoView[];
  createdAt: Date;
};

export type ReviewPhotoView = {
  id: string;
  url: string;
  caption: string | null;
  createdAt: Date;
};

export type QuestionView = {
  id: string;
  listingId: string;
  userId: string;
  body: string;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: Date | null;
  createdAt: Date;
};

export type CrowdDisplay = {
  level: CrowdLevel | null;
  source: "business" | "community" | "heuristic" | null;
  sourceLabel: string | null;
  reportCount: number;
  expiresAt: Date | null;
};

function parsedActorId(actorId: string) {
  return uuidSchema.parse(actorId);
}

function reviewSelect(executor: Executor, reviewId: string) {
  return executor.execute<ReviewView>(sql`
    select
      r.id::text as id,
      r.listing_id::text as "listingId",
      r.user_id::text as "userId",
      r.booking_id::text as "bookingId",
      r.rating,
      r.sub_ratings as "subRatings",
      r.body,
      r.verified_stay as "verifiedStay",
      r.owner_response as "ownerResponse",
      r.owner_responded_at as "ownerRespondedAt",
      r.status,
      coalesce(
        (
          select json_agg(
            json_build_object(
              'id', rm.id::text,
              'url', rm.url,
              'caption', rm.caption,
              'createdAt', rm.created_at
            )
            order by rm.created_at asc
          )
          from review_media rm
          where rm.review_id = r.id and rm.moderated = true
        ),
        '[]'::json
      ) as photos,
      r.created_at as "createdAt"
    from reviews r
    where r.id = ${uuidSchema.parse(reviewId)}::uuid
    limit 1
  `);
}

export async function getReview(reviewId: string) {
  const result = await reviewSelect(db, reviewId);
  return result.rows[0] ?? null;
}

export async function listReviews(listingId: string) {
  const result = await db.execute<ReviewView>(sql`
    select
      r.id::text as id,
      r.listing_id::text as "listingId",
      r.user_id::text as "userId",
      r.booking_id::text as "bookingId",
      r.rating,
      r.sub_ratings as "subRatings",
      r.body,
      r.verified_stay as "verifiedStay",
      r.owner_response as "ownerResponse",
      r.owner_responded_at as "ownerRespondedAt",
      r.status,
      coalesce(
        (
          select json_agg(
            json_build_object(
              'id', rm.id::text,
              'url', rm.url,
              'caption', rm.caption,
              'createdAt', rm.created_at
            )
            order by rm.created_at asc
          )
          from review_media rm
          where rm.review_id = r.id and rm.moderated = true
        ),
        '[]'::json
      ) as photos,
      r.created_at as "createdAt"
    from reviews r
    where r.listing_id = ${uuidSchema.parse(listingId)}::uuid
      and r.status = 'published'::review_status
    order by r.created_at desc
  `);
  return result.rows;
}

type CommunityReview = Pick<
  ReviewView,
  | "id"
  | "rating"
  | "body"
  | "verifiedStay"
  | "ownerResponse"
  | "photos"
  | "createdAt"
> & { userName: string };

type CommunityQuestion = Pick<
  QuestionView,
  "id" | "body" | "answer" | "createdAt"
> & { userName: string };

export async function getListingCommunity(listingId: string) {
  const parsedListingId = uuidSchema.parse(listingId);
  const [reviewResult, questionResult] = await Promise.all([
    db.execute<CommunityReview>(sql`
      select
        r.id::text as id,
        coalesce(u.name, 'Registered guest') as "userName",
        r.rating,
        r.body,
        r.verified_stay as "verifiedStay",
        r.owner_response as "ownerResponse",
        coalesce(
          (
            select json_agg(
              json_build_object(
                'id', rm.id::text,
                'url', rm.url,
                'caption', rm.caption,
                'createdAt', rm.created_at
              )
              order by rm.created_at asc
            )
            from review_media rm
            where rm.review_id = r.id and rm.moderated = true
          ),
          '[]'::json
        ) as photos,
        r.created_at as "createdAt"
      from reviews r
      join users u on u.id = r.user_id
      where r.listing_id = ${parsedListingId}::uuid
        and r.status = 'published'::review_status
      order by r.created_at desc
    `),
    db.execute<CommunityQuestion>(sql`
      select
        q.id::text as id,
        coalesce(u.name, 'Registered guest') as "userName",
        q.body,
        q.answer,
        q.created_at as "createdAt"
      from questions q
      join users u on u.id = q.user_id
      where q.listing_id = ${parsedListingId}::uuid
      order by q.created_at desc
    `),
  ]);
  const display = await getCrowdDisplay(parsedListingId);
  const level = display.level ?? "unknown";
  return {
    reviews: reviewResult.rows,
    questions: questionResult.rows,
    crowd: {
      level,
      source: display.sourceLabel ?? "No current crowd report",
      label: level.charAt(0).toUpperCase() + level.slice(1),
    },
  };
}

async function recomputeListingRating(executor: Executor, listingId: string) {
  await executor.execute(sql`
    update listings l
    set rating_avg = coalesce(
          (
            select round(avg(r.rating)::numeric, 2)
            from reviews r
            where r.listing_id = l.id
              and r.status = 'published'::review_status
          ),
          0
        ),
        rating_count = (
          select count(*)::integer
          from reviews r
          where r.listing_id = l.id
            and r.status = 'published'::review_status
        ),
        updated_at = now()
    where l.id = ${uuidSchema.parse(listingId)}::uuid
  `);
}

export async function createReview(input: unknown, actorId: string) {
  const parsed = reviewInputSchema.parse(input);
  const userId = parsedActorId(actorId);

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`
      select pg_advisory_xact_lock(hashtext(${`review-limit:${userId}`}))
    `);

    const listingResult = await tx.execute<{
      id: string;
      ownerId: string | null;
    }>(sql`
      select l.id::text as id, b.owner_id::text as "ownerId"
      from listings l
      left join businesses b on b.id = l.business_id
      where l.id = ${parsed.listingId}::uuid
      limit 1
    `);
    const listing = listingResult.rows[0];
    if (!listing) throw new Error("Listing not found.");
    if (listing.ownerId === userId) {
      throw new AuthorizationError("You cannot review your own listing.");
    }

    const dailyCount = await tx.execute<{ count: number }>(sql`
      select count(*)::integer as count
      from reviews
      where user_id = ${userId}::uuid
        and created_at >= current_date
    `);
    if (Number(dailyCount.rows[0]?.count ?? 0) >= 3) {
      throw new Error("The daily review limit is three reviews.");
    }

    let verifiedStay = false;
    if (parsed.bookingId) {
      const bookingResult = await tx.execute<{
        listingId: string;
        status: string;
      }>(sql`
        select b.listing_id::text as "listingId", b.status
        from bookings b
        where b.id = ${parsed.bookingId}::uuid
          and b.user_id = ${userId}::uuid
        limit 1
      `);
      const booking = bookingResult.rows[0];
      if (!booking || booking.listingId !== parsed.listingId) {
        throw new AuthorizationError("Booking access required.");
      }
      if (booking.status !== "completed") {
        throw new Error(
          "Only completed bookings can receive a verified review.",
        );
      }

      const existingBookingReview = await tx.execute<{ id: string }>(sql`
        select id::text
        from reviews
        where booking_id = ${parsed.bookingId}::uuid
        limit 1
      `);
      if (existingBookingReview.rows[0]) {
        throw new Error("This completed booking already has a review.");
      }
      verifiedStay = true;
    }

    const fraudResult = await tx.execute<{
      isDuplicate: boolean;
      maxSimilarity: number;
    }>(sql`
      select
        exists(
          select 1
          from reviews prior
          where prior.listing_id = ${parsed.listingId}::uuid
            and prior.status <> 'removed'::review_status
            and lower(trim(prior.body)) = lower(trim(${parsed.body}))
        ) as "isDuplicate",
        coalesce(
          max(similarity(lower(prior.body), lower(${parsed.body}))),
          0
        )::float8 as "maxSimilarity"
      from reviews prior
      where prior.listing_id = ${parsed.listingId}::uuid
        and prior.status <> 'removed'::review_status
    `);
    const fraud = fraudResult.rows[0];
    const reasons: string[] = [];
    if (fraud?.isDuplicate) reasons.push("duplicate review text");
    if (Number(fraud?.maxSimilarity ?? 0) >= 0.8) {
      reasons.push("review text is highly similar to an existing review");
    }

    const accountResult = await tx.execute<{ isNew: boolean }>(sql`
      select created_at > now() - interval '7 days' as "isNew"
      from users
      where id = ${userId}::uuid
      limit 1
    `);
    if (!accountResult.rows[0]) throw new AuthorizationError("User not found.");
    if (accountResult.rows[0].isNew) reasons.push("new account review hold");

    const status = reasons.length > 0 ? "flagged" : "published";
    const inserted = await tx.execute<{ id: string }>(sql`
      insert into reviews (
        listing_id, user_id, booking_id, rating, sub_ratings, body,
        verified_stay, status
      ) values (
        ${parsed.listingId}::uuid,
        ${userId}::uuid,
        ${parsed.bookingId ?? null}::uuid,
        ${parsed.rating},
        ${JSON.stringify(parsed.subRatings)}::jsonb,
        ${parsed.body},
        ${verifiedStay},
        ${status}::review_status
      )
      returning id::text
    `);
    const reviewId = inserted.rows[0]?.id;
    if (!reviewId) throw new Error("Review could not be created.");

    if (reasons.length > 0) {
      await tx.execute(sql`
        insert into moderation_queue (type, reference_id, reason)
        values (
          'review'::moderation_type,
          ${reviewId}::uuid,
          ${reasons.join("; ")}
        )
      `);
    } else {
      await recomputeListingRating(tx, parsed.listingId);
    }

    return {
      review: (await reviewSelect(tx, reviewId)).rows[0] ?? null,
      flagged: reasons.length > 0,
      reasons,
    };
  });
  if (!result.flagged) {
    const owner = await db.execute<{ id: string }>(sql`
      select b.owner_id::text as id
      from listings l join businesses b on b.id = l.business_id
      where l.id = ${parsed.listingId}::uuid limit 1
    `);
    if (owner.rows[0]?.id) {
      await dispatchEvent({
        userId: owner.rows[0].id,
        event: "review.published",
        data: {
          title: "New review received",
          body: "A guest published a review for your listing.",
          listingId: parsed.listingId,
          reviewId: result.review?.id ?? "",
        },
      });
    }
  }
  return result;
}

export async function createReviewPhoto(input: unknown, actorId: string) {
  const parsed = reviewPhotoInputSchema.parse(input);
  const userId = parsedActorId(actorId);

  return db.transaction(async (tx) => {
    const reviewResult = await tx.execute<{
      id: string;
      authorId: string;
      status: ReviewStatus;
    }>(sql`
      select
        r.id::text as id,
        r.user_id::text as "authorId",
        r.status
      from reviews r
      where r.id = ${parsed.reviewId}::uuid
      for update
    `);
    const review = reviewResult.rows[0];
    if (!review) throw new Error("Review not found.");
    if (review.authorId !== userId) {
      throw new AuthorizationError("Review access required.");
    }
    if (review.status === "removed") {
      throw new Error("Removed reviews cannot receive photos.");
    }

    const countResult = await tx.execute<{ count: number }>(sql`
      select count(*)::integer as count
      from review_media
      where review_id = ${parsed.reviewId}::uuid
    `);
    if (Number(countResult.rows[0]?.count ?? 0) >= 5) {
      throw new Error("A review can have at most five photos.");
    }

    const inserted = await tx.execute<{ id: string }>(sql`
      insert into review_media (
        review_id, url, caption, uploaded_by, moderated
      ) values (
        ${parsed.reviewId}::uuid,
        ${parsed.url},
        ${parsed.caption ?? null},
        ${userId}::uuid,
        false
      )
      returning id::text
    `);
    const mediaId = inserted.rows[0]?.id;
    if (!mediaId) throw new Error("Review photo could not be saved.");

    await tx.execute(sql`
      insert into moderation_queue (
        type, reference_id, reason, payload
      ) values (
        'photo'::moderation_type,
        ${mediaId}::uuid,
        'Review photo submitted for moderation',
        ${JSON.stringify({
          mediaKind: "review",
          reviewId: parsed.reviewId,
          uploadedBy: userId,
          fileName: parsed.fileName,
          contentType: parsed.contentType,
          sizeBytes: parsed.sizeBytes,
        })}::jsonb
      )
    `);

    const result = await tx.execute<ReviewPhotoView>(sql`
      select
        rm.id::text as id,
        rm.url,
        rm.caption,
        rm.created_at as "createdAt"
      from review_media rm
      where rm.id = ${mediaId}::uuid
      limit 1
    `);
    return result.rows[0] ?? null;
  });
}

export async function reportReviewPhoto(
  mediaId: string,
  input: unknown,
  actorId: string,
) {
  const parsedMediaId = uuidSchema.parse(mediaId);
  const parsed = reviewPhotoReportSchema.parse(input);
  const userId = parsedActorId(actorId);

  return db.transaction(async (tx) => {
    const mediaResult = await tx.execute<{ id: string; reviewId: string }>(sql`
      select id::text, review_id::text as "reviewId"
      from review_media
      where id = ${parsedMediaId}::uuid
      for update
    `);
    const media = mediaResult.rows[0];
    if (!media) throw new Error("Review photo not found.");

    await tx.execute(sql`
      update review_media
      set moderated = false
      where id = ${parsedMediaId}::uuid
    `);
    await tx.execute(sql`
      insert into moderation_queue (type, reference_id, reason, payload)
      select
        'photo'::moderation_type,
        ${parsedMediaId}::uuid,
        ${`User report by ${userId}: ${parsed.reason}`},
        ${JSON.stringify({
          mediaKind: "review",
          reviewId: media.reviewId,
          reportedBy: userId,
        })}::jsonb
      where not exists (
        select 1
        from moderation_queue
        where type = 'photo'::moderation_type
          and reference_id = ${parsedMediaId}::uuid
          and status = 'pending'::moderation_status
      )
    `);

    return {
      mediaId: media.id,
      reviewId: media.reviewId,
      queued: true,
    };
  });
}

export async function respondToReview(
  reviewId: string,
  input: unknown,
  actorId: string,
) {
  const parsedReviewId = uuidSchema.parse(reviewId);
  const parsed = reviewResponseSchema.parse(input);
  const userId = parsedActorId(actorId);

  const response = await db.transaction(async (tx) => {
    const reviewResult = await tx.execute<{
      id: string;
      listingId: string;
      ownerId: string | null;
      ownerResponse: string | null;
    }>(sql`
      select
        r.id::text as id,
        r.listing_id::text as "listingId",
        b.owner_id::text as "ownerId",
        r.owner_response as "ownerResponse"
      from reviews r
      join listings l on l.id = r.listing_id
      left join businesses b on b.id = l.business_id
      where r.id = ${parsedReviewId}::uuid
      for update of r
    `);
    const review = reviewResult.rows[0];
    if (!review) throw new Error("Review not found.");
    if (review.ownerId !== userId) {
      throw new AuthorizationError("Owner access required.");
    }
    if (review.ownerResponse !== null) {
      throw new Error("This review already has an owner response.");
    }

    await tx.execute(sql`
      update reviews
      set owner_response = ${parsed.response}, owner_responded_at = now()
      where id = ${parsedReviewId}::uuid and owner_response is null
    `);
    return (await reviewSelect(tx, parsedReviewId)).rows[0] ?? null;
  });
  const author = await db.execute<{ userId: string }>(sql`
    select user_id::text as "userId" from reviews where id = ${parsedReviewId}::uuid limit 1
  `);
  if (response && author.rows[0]?.userId) {
    await dispatchEvent({
      userId: author.rows[0].userId,
      event: "review.response",
      data: {
        title: "Business responded to your review",
        body: "The listing owner added a response to your review.",
        reviewId: parsedReviewId,
      },
    });
  }
  return response;
}

export async function createQuestion(input: unknown, actorId: string) {
  const parsed = questionInputSchema.parse(input);
  const userId = parsedActorId(actorId);

  const listingResult = await db.execute<{ id: string }>(sql`
    select id::text
    from listings
    where id = ${parsed.listingId}::uuid
    limit 1
  `);
  if (!listingResult.rows[0]) throw new Error("Listing not found.");

  const inserted = await db.execute<{ id: string }>(sql`
    insert into questions (listing_id, user_id, body)
    values (${parsed.listingId}::uuid, ${userId}::uuid, ${parsed.body})
    returning id::text
  `);
  const questionId = inserted.rows[0]?.id;
  if (!questionId) throw new Error("Question could not be created.");
  return getQuestion(questionId);
}

export async function getQuestion(questionId: string) {
  const result = await db.execute<QuestionView>(sql`
    select
      q.id::text as id,
      q.listing_id::text as "listingId",
      q.user_id::text as "userId",
      q.body,
      q.answer,
      q.answered_by::text as "answeredBy",
      q.answered_at as "answeredAt",
      q.created_at as "createdAt"
    from questions q
    where q.id = ${uuidSchema.parse(questionId)}::uuid
    limit 1
  `);
  return result.rows[0] ?? null;
}

export async function listQuestions(listingId: string) {
  const result = await db.execute<QuestionView>(sql`
    select
      q.id::text as id,
      q.listing_id::text as "listingId",
      q.user_id::text as "userId",
      q.body,
      q.answer,
      q.answered_by::text as "answeredBy",
      q.answered_at as "answeredAt",
      q.created_at as "createdAt"
    from questions q
    where q.listing_id = ${uuidSchema.parse(listingId)}::uuid
    order by q.created_at desc
  `);
  return result.rows;
}

export async function answerQuestion(
  questionId: string,
  input: unknown,
  actorId: string,
) {
  const parsedQuestionId = uuidSchema.parse(questionId);
  const parsed = answerInputSchema.parse(input);
  const userId = parsedActorId(actorId);

  return db.transaction(async (tx) => {
    const questionResult = await tx.execute<{
      id: string;
      answer: string | null;
    }>(sql`
      select id::text, answer
      from questions
      where id = ${parsedQuestionId}::uuid
      for update
    `);
    const question = questionResult.rows[0];
    if (!question) throw new Error("Question not found.");
    if (question.answer !== null)
      throw new Error("This question already has an answer.");

    await tx.execute(sql`
      update questions
      set answer = ${parsed.answer}, answered_by = ${userId}::uuid, answered_at = now()
      where id = ${parsedQuestionId}::uuid and answer is null
    `);
    const result = await tx.execute<QuestionView>(sql`
      select
        q.id::text as id,
        q.listing_id::text as "listingId",
        q.user_id::text as "userId",
        q.body,
        q.answer,
        q.answered_by::text as "answeredBy",
        q.answered_at as "answeredAt",
        q.created_at as "createdAt"
      from questions q
      where q.id = ${parsedQuestionId}::uuid
      limit 1
    `);
    return result.rows[0] ?? null;
  });
}

async function enforceCrowdDailyLimit(executor: Executor, actorId: string) {
  await executor.execute(sql`
    select pg_advisory_xact_lock(hashtext(${`crowd-limit:${actorId}`}))
  `);
  const result = await executor.execute<{ count: number }>(sql`
    select count(*)::integer as count
    from crowd_reports
    where user_id = ${actorId}::uuid
      and created_at >= current_date
  `);
  if (Number(result.rows[0]?.count ?? 0) >= 10) {
    throw new Error("The daily crowd report limit is ten reports.");
  }
}

export async function createCrowdReport(input: unknown, actorId: string) {
  const parsed = crowdReportInputSchema.parse(input);
  const userId = parsedActorId(actorId);

  return db.transaction(async (tx) => {
    await enforceCrowdDailyLimit(tx, userId);

    const listingResult = await tx.execute<{
      id: string;
      ownerId: string | null;
    }>(sql`
      select l.id::text as id, b.owner_id::text as "ownerId"
      from listings l
      left join businesses b on b.id = l.business_id
      where l.id = ${parsed.listingId}::uuid
      limit 1
    `);
    const listing = listingResult.rows[0];
    if (!listing) throw new Error("Listing not found.");

    if (parsed.source === "business") {
      if (listing.ownerId !== userId)
        throw new AuthorizationError("Owner access required.");
    } else {
      const proximityResult = await tx.execute<{ withinRange: boolean }>(sql`
        select exists(
          select 1
          from listings l
          where l.id = ${parsed.listingId}::uuid
            and l.location is not null
            and ST_DWithin(
              l.location,
              ST_SetSRID(ST_MakePoint(${parsed.lng}, ${parsed.lat}), 4326)::geography,
              500
            )
        ) as "withinRange"
      `);
      if (!proximityResult.rows[0]?.withinRange) {
        throw new Error(
          "You must be within 500 meters of the listing to report crowd levels.",
        );
      }
    }

    const inserted = await tx.execute<{ id: string }>(sql`
      insert into crowd_reports (
        listing_id, user_id, source, level, reporter_location, expires_at
      ) values (
        ${parsed.listingId}::uuid,
        ${userId}::uuid,
        ${parsed.source}::crowd_source,
        ${parsed.level}::crowd_level,
        ${
          parsed.lat !== undefined && parsed.lng !== undefined
            ? sql`ST_SetSRID(ST_MakePoint(${parsed.lng}, ${parsed.lat}), 4326)::geography`
            : sql`null`
        },
        case
          when ${parsed.source}::crowd_source = 'business'::crowd_source
            then now() + interval '12 hours'
          else now() + interval '4 hours'
        end
      )
      returning id::text
    `);
    const reportId = inserted.rows[0]?.id;
    if (!reportId) throw new Error("Crowd report could not be created.");

    if (parsed.source === "business") {
      const sourceLabel = "reported by the business; expires in 12 hours";
      await tx.execute(sql`
        update listings
        set attributes = jsonb_set(
          jsonb_set(attributes, '{crowd_level}', to_jsonb(${parsed.level}::text), true),
          '{crowd_source}', to_jsonb(${sourceLabel}::text), true
        ), updated_at = now()
        where id = ${parsed.listingId}::uuid
      `);
    }

    return {
      reportId,
      source: parsed.source,
      level: parsed.level,
      display: await getCrowdDisplay(parsed.listingId, undefined, tx),
    };
  });
}

export async function getCrowdDisplay(
  listingId: string,
  heuristic?: { level?: CrowdLevel; source?: string },
  executor: Executor = db,
): Promise<CrowdDisplay> {
  const parsedListingId = uuidSchema.parse(listingId);
  const businessResult = await executor.execute<{
    level: CrowdLevel;
    expiresAt: Date;
  }>(sql`
    select cr.level, cr.expires_at as "expiresAt"
    from crowd_reports cr
    where cr.listing_id = ${parsedListingId}::uuid
      and cr.source = 'business'::crowd_source
      and cr.expires_at > now()
    order by cr.created_at desc
    limit 1
  `);
  const business = businessResult.rows[0];
  if (business) {
    return {
      level: business.level,
      source: "business",
      sourceLabel: "Reported by the business; expires in 12 hours",
      reportCount: 1,
      expiresAt: business.expiresAt,
    };
  }

  const communityResult = await executor.execute<{
    level: CrowdLevel;
    count: number;
  }>(sql`
    select cr.level, count(*)::integer as count
    from crowd_reports cr
    where cr.listing_id = ${parsedListingId}::uuid
      and cr.source = 'community'::crowd_source
      and cr.created_at >= now() - interval '4 hours'
      and (cr.expires_at is null or cr.expires_at > now())
    group by cr.level
    order by count(*) desc, max(cr.created_at) desc
  `);
  const communityCount = communityResult.rows.reduce(
    (total, row) => total + Number(row.count),
    0,
  );
  const communityLevel = communityResult.rows[0];
  if (communityLevel && communityCount >= 3) {
    return {
      level: communityLevel.level,
      source: "community",
      sourceLabel: `${communityCount} visitors reported this in the last 4 hours`,
      reportCount: communityCount,
      expiresAt: null,
    };
  }

  const listingResult = await executor.execute<{
    level: string | null;
    source: string | null;
  }>(sql`
    select
      nullif(l.attributes ->> 'crowd_level', '') as level,
      nullif(l.attributes ->> 'crowd_source', '') as source
    from listings l
    where l.id = ${parsedListingId}::uuid
    limit 1
  `);
  const fallback = listingResult.rows[0];
  const fallbackIsBusiness = fallback?.source
    ?.toLowerCase()
    .includes("business");
  const fallbackLevel =
    !fallbackIsBusiness &&
    crowdLevels.includes((fallback?.level ?? "") as CrowdLevel)
      ? (fallback?.level as CrowdLevel)
      : undefined;
  const level = heuristic?.level ?? fallbackLevel ?? null;
  const source =
    heuristic?.source ?? (fallbackIsBusiness ? null : fallback?.source) ?? null;
  return {
    level,
    source: level ? "heuristic" : null,
    sourceLabel: level ? (source ?? "Typical local patterns") : null,
    reportCount: 0,
    expiresAt: null,
  };
}

export const submitReview = createReview;
export const submitReviewPhoto = createReviewPhoto;
export const addReviewResponse = respondToReview;
export const submitQuestion = createQuestion;
export const addQuestionAnswer = answerQuestion;
export const submitCrowdReport = createCrowdReport;
export const getListingCrowdDisplay = getCrowdDisplay;

export function setBusinessCrowd(
  input: Omit<CrowdReportInput, "source">,
  actorId: string,
) {
  return createCrowdReport({ ...input, source: "business" }, actorId);
}

export function submitCommunityCrowd(
  input: Omit<CrowdReportInput, "source">,
  actorId: string,
) {
  return createCrowdReport({ ...input, source: "community" }, actorId);
}
