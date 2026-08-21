import ExcelJS from "exceljs";
import type { NextRequest } from "next/server";
import { getRecords, isPartialMonth, monthLabel } from "@/lib/data";
import { METRIC_LABEL, type Metric } from "@/lib/types";

const METRICS: Metric[] = ["tokens", "cost", "requests"];
const RANKS = Array.from({ length: 10 }, (_, i) => i + 1);

/** One sheet per metric, laid out like the on-page matrix: each month is a
 * Model / % share column pair running across, models run down by rank. */
function addSheet(workbook: ExcelJS.Workbook, metric: Metric) {
  const records = getRecords(metric, "monthly");
  const sheet = workbook.addWorksheet(METRIC_LABEL[metric].slice(0, 31));

  // Row 1 repeats the month over both of its columns; row 2 names the fields.
  sheet.addRow([
    "",
    ...records.flatMap((r) => {
      const label = monthLabel(r.date) + (isPartialMonth(r.date) ? " *" : "");
      return [label, label];
    }),
  ]);
  sheet.addRow(["#", ...records.flatMap(() => ["Model", "% share"])]);

  for (const rank of RANKS) {
    const row: (string | number | null)[] = [rank];
    for (const r of records) {
      const model = r.models.find((m) => m.rank === rank && m.name !== "Other");
      row.push(model ? model.name : "—", model ? model.pct : null);
    }
    sheet.addRow(row);
  }

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(2).font = { bold: true };
  sheet.getColumn(1).width = 5;
  records.forEach((_, i) => {
    sheet.getColumn(2 + i * 2).width = 26;
    const pct = sheet.getColumn(3 + i * 2);
    pct.width = 10;
    pct.numFmt = "0.0";
  });
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 2 }];
}

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("metric") as Metric | null;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "vercel-token-data";
  workbook.created = new Date();

  const metrics = requested && METRICS.includes(requested) ? [requested] : METRICS;
  for (const metric of metrics) addSheet(workbook, metric);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename =
    metrics.length === 1
      ? `vercel-token-data-${metrics[0]}.xlsx`
      : "vercel-token-data.xlsx";

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
