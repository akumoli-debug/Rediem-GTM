import { NextResponse, type NextRequest } from "next/server";
import { importAccountsFromCsv } from "@/server/imports/accountImportService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await importAccountsFromCsv({
      workspaceId: body.workspaceId,
      csv: body.csv ?? "",
      triggerResearch: Boolean(body.triggerResearch),
      playbookId: body.playbookId
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
