import { and, desc, eq, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { notifications, users } from "@/db/schema";

export const notificationChannels = ["in_app", "email", "sms"] as const;
export type NotificationChannel = (typeof notificationChannels)[number];

const booleanInputSchema = z.preprocess(
  (value) =>
    typeof value === "string"
      ? ["true", "1", "yes", "on"].includes(value.toLowerCase())
      : value,
  z.boolean(),
);

export const notificationEventTypes = [
  "booking.requested",
  "booking.accepted",
  "booking.declined",
  "booking.confirmed",
  "booking.cancelled",
  "booking.expired",
  "booking.completed",
  "booking.payment_received",
  "booking.payment_failed",
  "booking.reminder",
  "claim.submitted",
  "claim.approved",
  "claim.rejected",
  "review.published",
  "review.response",
  "qa.answered",
  "route_contribution.approved",
  "route_contribution.rejected",
  "route_contribution.submitted",
  // Compatibility names for callers that use event names without separators.
  "booking.created",
  "booking.payment_succeeded",
  "booking.canceled",
  "payment.received",
  "payment.failed",
  "claim.accepted",
] as const;

export type NotificationEventType = (typeof notificationEventTypes)[number];

export const bookingCriticalEvents = [
  "booking.requested",
  "booking.accepted",
  "booking.declined",
  "booking.confirmed",
  "booking.cancelled",
  "booking.expired",
  "booking.payment_received",
  "booking.payment_failed",
  "booking.reminder",
] as const satisfies readonly NotificationEventType[];

const bookingCriticalEventSet = new Set<string>(bookingCriticalEvents);

const eventAliasMap: Record<
  string,
  Exclude<
    NotificationEventType,
    | "booking.created"
    | "booking.payment_succeeded"
    | "booking.canceled"
    | "payment.received"
    | "payment.failed"
    | "claim.accepted"
  >
> = {
  "booking.created": "booking.requested",
  "booking.payment_succeeded": "booking.payment_received",
  "booking.canceled": "booking.cancelled",
  "payment.received": "booking.payment_received",
  "payment.failed": "booking.payment_failed",
  "claim.accepted": "claim.approved",
};

const eventInputSchema = z
  .object({
    userId: z.string().uuid(),
    event: z.enum(notificationEventTypes).optional(),
    type: z.enum(notificationEventTypes).optional(),
    data: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .refine((value) => value.event || value.type, {
    message: "An event is required.",
    path: ["event"],
  });

export type NotifyEventInput = z.infer<typeof eventInputSchema>;

type CanonicalEventType = Exclude<
  NotificationEventType,
  | "booking.created"
  | "booking.payment_succeeded"
  | "booking.canceled"
  | "payment.received"
  | "payment.failed"
  | "claim.accepted"
>;

type EventDefinition = {
  title: string;
  body: string;
  channels: readonly NotificationChannel[];
};

const EVENT_DEFINITIONS: Record<CanonicalEventType, EventDefinition> = {
  "booking.requested": {
    title: "New booking request",
    body: "A booking request needs your attention.",
    channels: ["in_app", "email", "sms"],
  },
  "booking.accepted": {
    title: "Booking accepted",
    body: "Your booking request was accepted. Complete payment if required.",
    channels: ["in_app", "email", "sms"],
  },
  "booking.declined": {
    title: "Booking declined",
    body: "Your booking request was declined.",
    channels: ["in_app", "email", "sms"],
  },
  "booking.confirmed": {
    title: "Booking confirmed",
    body: "Your booking is confirmed.",
    channels: ["in_app", "email", "sms"],
  },
  "booking.cancelled": {
    title: "Booking cancelled",
    body: "A booking was cancelled.",
    channels: ["in_app", "email", "sms"],
  },
  "booking.expired": {
    title: "Booking expired",
    body: "A booking expired before payment was completed.",
    channels: ["in_app", "email", "sms"],
  },
  "booking.completed": {
    title: "Booking completed",
    body: "Your booking has been marked completed.",
    channels: ["in_app", "email"],
  },
  "booking.payment_received": {
    title: "Payment received",
    body: "Payment for your booking was received.",
    channels: ["in_app", "email", "sms"],
  },
  "booking.payment_failed": {
    title: "Payment failed",
    body: "Payment for your booking could not be completed.",
    channels: ["in_app", "email", "sms"],
  },
  "booking.reminder": {
    title: "Booking reminder",
    body: "This is a reminder about your upcoming booking.",
    channels: ["in_app", "email", "sms"],
  },
  "claim.submitted": {
    title: "Claim submitted",
    body: "Your listing claim was submitted for review.",
    channels: ["in_app", "email"],
  },
  "claim.approved": {
    title: "Claim approved",
    body: "Your listing claim was approved.",
    channels: ["in_app", "email"],
  },
  "route_contribution.submitted": {
    title: "Route contribution submitted",
    body: "Your transport route contribution was submitted for review.",
    channels: ["in_app", "email"],
  },
  "claim.rejected": {
    title: "Claim needs attention",
    body: "Your listing claim was not approved.",
    channels: ["in_app", "email"],
  },
  "review.published": {
    title: "Review published",
    body: "A review connected to your listing was published.",
    channels: ["in_app", "email"],
  },
  "review.response": {
    title: "Review response received",
    body: "A business responded to your review.",
    channels: ["in_app", "email"],
  },
  "qa.answered": {
    title: "Question answered",
    body: "A question about a listing received an answer.",
    channels: ["in_app", "email"],
  },
  "route_contribution.approved": {
    title: "Route contribution approved",
    body: "Your transport route contribution was approved.",
    channels: ["in_app", "email"],
  },
  "route_contribution.rejected": {
    title: "Route contribution needs attention",
    body: "Your transport route contribution was not approved.",
    channels: ["in_app", "email"],
  },
};

export const notificationEventMap = EVENT_DEFINITIONS;

export type NotificationRecord = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  channel: NotificationChannel;
  sentAt: Date | null;
  createdAt: Date;
};

export type NotificationDelivery = {
  channel: NotificationChannel;
  status: "sent" | "skipped" | "failed";
  notification: NotificationRecord | null;
  reason?: string;
};

export type DispatchResult = {
  event: CanonicalEventType;
  userId: string;
  deliveries: NotificationDelivery[];
};

export type NotificationMessage = {
  channel: NotificationChannel;
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

export type NotificationAdapter = (
  message: NotificationMessage,
) => Promise<{ sentAt: Date | null }>;

export type NotificationAdapters = Record<
  NotificationChannel,
  NotificationAdapter
>;

/** Development and test adapters only record a simulated delivery timestamp. */
export const developmentNotificationAdapters: NotificationAdapters = {
  in_app: async () => ({ sentAt: new Date() }),
  email: async () => ({ sentAt: new Date() }),
  sms: async () => ({ sentAt: new Date() }),
};

const productionNotificationAdapters: NotificationAdapters = {
  in_app: async () => ({ sentAt: new Date() }),
  email: sendProductionEmail,
  sms: sendProductionSms,
};

export function getNotificationAdapters(): NotificationAdapters {
  return process.env.NODE_ENV === "production"
    ? productionNotificationAdapters
    : developmentNotificationAdapters;
}

export async function dispatchEvent(
  input: unknown,
  adapters: NotificationAdapters = getNotificationAdapters(),
): Promise<DispatchResult> {
  const parsed = eventInputSchema.parse(input);
  const requestedEvent = parsed.event ?? parsed.type;
  if (!requestedEvent) throw new Error("An event is required.");

  const event = (eventAliasMap[requestedEvent] ??
    requestedEvent) as CanonicalEventType;
  const definition = EVENT_DEFINITIONS[event];
  const userResult = await db
    .select({ email: users.email, phone: users.phone })
    .from(users)
    .where(eq(users.id, parsed.userId))
    .limit(1);
  const user = userResult[0];
  if (!user) throw new Error("Notification recipient not found.");

  const data = parsed.data ?? {};
  const title = textFromData(data, "title") ?? definition.title;
  const body = textFromData(data, "body") ?? definition.body;
  const deliveries: NotificationDelivery[] = [];

  // SMS is deliberately controlled by this event map. Callers cannot opt in
  // to SMS for non-critical events by passing arbitrary channel data.
  for (const channel of definition.channels) {
    const destination = destinationFor(channel, user);
    if (!destination) {
      deliveries.push({
        channel,
        status: "skipped",
        notification: null,
        reason: `${channel} recipient address is not available`,
      });
      continue;
    }

    const inserted = await db
      .insert(notifications)
      .values({
        userId: parsed.userId,
        type: event,
        title,
        body,
        data,
        channel,
        read: false,
        sentAt: null,
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      deliveries.push({
        channel,
        status: "failed",
        notification: null,
        reason: "Notification record could not be created",
      });
      continue;
    }

    try {
      const delivery = await adapters[channel]({
        channel,
        to: destination,
        title,
        body,
        data,
      });
      const sentAt = delivery.sentAt ?? null;
      if (sentAt) {
        await db
          .update(notifications)
          .set({ sentAt })
          .where(eq(notifications.id, row.id));
      }
      deliveries.push({
        channel,
        status: sentAt ? "sent" : "failed",
        notification: toNotificationRecord({ ...row, sentAt }),
        reason: sentAt ? undefined : "Adapter did not confirm delivery",
      });
    } catch (error) {
      deliveries.push({
        channel,
        status: "failed",
        notification: toNotificationRecord(row),
        reason: error instanceof Error ? error.message : "Delivery failed",
      });
    }
  }

  return { event, userId: parsed.userId, deliveries };
}

/** Stable domain-facing alias for future booking, claim, and review modules. */
export const notifyEvent = dispatchEvent;

export const notificationListInputSchema = z.object({
  userId: z.string().uuid(),
  unreadOnly: booleanInputSchema.default(false),
  channel: z.enum(notificationChannels).default("in_app"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function listNotifications(input: unknown) {
  const parsed = notificationListInputSchema.parse(input);
  const rows = await db
    .select()
    .from(notifications)
    .where(
      parsed.unreadOnly
        ? and(
            eq(notifications.userId, parsed.userId),
            eq(notifications.read, false),
            eq(notifications.channel, parsed.channel),
          )
        : and(
            eq(notifications.userId, parsed.userId),
            eq(notifications.channel, parsed.channel),
          ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(parsed.limit)
    .offset(parsed.offset);

  return rows.map(toNotificationRecord);
}

export async function getUnreadCount(userId: string) {
  const parsedUserId = z.string().uuid().parse(userId);
  const result = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, parsedUserId),
        eq(notifications.read, false),
        eq(notifications.channel, "in_app"),
      ),
    );
  return result.length;
}

export const getUnreadNotificationCount = getUnreadCount;
export const unreadCount = getUnreadCount;

export async function listNotificationsForActor(userId: string) {
  return {
    items: await listNotifications({ userId, channel: "in_app", limit: 100 }),
    unreadCount: await getUnreadCount(userId),
  };
}

const markReadInputSchema = z.object({
  userId: z.string().uuid(),
  notificationIds: z.array(z.string().uuid()).min(1),
});

export async function markNotificationsRead(input: unknown) {
  const parsed = markReadInputSchema.parse(input);
  const ids = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, parsed.userId),
        eq(notifications.read, false),
        eq(notifications.channel, "in_app"),
      ),
    );
  const ownedIds = new Set(ids.map((row) => row.id));
  const idsToMark = parsed.notificationIds.filter((id) => ownedIds.has(id));
  if (idsToMark.length === 0) return { markedCount: 0 };

  const updated = await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.userId, parsed.userId),
        eq(notifications.read, false),
        // The IDs have already been scoped to this user above. Keeping the
        // membership predicate in SQL avoids relying on an untrusted ID.
        sqlInIds(idsToMark),
      ),
    )
    .returning({ id: notifications.id });
  return { markedCount: updated.length };
}

