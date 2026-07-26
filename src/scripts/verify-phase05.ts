import { createHmac } from "node:crypto";

import { sql } from "drizzle-orm";

import { db, pool } from "@/db/client";

const fixtureSlug = "phase05-verification-resort";
const fixtureRateName = "Phase 05 Verification Room";
const fixturePrefix = "phase05-verify";
const webhookSecret = "phase05-local-webhook-secret";
const downpaymentAmount = 5_000;

type DomainFunction = (...args: unknown[]) => unknown;
type DomainApi = Record<string, DomainFunction>;

type Fixture = {
  ownerId: string;
  guestId: string;
  adminId: string;
  businessId: string;
  listingId: string;
  ratePlanId: string;
};

type BookingRow = {
  id: string;
  status: string;
  subtotal: number;
  downpayment_amount: number;
  balance_due: number;
  expires_at: Date | null;
};

async function run() {
  process.env.PAYMONGO_WEBHOOK_SECRET = webhookSecret;

  const api = await loadPhase05Api();
  await resetFixture();
  const fixture = await ensureFixture();

  await verifyDayUseQuote(api, fixture);
  await verifyInstantBookingAndRefund(api, fixture);

  const paidBooking = await requestBooking(api, fixture, {
    email: `${fixturePrefix}-paid@example.test`,
    checkIn: "2026-09-10",
    checkOut: "2026-09-11",
    specialRequests: `${fixturePrefix}:paid`,
  });
  assertBookingStatus(
    paidBooking,
    "requested",
    "Inquiry request creates requested booking",
  );

  await callWithActor(
    api,
    ["acceptBooking", "acceptInquiry", "ownerAcceptBooking"],
    paidBooking.id,
    fixture.ownerId,
  );
  assertBookingStatus(
    await getBooking(paidBooking.id),
    "accepted",
    "Owner accept moves booking to accepted",
  );

  await assertRejected(
    () =>
      callWithActor(
        api,
        ["declineBooking", "declineInquiry", "ownerDeclineBooking"],
        paidBooking.id,
        fixture.ownerId,
      ),
    "Invalid owner decline transition is rejected",
  );

  await assertRejected(
    () =>
      callWithActor(
        api,
        ["acceptBooking", "acceptInquiry", "ownerAcceptBooking"],
        paidBooking.id,
        fixture.adminId,
      ),
    "Unauthorized owner action is rejected",
  );

  await assertRejected(
    () =>
      callWithActor(
        api,
        [
          "createCheckoutDescriptor",
          "createCheckoutSession",
          "createPaymentCheckout",
          "startCheckout",
        ],
        paidBooking.id,
        fixture.adminId,
      ),
    "Unauthorized checkout is rejected",
  );

  const checkoutResult = await callWithActor(
    api,
    [
      "createCheckoutDescriptor",
      "createCheckoutSession",
      "createPaymentCheckout",
      "startCheckout",
    ],
    paidBooking.id,
    fixture.guestId,
  );
  assert(
    hasCheckoutDescriptor(checkoutResult),
    "Checkout operation returns a checkout descriptor",
  );
  const payment = await getPayment(paidBooking.id);
  assert(
    Boolean(payment?.paymongo_session_id),
    "Accepted booking creates a checkout descriptor/session",
  );
  assertBookingStatus(
    await getBooking(paidBooking.id),
    "awaiting_payment",
    "Checkout descriptor opens the payment window",
  );
  assert(
    payment?.status === "pending",
    "Checkout starts with a pending payment",
  );

  const paidEvent = createPaidWebhook(
    payment!.paymongo_session_id,
    "phase05-paid-event-001",
    paidBooking.id,
  );
  await assertRejected(
    () => callWebhookWithSignature(api, paidEvent, "te=invalid"),
    "Invalid webhook signature is rejected",
  );
  await callWebhook(api, paidEvent);
  assertBookingStatus(
    await getBooking(paidBooking.id),
    "confirmed",
    "Webhook-paid event confirms the booking",
  );
  assert(
    (await getPayment(paidBooking.id))?.status === "paid",
    "Webhook-paid event marks payment paid",
  );
  await callWebhook(
    api,
    toPaymongoEnvelope(paidEvent, "phase05-paid-envelope-001"),
  );
  assertBookingStatus(
    await getBooking(paidBooking.id),
    "confirmed",
    "Real PayMongo event envelope remains compatible",
  );

  await callWebhook(api, paidEvent);
  const duplicateCount = await countWebhookEvents("phase05-paid-event-001");
  assert(duplicateCount === 1, "Duplicate webhook event is idempotent");
  assertBookingStatus(
    await getBooking(paidBooking.id),
    "confirmed",
    "Duplicate webhook does not change the confirmed state",
  );

  const abandonedBooking = await requestBooking(api, fixture, {
    email: `${fixturePrefix}-abandoned@example.test`,
    checkIn: "2026-09-12",
    checkOut: "2026-09-13",
    specialRequests: `${fixturePrefix}:abandoned`,
  });
  await callWithActor(
    api,
    ["acceptBooking", "acceptInquiry", "ownerAcceptBooking"],
    abandonedBooking.id,
    fixture.ownerId,
  );
  await callWithActor(
    api,
    [
      "createCheckoutDescriptor",
      "createCheckoutSession",
      "createPaymentCheckout",
      "startCheckout",
    ],
    abandonedBooking.id,
    fixture.guestId,
  );
  assertBookingStatus(
    await getBooking(abandonedBooking.id),
    "awaiting_payment",
    "Abandoned checkout remains awaiting payment without a webhook",
  );
  assert(
    (await getPayment(abandonedBooking.id))?.status === "pending",
    "Abandoned checkout remains unpaid",
  );

  const expiringBooking = await requestBooking(api, fixture, {
    email: `${fixturePrefix}-expiring@example.test`,
    checkIn: "2026-09-14",
    checkOut: "2026-09-15",
    specialRequests: `${fixturePrefix}:expiring`,
  });
  await callWithActor(
    api,
    ["acceptBooking", "acceptInquiry", "ownerAcceptBooking"],
    expiringBooking.id,
    fixture.ownerId,
  );
  await callWithActor(
    api,
    [
      "createCheckoutDescriptor",
      "createCheckoutSession",
      "createPaymentCheckout",
      "startCheckout",
    ],
    expiringBooking.id,
    fixture.guestId,
  );
  await db.execute(sql`
    update bookings
    set expires_at = now() - interval '1 minute'
    where id = ${expiringBooking.id}::uuid and status = 'awaiting_payment'
  `);
  await callExpiry(api, expiringBooking.id);
  assertBookingStatus(
    await getBooking(expiringBooking.id),
    "expired",
    "Expired unpaid booking moves to expired",
  );

  await verifyRefundCalculations(api);

  await db.execute(sql`
    update bookings
    set check_out = current_date - 1
    where id = ${paidBooking.id}::uuid and status = 'confirmed'
  `);
  await callWithActor(
    api,
    ["completeBooking", "markBookingCompleted", "completeStay"],
    paidBooking.id,
    fixture.ownerId,
  );
  assertBookingStatus(
    await getBooking(paidBooking.id),
    "completed",
    "Completed booking uses the exported domain transition",
  );

  await assertRejected(
    () =>
      callWithActor(
        api,
        ["createPayout", "createManualPayout", "createPayoutRecord"],
        {
          businessId: fixture.businessId,
          amount: downpaymentAmount,
          bookingIds: [paidBooking.id],
          method: "invalid_method",
        },
        fixture.adminId,
      ),
    "Invalid payout method is rejected",
  );

  const payoutResult = await callWithActor(
    api,
    ["createPayout", "createManualPayout", "createPayoutRecord"],
    {
      businessId: fixture.businessId,
      amount: downpaymentAmount,
      bookingIds: [paidBooking.id],
      method: "gcash",
    },
    fixture.adminId,
  );
  await assertRejected(
    () =>
      callWithActor(
        api,
        ["createPayout", "createManualPayout", "createPayoutRecord"],
        {
          businessId: fixture.businessId,
          amount: downpaymentAmount,
          bookingIds: [paidBooking.id],
          method: "gcash",
        },
        fixture.guestId,
      ),
    "Unauthorized payout creation is rejected",
  );
  const payoutId =
    extractId(payoutResult) ?? (await getLatestPayoutId(fixture.businessId));
  assert(Boolean(payoutId), "Manual payout record is created");
  await callWithActor(
    api,
    ["completePayout", "markPayoutCompleted", "completeManualPayout"],
    { payoutId: payoutId!, reference: "PHASE05-VERIFY-COMPLETE" },
    fixture.adminId,
  );
  const payout = await getPayout(payoutId!);
  assert(
    payout?.status === "completed",
    "Manual payout can be marked completed",
  );
  assert(
    payout?.reference === "PHASE05-VERIFY-COMPLETE",
    "Completed payout stores its reference",
  );
  await assertRejected(
    () =>
      callWithActor(
        api,
        ["createPayout", "createManualPayout", "createPayoutRecord"],
        {
          businessId: fixture.businessId,
          amount: downpaymentAmount,
          bookingIds: [paidBooking.id],
          method: "gcash",
        },
        fixture.adminId,
      ),
    "Completed payout bookings cannot be paid out twice",
  );

  console.log("Phase 05 verification passed");
}

