import { NextResponse } from "next/server";
import { z } from "zod";

import { getPortalActor } from "@/modules/portal/service";
import { getPayoutDomain, payoutDomainUnavailable } from "./_domain";

const createPayoutSchema = z.object({
  businessId: z.string().uuid(),
  bookingIds: z.array(z.string().uuid()).min(1),
  amount: z.coerce.number().int().positive(),
  method: z.enum(["gcash", "bank_transfer"]),
});

export async function GET() {
  const actor = await getPortalActor({ minimumRole: "admin" });
  const domain = await getPayoutDomain();
  if (!domain?.listPayouts) {
    return NextResponse.json(payoutDomainUnavailable(), { status: 503 });
  }

  return NextResponse.json({ payouts: await domain.listPayouts(actor.id) });
}

export async function POST(request: Request) {
  const actor = await getPortalActor({ minimumRole: "admin" });
  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await request.json().catch(() => null)
    : formDataToInput(await request.formData());
  const parsed = createPayoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payout details are incomplete." },
      { status: 400 },
    );
  }

  const domain = await getPayoutDomain();
  if (!domain?.createPayout) {
    return NextResponse.json(payoutDomainUnavailable(), { status: 503 });
  }

  const payout = await domain.createPayout(parsed.data, actor.id);
  return contentType.includes("application/json")
    ? NextResponse.json({ payout }, { status: 201 })
    : NextResponse.redirect(
        new URL("/admin/payouts?updated=1", request.url),
        303,
      );
}

function formDataToInput(formData: FormData) {
  return {
    businessId: String(formData.get("businessId") ?? ""),
    bookingIds: String(formData.get("bookingIds") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    amount: String(formData.get("amount") ?? ""),
    method: String(formData.get("method") ?? ""),
  };
}
