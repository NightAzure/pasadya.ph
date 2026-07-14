import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminActor } from "@/modules/admin";
import { getPayoutDomain } from "@/app/api/payouts/_domain";

import { adminErrorResponse } from "../../_errors";

const querySchema = z.object({
  status: z.enum(["pending", "completed", "failed"]).optional(),
});

export async function GET(request: Request) {
  try {
    const actor = await getAdminActor("admin");
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      status: url.searchParams.get("status") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payout export filters are not valid." },
        { status: 400 },
      );
    }

    const domain = await getPayoutDomain();
    const rows = await domain.listPayoutExportRows(actor.id, parsed.data);
    const csv = [
      [
        "payout_id",
        "business_id",
        "business_name",
        "amount_centavos",
        "method",
        "status",
        "booking_ids",
        "reference",
        "created_at",
        "processed_at",
      ],
      ...rows.map((row) => [
        row.id,
        row.businessId,
        row.businessName,
        row.amount,
        row.method,
        row.status,
        row.bookingIds.join("|"),
        row.reference ?? "",
        row.createdAt,
        row.processedAt ?? "",
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    return new NextResponse(`${csv}\r\n`, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="pasadya-payouts.csv"',
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    return adminErrorResponse(error, "Payout export could not be generated.");
  }
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}