async function loadPhase05Api(): Promise<DomainApi> {
  const candidates = [
    "@/modules/booking/service",
    "@/modules/bookings/service",
    "@/modules/bookings",
    "@/modules/payments/service",
    "@/modules/payments",
    "@/modules/payouts/service",
  ];
  const api: DomainApi = {};

  for (const moduleName of candidates) {
    try {
      const loaded = (await import(moduleName)) as {
        default?: DomainApi;
      } & DomainApi;
      Object.assign(api, loaded.default ?? loaded);
    } catch (error) {
      if (!isModuleNotFound(error)) {
        throw error;
      }
    }
  }

  const requiredGroups = [
    [
      "requestBooking",
      "createBookingRequest",
      "createInquiryBooking",
      "submitBookingRequest",
      "createBooking",
    ],
    ["acceptBooking", "acceptInquiry", "ownerAcceptBooking"],
    ["createInstantBooking"],
    [
      "createCheckoutDescriptor",
      "createCheckoutSession",
      "createPaymentCheckout",
      "startCheckout",
    ],
    [
      "handlePaymentWebhook",
      "handlePaymongoWebhook",
      "processPaymentWebhook",
      "processWebhook",
      "handleWebhook",
    ],
    [
      "expireBooking",
      "expireAwaitingPaymentBooking",
      "expireUnpaidBookings",
      "runBookingExpiry",
      "expireDueBookings",
    ],
    ["calculateRefundAmount", "calculateRefund", "getRefundAmount"],
    ["createPayout", "createManualPayout", "createPayoutRecord"],
    ["completePayout", "markPayoutCompleted", "completeManualPayout"],
    ["completeBooking", "markBookingCompleted", "completeStay"],
  ];
  const missing = requiredGroups
    .filter((names) => !names.some((name) => typeof api[name] === "function"))
    .map((names) => names[0]);
  if (missing.length > 0) {
    throw new Error(
      `Phase 05 domain blocker: missing exported function group(s): ${missing.join(", ")}. ` +
        "Implement the booking/payments/payout domain services before running this verifier.",
    );
  }

  return api;
}

