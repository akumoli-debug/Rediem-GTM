import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db/client";
import { createFormulaColumn } from "@/server/formulas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const column = await createFormulaColumn(prisma, {
      workspaceId: body.workspaceId,
      name: body.name,
      scope: body.scope,
      expression: body.expression,
      outputType: body.outputType,
      enabled: body.enabled
    });

    return NextResponse.json(column, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
