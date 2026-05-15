import { type NextRequest } from "next/server";
import { exportAccountsCsv } from "@/server/exports";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? undefined;
  const csv = await exportAccountsCsv(workspaceId);

  return new Response(csv, {
    headers: {
      "content-disposition": 'attachment; filename="accounts-export.csv"',
      "content-type": "text/csv; charset=utf-8"
    }
  });
}