export const markRead = markNotificationsRead;

export const markNotificationRead = async (
  userId: string,
  notificationId: string,
) =>
  markNotificationsRead({
    userId,
    notificationIds: [notificationId],
  });

export async function markAllNotificationsRead(userId: string) {
  const parsedUserId = z.string().uuid().parse(userId);
  const updated = await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.userId, parsedUserId),
        eq(notifications.read, false),
        eq(notifications.channel, "in_app"),
      ),
    )
    .returning({ id: notifications.id });
  return { markedCount: updated.length };
}

function destinationFor(
  channel: NotificationChannel,
  user: { email: string | null; phone: string | null },
) {
  if (channel === "in_app") return "in-app";
  return channel === "email" ? user.email : user.phone;
}

function textFromData(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNotificationRecord(
  row: typeof notifications.$inferSelect,
): NotificationRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    data: isRecord(row.data) ? row.data : {},
    read: row.read,
    channel: row.channel,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sqlInIds(ids: string[]) {
  // This helper intentionally accepts only UUIDs already parsed by zod.
  return ids.length === 1
    ? eq(notifications.id, ids[0])
    : or(...ids.map((id) => eq(notifications.id, id)));
}

async function sendProductionEmail(message: NotificationMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.NOTIFICATION_EMAIL_FROM ?? process.env.AUTH_EMAIL_FROM;
  if (!apiKey || apiKey.startsWith("replace-with-") || !from) {
    throw new Error("Email notification provider is not configured.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.title,
      text: message.body,
    }),
  });
  if (!response.ok)
    throw new Error(`Email provider failed (${response.status}).`);
  return { sentAt: new Date() };
}

async function sendProductionSms(message: NotificationMessage) {
  const apiKey = process.env.SEMAPHORE_API_KEY;
  if (!apiKey || apiKey.startsWith("replace-with-")) {
    throw new Error("SMS notification provider is not configured.");
  }
  const form = new URLSearchParams({
    apikey: apiKey,
    number: message.to,
    message: `${message.title}: ${message.body}`,
  });
  const senderName = process.env.SEMAPHORE_SENDER_NAME;
  if (senderName) form.set("sendername", senderName);
  const response = await fetch(
    process.env.SEMAPHORE_API_URL ?? "https://api.semaphore.co/api/v4/messages",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    },
  );
  if (!response.ok)
    throw new Error(`SMS provider failed (${response.status}).`);
  return { sentAt: new Date() };
}

// Keep the policy visible to callers/tests without allowing event input to
// override the channel map.
export function isBookingCriticalEvent(event: NotificationEventType) {
  const canonical = eventAliasMap[event] ?? event;
  return bookingCriticalEventSet.has(canonical);
}
