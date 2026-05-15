import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db/client";
import { addFormulaTemplateToWorkspace } from "@/server/formulas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await addFormulaTemplateToWorkspace(prisma, {
      workspaceId: body.workspaceId,
      templateId: body.templateId
    });

    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
