import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db/client";
import { evaluateFormulaForEntity } from "@/server/formulas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await evaluateFormulaForEntity(prisma, {
      workspaceId: body.workspaceId,
      formulaColumnId: body.formulaColumnId,
      entityType: body.entityType,
      entityId: body.entityId
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
