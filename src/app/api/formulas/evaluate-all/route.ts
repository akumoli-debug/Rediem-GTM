import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db/client";
import { evaluateAllFormulasForWorkspace } from "@/server/formulas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const results = await evaluateAllFormulasForWorkspace(
      prisma,
      body.workspaceId
    );

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