async function ensureFixture(): Promise<Fixture> {
  const owner = await ensureUser(
    `${fixturePrefix}-owner@example.test`,
    "Phase 05 Owner",
  );
  const guest = await ensureUser(
    `${fixturePrefix}-guest@example.test`,
    "Phase 05 Guest",
  );
  const admin = await ensureUser(
    `${fixturePrefix}-admin@example.test`,
    "Phase 05 Admin",
    "admin",
  );

  await db.execute(sql`
    insert into businesses (owner_id, display_name, contact_email, payout_gcash, verified_at)
    values (${owner.id}::uuid, 'Phase 05 Verification Business', ${owner.email}, '+639180500001', now())
    on conflict do nothing
  `);
  const business = await db.execute<{ id: string }>(sql`
    select id::text as id from businesses where owner_id = ${owner.id}::uuid order by created_at desc limit 1
  `);
  const businessId = business.rows[0]?.id;
  if (!businessId)
    throw new Error("Phase 05 verification fixture business was not created");

  await db.execute(sql`
    insert into listings (
      business_id, slug, name, category, description, status, claim_status,
      address, attributes, price_min, price_max, booking_mode,
      cancellation_policy, downpayment_pct, published_at
    ) values (
      ${businessId}::uuid, ${fixtureSlug}, 'Phase 05 Verification Resort', 'resort',
      'Deterministic Phase 05 verification fixture.', 'published', 'claimed',
      '{"municipality":"Samal","province":"Davao del Norte"}'::jsonb,
      '{"overnight":true}'::jsonb, 10000, 10000, 'inquiry', 'flexible', 50, now()
    )
    on conflict (slug) do update set
      business_id = excluded.business_id,
      status = excluded.status,
      claim_status = excluded.claim_status,
      booking_mode = excluded.booking_mode,
      cancellation_policy = excluded.cancellation_policy,
      downpayment_pct = excluded.downpayment_pct,
      price_min = excluded.price_min,
      price_max = excluded.price_max,
      updated_at = now()
  `);
  const listing = await db.execute<{ id: string }>(sql`
    select id::text as id from listings where slug = ${fixtureSlug} limit 1
  `);
  const listingId = listing.rows[0]?.id;
  if (!listingId)
    throw new Error("Phase 05 verification fixture listing was not created");

  await db.execute(
    sql`delete from availability_blocks where listing_id = ${listingId}::uuid`,
  );
  await db.execute(
    sql`delete from rate_plans where listing_id = ${listingId}::uuid`,
  );
  await db.execute(sql`
    insert into rate_plans (
      listing_id, name, type, price, price_unit, billing_period, billing_unit,
      included_pax, extra_pax_charge, capacity_per_unit, inventory_unit_label,
      available_quantity, quote_eligibility, mandatory_fee, mandatory_fee_basis, fees_declared_at,
      mandatory_charge_disclosure_status, pricing_trust_status, pricing_valid_until,
      availability_trust_status, availability_valid_until, min_pax, active
    ) values (
      ${listingId}::uuid, ${fixtureRateName}, 'day_use', 10000, 'per_group', 'day', 'inventory_unit',
      2, 0, 2, 'room', 5, 'eligible', 0, 'fixed_per_booking', now(), 'none', 'owner_provided', now() + interval '30 days',
      'owner_provided', now() + interval '7 days', 1, true
    )
  `);
  const ratePlan = await db.execute<{ id: string }>(sql`
    select id::text as id from rate_plans where listing_id = ${listingId}::uuid and name = ${fixtureRateName} limit 1
  `);
  const ratePlanId = ratePlan.rows[0]?.id;
  if (!ratePlanId)
    throw new Error("Phase 05 verification fixture rate plan was not created");
  await db.execute(sql`
    insert into availability_blocks (listing_id, rate_plan_id, date, available, quantity)
    values
      (${listingId}::uuid, ${ratePlanId}::uuid, '2026-09-10', true, 5),
      (${listingId}::uuid, ${ratePlanId}::uuid, '2026-09-11', true, 5),
      (${listingId}::uuid, ${ratePlanId}::uuid, '2026-09-12', true, 5),
      (${listingId}::uuid, ${ratePlanId}::uuid, '2026-09-13', true, 5),
      (${listingId}::uuid, ${ratePlanId}::uuid, '2026-09-14', true, 5),
      (${listingId}::uuid, ${ratePlanId}::uuid, '2026-09-16', true, 5),
      (${listingId}::uuid, ${ratePlanId}::uuid, '2026-09-17', true, 5)
  `);

  return {
    ownerId: owner.id,
    guestId: guest.id,
    adminId: admin.id,
    businessId,
    listingId,
    ratePlanId,
  };
}

