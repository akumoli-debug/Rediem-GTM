import { type NextRequest } from "next/server";
import { exportPeopleCsv } from "@/server/exports";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? undefined;
  const csv = await exportPeopleCsv(workspaceId);

  return new Response(csv, {
    headers: {
      "content-disposition": 'attachment; filename="people-export.csv"',
      "content-type": "text/csv; charset=utf-8"
    }
  });
}

