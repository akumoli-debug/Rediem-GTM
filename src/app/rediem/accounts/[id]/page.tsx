import { notFound } from "next/navigation";
import { RediemAccountDetailView } from "@/components/rediem/RediemAccountDetailView";
import { RediemShell } from "@/components/rediem/RediemShell";
import { getRediemAccountDetailData } from "@/server/rediem/uiData";

export const dynamic = "force-dynamic";

export default async function RediemAccountDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getRediemAccountDetailData(id);

  if (!detail) {
    notFound();
  }

  return (
    <RediemShell
      description="Evidence-backed Rediem fit, stack detections, loyalty program analysis, buyer committee, activation ideas, formulas, and export-ready account context."
      title={detail.row.brand}
    >
      <RediemAccountDetailView detail={detail} />
    </RediemShell>
  );
}
