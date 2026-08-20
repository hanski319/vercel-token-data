import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { getRecords, pivotForChart } from "@/lib/data";
import { METRIC_LABEL, type Metric } from "@/lib/types";

const METRICS: Metric[] = ["tokens", "cost", "requests"];

function addSheet(workbook: ExcelJS.Workbook, metric: Metric) {
  const daily = getRecords(metric, "daily");
  const { models, rows } = pivotForChart(daily);

  const sheet = workbook.addWorksheet(METRIC_LABEL[metric].slice(0, 31));
  sheet.columns = [
    { header: "Date", key: "date", width: 12 },
    ...models.map((name) => ({ header: name, key: name, width: 16 })),
  ];
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow(row);
  }
  for (const col of sheet.columns.slice(1)) {
    col.numFmt = "0.00";
  }
  sheet.views = [{ state: "frozen", ySplit: 1, xSplit: 1 }];
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
