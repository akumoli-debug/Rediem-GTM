import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db/client";
import { deleteFormulaColumn, updateFormulaColumn } from "@/server/formulas";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ formulaId: string }> }
) {
  try {
    const { formulaId } = await context.params;
    const body = await request.json();
    const column = await updateFormulaColumn(prisma, formulaId, body);

    return NextResponse.json(column);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ formulaId: string }> }
) {
  try {
    const { formulaId } = await context.params;
    const column = await deleteFormulaColumn(prisma, formulaId);

    return NextResponse.json(column);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
