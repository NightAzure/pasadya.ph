import { NextResponse } from "next/server";
import { z } from "zod";

import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { AuthorizationError } from "@/lib/rbac";
import { getPortalActor } from "@/modules/portal/service";
import { uuidSchema } from "@/lib/validation";

const reportSchema = z.object({ reason: z.string().trim().min(3).max(500) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  try {
    const actor = await getPortalActor();
    const { reviewId } = await params;
    const parsedReviewId = uuidSchema.parse(reviewId);
    const parsed = reportSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json(
        {
          error: "Report details are not valid.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );

    const review = await db.execute<{ id: string }>(sql`
      select id::text
      from reviews
      where id = ${parsedReviewId}::uuid
      limit 1
    `);
    if (!review.rows[0])
      return NextResponse.json({ error: "Review not found." }, { status: 404 });

    await db.transaction(async (tx) => {
      const flagged = await tx.execute<{ listingId: string }>(sql`
        update reviews
        set status = 'flagged'::review_status
        where id = ${parsedReviewId}::uuid
          and status = 'published'::review_status
        returning listing_id::text as "listingId"
      `);
      const listingId = flagged.rows[0]?.listingId;
      if (listingId) {
        await tx.execute(sql`
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
          where l.id = ${listingId}::uuid
        `);
      }
      await tx.execute(sql`
        insert into moderation_queue (type, reference_id, reason)
        select 'review'::moderation_type, ${parsedReviewId}::uuid, ${`User report by ${actor.id}: ${parsed.data.reason}`}
        where not exists (
          select 1 from moderation_queue
          where type = 'review'::moderation_type
            and reference_id = ${parsedReviewId}::uuid
            and status = 'pending'::moderation_status
        )
      `);
    });
    return NextResponse.json(
      { ok: true, message: "Thanks. The review was sent for moderation." },
      { status: 201 },
    );
  } catch (error) {
    const status =
      error instanceof AuthorizationError
        ? 403
        : error instanceof z.ZodError
          ? 400
          : 400;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Review report could not be saved.",
      },
      { status },
    );
  }
}