async function verifyInstantBookingAndRefund(api: DomainApi, fixture: Fixture) {
  await db.execute(sql`
    update listings set booking_mode = 'instant'::booking_mode, updated_at = now()
    where id = ${fixture.listingId}::uuid
  `);

  try {
    const created = await callWithActor(
      api,
      ["createInstantBooking"],
      {
        listingId: fixture.listingId,
        ratePlanId: fixture.ratePlanId,
        checkIn: "2026-09-16",
        checkOut: "2026-09-17",
        pax: 2,
        guestName: "Phase 05 Guest",
        guestPhone: "+639180500002",
        guestEmail: `${fixturePrefix}-instant@example.test`,
        specialRequests: `${fixturePrefix}:instant`,
      },
      fixture.guestId,
    );
    const createdId = extractBookingId(created);
    const instantBooking = createdId
      ? await getBooking(createdId)
      : await getLatestBooking(`${fixturePrefix}-instant@example.test`);
    assertBookingStatus(
      instantBooking,
      "awaiting_payment",
      "Instant booking creates an awaiting-payment booking",
    );
    assert(
      instantBooking.expires_at !== null,
      "Instant booking receives a payment expiry",
    );

    await callWithActor(
      api,
      [
        "createCheckoutDescriptor",
        "createCheckoutSession",
        "createPaymentCheckout",
        "startCheckout",
      ],
      instantBooking.id,
      fixture.guestId,
    );
    const payment = await getPayment(instantBooking.id);
    await callWebhook(
      api,
      createPaidWebhook(
        payment!.paymongo_session_id,
        "phase05-instant-paid-001",
        instantBooking.id,
      ),
    );

    const { cancelBookingForActor } =
      await import("@/app/api/bookings/[bookingId]/cancel/route");
    const cancellation = await cancelBookingForActor(
      instantBooking.id,
      fixture.guestId,
      "Phase 05 verifier cancellation",
    );
    assert(
      cancellation.status === "cancelled_by_guest",
      "Guest cancellation uses the booking state machine",
    );
    assert(
      cancellation.refundAmount === downpaymentAmount,
      "Cancellation computes the canonical refund amount",
    );
    assert(cancellation.refundRequested, "Paid cancellation requests a refund");
    if (cancellation.refundRequestRecorded) {
      assert(
        (await countAuditEntries(
          instantBooking.id,
          "payment.refund_requested",
        )) > 0,
        "Refund fallback records a durable request",
      );
    } else {
      assert(
        typeof cancellation.refundRequest.operation === "string",
        "Exported payment refund operation is invoked when available",
      );
    }

    await callWebhook(api, {
      id: "phase05-refund-event-001",
      type: "payment.refunded",
      eventType: "payment.refunded",
      sessionId: payment!.paymongo_session_id,
      paymongoSessionId: payment!.paymongo_session_id,
      paymentId: "phase05-payment-001",
      paymongoPaymentId: "phase05-payment-001",
      bookingId: instantBooking.id,
      amount: downpaymentAmount,
      currency: "PHP",
      data: {
        id: "phase05-payment-001",
        attributes: { amount: downpaymentAmount, currency: "PHP" },
      },
    });
    assertBookingStatus(
      await getBooking(instantBooking.id),
      "refunded",
      "Refund webhook moves a cancelled booking to refunded",
    );
    assert(
      (await getPayment(instantBooking.id))?.status === "refunded",
      "Refund webhook marks the payment refunded",
    );
  } finally {
    await db.execute(sql`
      update listings set booking_mode = 'inquiry'::booking_mode, updated_at = now()
      where id = ${fixture.listingId}::uuid
    `);
  }
}

