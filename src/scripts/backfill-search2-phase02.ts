import { backfillSearch2DataTrust } from "@/db/search2-data-trust";
import { pool } from "@/db/client";

async function run() {
  const result = await backfillSearch2DataTrust();
  console.log(
    JSON.stringify(
      {
        mappedListings: result.mappedListings,
        unmappableListings: result.unmappableListings,
        listingCount: result.report.listingCount,
        issueCounts: result.report.issueCounts,
        rows: result.report.rows,
      },
      null,
      2,
    ),
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
