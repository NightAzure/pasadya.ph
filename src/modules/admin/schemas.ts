import { z } from "zod";

import { moderationTypes } from "./types";

export const moderationListQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  type: z.enum(moderationTypes).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const listingModerationActions = [
  "keep",
  "unpublish",
  "archive",
  "edit",
] as const;

const listingEditableFieldsSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  category: z
    .enum(["resort", "room", "restaurant", "activity", "service"])
    .optional(),
  description: z.string().trim().max(3000).nullable().optional(),
  address: z.record(z.string(), z.unknown()).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  priceMin: z.coerce
    .number()
    .int()
    .min(0)
    .max(10_000_000)
    .nullable()
    .optional(),
  priceMax: z.coerce
    .number()
    .int()
    .min(0)
    .max(10_000_000)
    .nullable()
    .optional(),
  bookingMode: z.enum(["inquiry", "instant", "none"]).optional(),
  cancellationPolicy: z.enum(["flexible", "moderate", "strict"]).optional(),
  downpaymentPct: z.coerce.number().int().min(0).max(100).optional(),
  contactPhone: z.string().trim().max(24).nullable().optional(),
  contactFacebook: z.string().trim().max(240).nullable().optional(),
  contactWebsite: z.string().trim().max(240).nullable().optional(),
});

export const adminListingEditChangesSchema = listingEditableFieldsSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one listing edit is required.",
  });

export const moderationResolutionSchema = z
  .object({
    decision: z.enum(["approve", "reject"]).optional(),
    action: z.enum(["approve", "reject"]).optional(),
    notes: z.string().trim().max(2000).optional(),
    reviewerNotes: z.string().trim().max(2000).optional(),
    listingAction: z.enum(listingModerationActions).optional(),
    listingChanges: adminListingEditChangesSchema.optional(),
    changes: adminListingEditChangesSchema.optional(),
  })
  .superRefine((input, context) => {
    const decision = input.decision ?? input.action;
    if (!decision) {
      context.addIssue({
        code: "custom",
        path: ["decision"],
        message: "A moderation decision is required.",
      });
    }

    if (
      decision === "reject" &&
      !(input.notes ?? input.reviewerNotes ?? "").trim()
    ) {
      context.addIssue({
        code: "custom",
        path: ["notes"],
        message: "Rejection notes are required.",
      });
    }

    if (
      decision === "approve" &&
      ["unpublish", "archive", "edit"].includes(input.listingAction ?? "") &&
      !(input.notes ?? input.reviewerNotes ?? "").trim()
    ) {
      context.addIssue({
        code: "custom",
        path: ["notes"],
        message: "Notes are required for a listing action.",
      });
    }
  })
  .transform((input) => ({
    decision: (input.decision ?? input.action)!,
    notes: (input.notes ?? input.reviewerNotes ?? "").trim(),
    listingAction: input.listingAction,
    listingChanges: input.listingChanges ?? input.changes,
  }));

export const adminListingsQuerySchema = z.object({
  status: z
    .enum(["draft", "published", "closed", "archived"])
    .default("published"),
  q: z.string().trim().max(160).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const adminListingUpdateSchema = listingEditableFieldsSchema
  .extend({
    status: z.enum(["draft", "published", "closed", "archived"]).optional(),
    action: z.enum(["publish", "unpublish"]).optional(),
    published: z.boolean().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one listing field is required.",
  });

export const adminListingCreateSchema = listingEditableFieldsSchema
  .extend({
    name: z.string().trim().min(2).max(160),
    category: z.enum(["resort", "room", "restaurant", "activity", "service"]),
    status: z
      .enum(["draft", "published", "closed", "archived"])
      .default("draft"),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine(
    (input) =>
      (input.latitude === undefined && input.longitude === undefined) ||
      (input.latitude !== undefined && input.longitude !== undefined),
    { message: "Latitude and longitude must be provided together." },
  );

export const adminListingMergeSchema = z.object({
  sourceListingId: z.string().uuid(),
  targetListingId: z.string().uuid(),
  notes: z.string().trim().min(3).max(2000),
  archiveSource: z.boolean().default(true),
});

export const adminBookingActionSchema = z
  .object({
    action: z.enum(["cancel", "refund", "dispute_note"]),
    reason: z.string().trim().min(3).max(2000),
    refundAmount: z.coerce.number().int().positive().optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .superRefine((input, context) => {
    if (input.action === "refund" && input.refundAmount === undefined) {
      // Optional: defaults to remaining refundable amount in the service.
    }
    if (
      input.action === "dispute_note" &&
      !(input.note ?? input.reason).trim()
    ) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "A dispute note is required.",
      });
    }
  });

export const adminBookingListQuerySchema = z.object({
  status: z.string().trim().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
