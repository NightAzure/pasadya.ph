import { NextResponse } from "next/server";
import { z } from "zod";

import { getPortalActor } from "@/modules/portal/service";
import { getPayoutDomain, payoutDomainUnavailable } from "../../_domain";

const inputSchema = z.object({ reference: z.string().trim().min(2).max(160) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ payoutId: string }> },
) {
  const actor = await getPortalActor({ minimumRole: "admin" });
  const { payoutId } = await params;
  if (!z.string().uuid().safeParse(payoutId).success) {
    return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await request.json().catch(() => null)
    : Object.fromEntries(await request.formData());
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Add the transfer reference before completing the payout." },
      { status: 400 },
    );
  }

  const domain = await getPayoutDomain();
  if (!domain?.completePayout) {
    return NextResponse.json(payoutDomainUnavailable(), { status: 503 });
  }

  const payout = await domain.completePayout(
    { payoutId, reference: parsed.data.reference },
    actor.id,
  );
  return contentType.includes("application/json")
    ? NextResponse.json({ payout })
    : NextResponse.redirect(
        new URL("/admin/payouts?updated=1", request.url),
        303,
      );
}
