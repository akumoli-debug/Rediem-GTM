import { NextResponse, type NextRequest } from "next/server";
import { previewAccountImport } from "@/server/imports/accountImportService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await previewAccountImport({
      workspaceId: body.workspaceId,
      csv: body.csv ?? ""
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