async function verifyDayUseQuote(api: DomainApi, fixture: Fixture) {
  const quote = await findFunction(api, ["quoteBooking"])({
    listingId: fixture.listingId,
    ratePlanId: fixture.ratePlanId,
    checkIn: "2026-09-16",
    checkOut: "2026-09-16",
    pax: 2,
    guestName: "Phase 05 Day-use Guest",
    guestPhone: "+639180500003",
    guestEmail: `${fixturePrefix}-day-use@example.test`,
  });
  assert(
    typeof quote === "object" &&
      quote !== null &&
      (quote as Record<string, unknown>).days === 1,
    "Same-day day-use quote is supported",
  );
}

async function requestBooking(
  api: DomainApi,
  fixture: Fixture,
  values: {
    email: string;
    checkIn: string;
    checkOut: string;
    specialRequests: string;
  },
) {
  const input = {
    listingId: fixture.listingId,
    listingSlug: fixtureSlug,
    ratePlanId: fixture.ratePlanId,
    checkIn: values.checkIn,
    checkOut: values.checkOut,
    pax: 2,
    guestName: "Phase 05 Guest",
    guestPhone: "+639180500002",
    guestEmail: values.email,
    specialRequests: values.specialRequests,
    subtotal: 10000,
  };
  await callWithActor(
    api,
    [
      "requestBooking",
      "createBookingRequest",
      "createInquiryBooking",
      "submitBookingRequest",
      "createBooking",
    ],
    input,
    fixture.guestId,
  );
  const booking = await db.execute<BookingRow>(sql`
    select id::text as id, status, subtotal, downpayment_amount, balance_due, expires_at
    from bookings where guest_email = ${values.email} order by created_at desc limit 1
  `);
  const row = booking.rows[0];
  if (!row)
    throw new Error(
      `Phase 05 verification booking was not created for ${values.email}`,
    );
  return row;
}

