// Download everything (owner only).
//   ?format=json   the full backup: hours, settings, payments, notes, trash, partners
//   ?format=csv    the hours as a spreadsheet
import { errorResponse, handle, requireOwner } from "./_lib";
import { buildExport, entriesCsv, today } from "./_export";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  if (req.method !== "GET") return errorResponse("Method not allowed.", 405);
  const denied = await requireOwner(req, false);
  if (denied) return denied;
  const data = await buildExport();
  const csv = new URL(req.url).searchParams.get("format") === "csv";
  const body = csv ? entriesCsv(data.entries, data.clients) : JSON.stringify(data, null, 2);
  const name = csv ? `hours-${today()}.csv` : `work-backup-${today()}.json`;
  return new Response(body, {
    headers: {
      "content-type": csv ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
});
