"use client";

import Image from "next/image";
import { useState } from "react";
import { HelpCircle, MapPin, MessageSquare, Star } from "lucide-react";

import { Button } from "@/components/ui/button";

type Review = {
  id: string;
  userName: string;
  rating: number;
  body: string;
  verifiedStay: boolean;
  ownerResponse: string | null;
  photos: {
    id: string;
    url: string;
    caption: string | null;
  }[];
  createdAt: string;
};
type Question = {
  id: string;
  body: string;
  answer: string | null;
  userName: string;
  createdAt: string;
};
type Crowd = { level: string; source: string; label: string };

export function CommunityPanel({
  listingId,
  reviews,
  questions,
  crowd,
}: {
  listingId: string;
  reviews: Review[];
  questions: Question[];
  crowd: Crowd;
}) {
  const [reviewBody, setReviewBody] = useState("");
  const [reviewPhotoUrl, setReviewPhotoUrl] = useState("");
  const [reviewPhotoFileName, setReviewPhotoFileName] =
    useState("review-photo.jpg");
  const [reviewPhotoContentType, setReviewPhotoContentType] =
    useState("image/jpeg");
  const [reviewPhotoSizeBytes, setReviewPhotoSizeBytes] = useState("100000");
  const [questionBody, setQuestionBody] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(path: string, payload: unknown, success: string) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Please try again.");
      setNotice(success);
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section
        aria-labelledby="community-crowd"
        className="rounded-md border bg-card p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="community-crowd"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <MapPin aria-hidden="true" className="h-5 w-5 text-primary" />
              Crowd right now
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {crowd.label}. Current level:{" "}
              <span className="font-semibold text-foreground">
                {crowd.level}
              </span>
              .
            </p>
          </div>
          <div
            className="flex gap-2"
            role="group"
            aria-label="Report crowd level"
          >
            {(["quiet", "moderate", "busy", "full"] as const).map((level) => (
              <button
                key={level}
                className="min-h-11 rounded-md border px-3 text-sm capitalize hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={busy}
                onClick={() =>
                  void submit(
                    "/api/crowd",
                    { listingId, source: "community", level },
                    "Thanks — your nearby report was recorded.",
                  )
                }
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="reviews-title" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="reviews-title"
            className="flex items-center gap-2 text-xl font-semibold"
          >
            <MessageSquare
              aria-hidden="true"
              className="h-5 w-5 text-primary"
            />
            Reviews
          </h2>
          <span className="text-sm text-muted-foreground">
            {reviews.length} shown
          </span>
        </div>
        {reviews.length === 0 ? (
          <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
            No published reviews yet. Be the first registered guest to share a
            useful stay note.
          </div>
        ) : (
          <div className="grid gap-3">
            {reviews.map((review) => (
              <article
                className="rounded-md border bg-card p-4 shadow-sm"
                key={review.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{review.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString("en-PH")}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold">
                    <Star
                      aria-hidden="true"
                      className="h-4 w-4 fill-accent text-accent"
                    />
                    {review.rating}/5
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.verifiedStay ? (
                    <span className="rounded-sm border border-success/30 bg-success/10 px-2 py-1 text-xs font-medium text-foreground">
                      Verified stay
                    </span>
                  ) : (
                    <span className="rounded-sm border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      Unverified review
                    </span>
                  )}
                </div>
                <p className="mt-3 leading-6 text-muted-foreground">
                  {review.body}
                </p>
                {review.photos.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {review.photos.map((photo) => (
                      <figure key={photo.id}>
                        <a href={photo.url} rel="noreferrer" target="_blank">
                          <Image
                            alt={photo.caption || "Guest review photo"}
                            className="aspect-[4/3] h-auto w-full rounded-md border object-cover"
                            height={240}
                            src={photo.url}
                            unoptimized
                            width={320}
                          />
                        </a>
                        {photo.caption ? (
                          <figcaption className="mt-1 text-xs text-muted-foreground">
                            {photo.caption}
                          </figcaption>
                        ) : null}
                        <button
                          className="mt-1 min-h-8 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                          onClick={() => {
                            const reason = window.prompt(
                              "Why should this photo be reviewed?",
                            );
                            if (reason?.trim()) {
                              void submit(
                                `/api/review-photos/${photo.id}/report`,
                                { reason },
                                "Thanks. The photo was sent for moderation.",
                              );
                            }
                          }}
                          type="button"
                        >
                          Report photo
                        </button>
                      </figure>
                    ))}
                  </div>
                ) : null}
                {review.ownerResponse ? (
                  <div className="mt-3 rounded-md bg-muted/60 p-3 text-sm">
                    <p className="font-semibold">Owner response</p>
                    <p className="mt-1 text-muted-foreground">
                      {review.ownerResponse}
                    </p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
        <form
          className="rounded-md border bg-card p-4 shadow-sm"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setNotice("");
            try {
              const reviewResponse = await fetch("/api/reviews", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  listingId,
                  rating: 5,
                  body: reviewBody,
                }),
              });
              const reviewData = (await reviewResponse
                .json()
                .catch(() => ({}))) as {
                error?: string;
                review?: { id?: string };
              };
              if (!reviewResponse.ok) {
                throw new Error(reviewData.error ?? "Please try again.");
              }

              let message =
                "Review submitted. New accounts and suspicious text are held for review.";
              if (reviewPhotoUrl.trim()) {
                const reviewId = reviewData.review?.id;
                if (!reviewId) {
                  throw new Error(
                    "The review was saved, but its photo could not be queued.",
                  );
                }
                const photoResponse = await fetch(
                  `/api/reviews/${reviewId}/photos`,
                  {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      url: reviewPhotoUrl,
                      fileName: reviewPhotoFileName,
                      contentType: reviewPhotoContentType,
                      sizeBytes: reviewPhotoSizeBytes,
                    }),
                  },
                );
                const photoData = (await photoResponse
                  .json()
                  .catch(() => ({}))) as { error?: string };
                if (!photoResponse.ok) {
                  throw new Error(
                    photoData.error ?? "The review photo could not be queued.",
                  );
                }
                message += " The photo was sent for moderation.";
              }
              setNotice(message);
              setReviewBody("");
              setReviewPhotoUrl("");
            } catch (error) {
              setNotice(
                error instanceof Error ? error.message : "Please try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="text-sm font-semibold" htmlFor="review-body">
            Share your experience
          </label>
          <textarea
            className="mt-2 min-h-24 w-full rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="review-body"
            minLength={10}
            maxLength={2000}
            onChange={(event) => setReviewBody(event.target.value)}
            placeholder="What should another traveler know?"
            required
            value={reviewBody}
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold sm:col-span-2">
              Optional photo URL
              <input
                className="mt-2 min-h-11 w-full rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => setReviewPhotoUrl(event.target.value)}
                placeholder="https://... or /uploads/..."
                type="text"
                value={reviewPhotoUrl}
              />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Use the signed upload URL from the storage flow. Photos are
                hidden until approved.
              </span>
            </label>
            <label className="text-sm font-semibold">
              File name
              <input
                className="mt-2 min-h-11 w-full rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => setReviewPhotoFileName(event.target.value)}
                type="text"
                value={reviewPhotoFileName}
              />
            </label>
            <label className="text-sm font-semibold">
              Size in bytes
              <input
                className="mt-2 min-h-11 w-full rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                min={1}
                max={10000000}
                onChange={(event) =>
                  setReviewPhotoSizeBytes(event.target.value)
                }
                type="number"
                value={reviewPhotoSizeBytes}
              />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Content type
              <select
                className="mt-2 min-h-11 w-full rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setReviewPhotoContentType(event.target.value)
                }
                value={reviewPhotoContentType}
              >
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG</option>
                <option value="image/webp">WebP</option>
              </select>
            </label>
          </div>
          <Button
            className="mt-3 w-full sm:w-auto"
            disabled={busy || reviewBody.trim().length < 10}
            type="submit"
          >
            Submit review
          </Button>
        </form>
      </section>

      <section aria-labelledby="questions-title" className="space-y-3">
        <h2
          id="questions-title"
          className="flex items-center gap-2 text-xl font-semibold"
        >
          <HelpCircle aria-hidden="true" className="h-5 w-5 text-primary" />
          Q&amp;A
        </h2>
        {questions.length === 0 ? (
          <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
            No questions yet. Ask something practical about your visit.
          </p>
        ) : (
          <div className="grid gap-3">
            {questions.map((question) => (
              <article
                className="rounded-md border bg-card p-4"
                key={question.id}
              >
                <p className="font-semibold">{question.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Asked by {question.userName}
                </p>
                {question.answer ? (
                  <div className="mt-3 border-l-2 border-primary pl-3 text-sm">
                    <p className="font-semibold">Answer</p>
                    <p className="mt-1 text-muted-foreground">
                      {question.answer}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Waiting for an owner or community answer.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
        <form
          className="rounded-md border bg-card p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await submit(
              "/api/questions",
              { listingId, body: questionBody },
              "Question submitted.",
            );
            if (ok) setQuestionBody("");
          }}
        >
          <label className="text-sm font-semibold" htmlFor="question-body">
            Ask a question
          </label>
          <textarea
            className="mt-2 min-h-20 w-full rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="question-body"
            minLength={5}
            maxLength={800}
            onChange={(event) => setQuestionBody(event.target.value)}
            placeholder="Is corkage allowed? Is the road passable?"
            required
            value={questionBody}
          />
          <Button
            className="mt-3 w-full sm:w-auto"
            disabled={busy || questionBody.trim().length < 5}
            type="submit"
          >
            Ask the community
          </Button>
        </form>
      </section>
      {notice ? (
        <p
          className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm"
          role="status"
        >
          {notice}
        </p>
      ) : null}
    </div>
  );
}