async function verifyRefundCalculations(api: DomainApi) {
  const amount = 10_000;
  const flexible = await calculateRefund(api, "flexible", amount, 72);
  assert(
    flexible === amount,
    "Flexible policy returns 100% at least 48 hours before check-in",
  );
  const moderate = await calculateRefund(api, "moderate", amount, 120);
  assert(
    moderate === amount / 2,
    "Moderate policy returns 50% at least 5 days before check-in",
  );
  const strict = await calculateRefund(api, "strict", amount, 120);
  assert(strict === 0, "Strict policy returns no refund");
}

async function calculateRefund(
  api: DomainApi,
  policy: string,
  amount: number,
  hoursBeforeCheckIn: number,
) {
  const fn = findFunction(api, [
    "calculateRefundAmount",
    "calculateRefund",
    "getRefundAmount",
  ]);
  const input = {
    policy,
    cancellationPolicy: policy,
    amount,
    amountPaid: amount,
    downpaymentAmount: amount,
    hoursBeforeCheckIn,
    daysBeforeCheckIn: hoursBeforeCheckIn / 24,
    checkIn: "2026-10-15",
    cancelledAt: "2026-10-12T00:00:00.000Z",
    at: new Date(
      new Date("2026-10-15T00:00:00.000Z").getTime() -
        hoursBeforeCheckIn * 60 * 60 * 1000,
    ),
  };
  const result =
    fn.length >= 3
      ? await fn(policy, amount, hoursBeforeCheckIn)
      : fn.length === 2
        ? await fn(policy, input)
        : await fn(input);
  const value =
    typeof result === "number"
      ? result
      : typeof result === "object" && result !== null
        ? ((result as Record<string, unknown>).amount ??
          (result as Record<string, unknown>).refundAmount ??
          (result as Record<string, unknown>).refundCents)
        : undefined;
  if (typeof value !== "number")
    throw new Error("Phase 05 refund function did not return a numeric amount");
  return value;
}

async function callWebhook(api: DomainApi, event: Record<string, unknown>) {
  const rawBody = JSON.stringify(event);
  const signature = `te=${createHmac("sha256", webhookSecret).update(rawBody).digest("hex")}`;
  return callWebhookWithSignature(api, event, signature);
}

