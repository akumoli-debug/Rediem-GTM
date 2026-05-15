"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ImportPreviewRow = {
  rowNumber: number;
  domain: string;
  companyName?: string;
  linkedinUrl?: string;
  industry?: string;
  notes?: string;
  status: "VALID" | "INVALID" | "DUPLICATE_FILE" | "DUPLICATE_WORKSPACE";
  error?: string;
};

export function RediemImportPanel({ workspaceId }: { workspaceId?: string }) {
  const router = useRouter();
  const [csvText, setCsvText] = useState("");
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function previewCsv(file: File | null) {
    if (!file) {
      return;
    }

    const text = await file.text();
    setCsvText(text);
    setBusy(true);

    try {
      const response = await fetch("/api/import/accounts/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, csv: text })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "CSV preview failed.");
      }
      setPreviewRows(result.rows);
      setNotice(`Previewed ${result.rows.length} rows.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function importCsv() {
    setBusy(true);

    try {
      const response = await fetch("/api/import/accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          csv: csvText,
          triggerResearch: false
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "CSV import failed.");
      }
      setNotice(
        `Imported ${result.createdCount} brands and skipped ${result.skippedCount}. Run Rediem analysis from the accounts cockpit when ready.`
      );
      setPreviewRows([]);
      setCsvText("");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const validPreviewCount = previewRows.filter((row) => row.status === "VALID").length;

  return (
    <>
      <section className="rediem-import-stage">
        <div>
          <p className="eyebrow">Brand Intake</p>
          <h2>Import DTC and ecommerce targets</h2>
          <p>
            Upload account domains or company websites. The import dedupes by workspace and keeps
            analysis separate so costly research can be controlled from the cockpit.
          </p>
        </div>
        <div className="import-actions">
          <input
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(event) => previewCsv(event.target.files?.[0] ?? null)}
            type="file"
          />
          <button disabled={busy || validPreviewCount === 0} onClick={importCsv} type="button">
            Import {validPreviewCount} valid
          </button>
        </div>
        {notice ? <p className="table-notice">{notice}</p> : null}
      </section>

      <section className="data-panel">
        <div className="panel-header">
          <h2>CSV Preview</h2>
          <p>Required: domain or company website. Optional: companyName, linkedinUrl, industry, notes.</p>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Row</th>
                <th>Domain</th>
                <th>Company</th>
                <th>Industry</th>
                <th>Status</th>
                <th>Issue</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan={6}>
                    Choose a CSV file to preview account rows before import.
                  </td>
                </tr>
              ) : (
                previewRows.map((row) => (
                  <tr key={`${row.rowNumber}-${row.domain}`}>
                    <td>{row.rowNumber}</td>
                    <td>{row.domain || "—"}</td>
                    <td>{row.companyName ?? "—"}</td>
                    <td>{row.industry ?? "—"}</td>
                    <td>
                      <span className={`status ${row.status.toLowerCase()}`}>
                        {formatEnum(row.status)}
                      </span>
                    </td>
                    <td>{row.error ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