async function callWebhookWithSignature(
  api: DomainApi,
  event: Record<string, unknown>,
  signature: string,
) {
  const fn = findFunction(api, [
    "handlePaymentWebhook",
    "handlePaymongoWebhook",
    "processPaymentWebhook",
    "processWebhook",
    "handleWebhook",
  ]);
  const rawBody = JSON.stringify(event);
  if (fn.length >= 3) return await fn(rawBody, signature, event);
  if (fn.length === 2) return await fn(rawBody, signature);
  return await fn(event);
}

async function callExpiry(api: DomainApi, bookingId: string) {
  const [name, fn] = findNamedFunction(api, [
    "expireBooking",
    "expireAwaitingPaymentBooking",
    "expireUnpaidBookings",
    "runBookingExpiry",
    "expireDueBookings",
  ]);
  if (name === "expireDueBookings") return await fn(new Date());
  if (fn.length === 0) return await fn(bookingId);
  if (fn.length === 1) return await fn({ bookingId, now: new Date() });
  return await fn(bookingId, new Date());
}

async function callWithActor(
  api: DomainApi,
  names: string[],
  input: unknown,
  actorId: string,
  extra?: unknown,
) {
  const fn = findFunction(api, names);
  if (fn.length >= 3) return await fn(input, actorId, extra);
  if (fn.length === 2) return await fn(input, actorId);
  return await fn({
    ...(typeof input === "object" && input !== null
      ? input
      : { bookingId: input, payoutId: input }),
    actorId,
    userId: actorId,
    ownerId: actorId,
    adminId: actorId,
    reference: extra,
  });
}

function findFunction(api: DomainApi, names: string[]) {
  return findNamedFunction(api, names)[1];
}

function findNamedFunction(api: DomainApi, names: string[]) {
  const name = names.find((candidate) => typeof api[candidate] === "function");
  if (!name) throw new Error(`Phase 05 domain export missing: ${names[0]}`);
  return [name, api[name]!] as const;
}

function createPaidWebhook(
  sessionId: string,
  eventId: string,
  bookingId: string,
) {
  return {
    id: eventId,
    eventId,
    type: "checkout_session.payment.paid",
    eventType: "checkout_session.payment.paid",
    data: {
      id: sessionId,
      type: "checkout_session",
      attributes: {
        status: "paid",
        payments: [{ id: "phase05-payment-001", status: "paid" }],
        metadata: { bookingId, booking_id: bookingId },
      },
    },
    sessionId,
    paymongoSessionId: sessionId,
    paymentId: "phase05-payment-001",
    paymongoPaymentId: "phase05-payment-001",
    bookingId,
  };
}

function toPaymongoEnvelope(event: Record<string, unknown>, eventId: string) {
  return {
    data: {
      id: eventId,
      type: "event",
      attributes: {
        type: event.type,
        livemode: false,
        data: event.data,
      },
    },
  };
}

function hasCheckoutDescriptor(value: unknown) {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const nested =
    typeof record.checkout === "object" && record.checkout !== null
      ? (record.checkout as Record<string, unknown>)
      : record;
  return [
    "checkoutUrl",
    "checkout_url",
    "url",
    "sessionId",
    "paymongoSessionId",
    "paymongo_session_id",
  ].some((key) => typeof nested[key] === "string" && nested[key] !== "");
}

async function resetFixture() {
  await db.execute(
    sql`delete from payouts where business_id in (select id from businesses where display_name = 'Phase 05 Verification Business')`,
  );
  await db.execute(
    sql`delete from webhook_events where event_id like 'phase05-%'`,
  );
  await db.execute(sql`
    delete from payments where booking_id in (
      select id from bookings where guest_email like ${`${fixturePrefix}-%@example.test`}
    )
  `);
  await db.execute(sql`
    delete from inventory_reservations where booking_id in (
      select id from bookings where guest_email like ${`${fixturePrefix}-%@example.test`}
    )
  `);
  await db.execute(
    sql`delete from bookings where guest_email like ${`${fixturePrefix}-%@example.test`}`,
  );
  await db.execute(
    sql`delete from availability_blocks where listing_id in (select id from listings where slug = ${fixtureSlug})`,
  );
  await db.execute(
    sql`delete from rate_plans where listing_id in (select id from listings where slug = ${fixtureSlug})`,
  );
}

async function ensureUser(email: string, name: string, role = "user") {
  await db.execute(sql`
    insert into users (email, name, role, auth_provider, email_verified)
    values (${email}, ${name}, ${role}::user_role, 'email', now())
    on conflict (email) do update set name = excluded.name, role = excluded.role, email_verified = excluded.email_verified
  `);
  const result = await db.execute<{ id: string; email: string }>(sql`
    select id::text as id, email from users where email = ${email} limit 1
  `);
  const user = result.rows[0];
  if (!user) throw new Error(`Failed to create verification user ${email}`);
  return user;
}

async function getBooking(id: string) {
  const result = await db.execute<BookingRow>(sql`
    select id::text as id, status, subtotal, downpayment_amount, balance_due, expires_at
    from bookings where id = ${id}::uuid limit 1
  `);
  const booking = result.rows[0];
  if (!booking) throw new Error(`Booking ${id} was not found`);
  return booking;
}

async function getLatestBooking(email: string) {
  const result = await db.execute<BookingRow>(sql`
    select id::text as id, status, subtotal, downpayment_amount, balance_due, expires_at
    from bookings where guest_email = ${email} order by created_at desc limit 1
  `);
  const booking = result.rows[0];
  if (!booking) throw new Error(`Booking was not found for ${email}`);
  return booking;
}

async function getPayment(bookingId: string) {
  const result = await db.execute<{
    paymongo_session_id: string;
    status: string;
  }>(sql`
    select paymongo_session_id, status from payments where booking_id = ${bookingId}::uuid limit 1
  `);
  return result.rows[0];
}

async function getPayout(id: string) {
  const result = await db.execute<{
    status: string;
    reference: string | null;
  }>(sql`
    select status, reference from payouts where id = ${id}::uuid limit 1
  `);
  return result.rows[0];
}

async function getLatestPayoutId(businessId: string) {
  const result = await db.execute<{ id: string }>(sql`
    select id::text as id from payouts where business_id = ${businessId}::uuid order by created_at desc limit 1
  `);
  return result.rows[0]?.id;
}

async function countWebhookEvents(eventId: string) {
  const result = await db.execute<{ count: string }>(sql`
    select count(*)::text as count from webhook_events where event_id = ${eventId}
  `);
  return Number(result.rows[0]?.count ?? 0);
}

async function countAuditEntries(bookingId: string, action: string) {
  const result = await db.execute<{ count: string }>(sql`
    select count(*)::text as count
    from audit_log
    where entity_id = ${bookingId}::uuid and action = ${action}
  `);
  return Number(result.rows[0]?.count ?? 0);
}

function extractId(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  for (const key of ["id", "payoutId"]) {
    if (typeof record[key] === "string") return record[key];
  }
  return undefined;
}

function extractBookingId(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  for (const key of ["id", "bookingId"]) {
    if (typeof record[key] === "string") return record[key];
  }
  return undefined;
}

function assertBookingStatus(
  booking: BookingRow,
  expected: string,
  message: string,
) {
  assert(
    booking.status === expected,
    `${message} (expected ${expected}, got ${booking.status})`,
  );
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Phase 05 verification failed: ${message}`);
  console.log(`ok - ${message}`);
}

async function assertRejected(
  operation: () => Promise<unknown>,
  message: string,
) {
  try {
    await operation();
  } catch {
    assert(true, message);
    return;
  }
  assert(false, message);
}

function isModuleNotFound(error: unknown) {
  return (
    error instanceof Error &&
    ("code" in error
      ? error.code === "ERR_MODULE_NOT_FOUND"
      : error.message.includes("Cannot find module"))
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
