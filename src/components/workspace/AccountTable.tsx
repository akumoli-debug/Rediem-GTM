"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { FormulaValue } from "./FormulaValue";
import type { AccountTableRow, PlaybookOption } from "./types";

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

export function AccountTable({
  rows,
  formulaColumns,
  playbooks,
  signalTypes,
  workspaceId
}: {
  rows: AccountTableRow[];
  formulaColumns: string[];
  playbooks: PlaybookOption[];
  signalTypes: string[];
  workspaceId?: string;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scoreFilter, setScoreFilter] = useState("");
  const [signalType, setSignalType] = useState("");
  const [lastEnriched, setLastEnriched] = useState("");
  const [drawerRow, setDrawerRow] = useState<AccountTableRow | null>(null);
  const [notice, setNotice] = useState("");
  const [csvText, setCsvText] = useState("");
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [triggerResearch, setTriggerResearch] = useState(false);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const selectedPlaybook = playbooks.find((playbook) => playbook.id === selectedPlaybookId);

  const filteredRows = useMemo(() => {
    const minScore = scoreFilter === "" ? null : Number(scoreFilter);
    const enrichedAfter = lastEnriched === "" ? null : new Date(lastEnriched);

    return rows.filter((row) => {
      const scoreMatches =
        minScore === null || (row.accountScore !== null && row.accountScore > minScore);
      const signalMatches =
        signalType === "" || row.signalTypes.includes(signalType);
      const enrichedMatches =
        enrichedAfter === null ||
        (row.lastEnrichedAt !== "Never" && new Date(row.lastEnrichedAt) >= enrichedAfter);

      return scoreMatches && signalMatches && enrichedMatches;
    });
  }, [lastEnriched, rows, scoreFilter, signalType]);

  const allVisibleSelected =
    filteredRows.length > 0 && filteredRows.every((row) => selectedIds.has(row.id));

  function toggleRow(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleVisibleRows() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        filteredRows.forEach((row) => next.delete(row.id));
      } else {
        filteredRows.forEach((row) => next.add(row.id));
      }
      return next;
    });
  }

  function queueAction(action: string, count = 1) {
    const playbookCopy = selectedPlaybook
      ? ` using ${selectedPlaybook.name}`
      : "";
    setNotice(`${action}${playbookCopy} queued for ${count} ${count === 1 ? "row" : "rows"}.`);
  }

  async function previewCsv(file: File | null) {
    if (!file) {
      return;
    }

    const text = await file.text();
    setCsvText(text);
    setImportBusy(true);

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
      setNotice(`Previewed ${result.rows.length} CSV rows.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setImportBusy(false);
    }
  }

  async function importCsv() {
    setImportBusy(true);

    try {
      const response = await fetch("/api/import/accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          csv: csvText,
          triggerResearch,
          playbookId: selectedPlaybookId || undefined
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "CSV import failed.");
      }
      setNotice(
        `Imported ${result.createdCount} accounts, skipped ${result.skippedCount}, researched ${result.researchedCount}.`
      );
      setPreviewRows([]);
      setCsvText("");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setImportBusy(false);
    }
  }

  const validPreviewCount = previewRows.filter((row) => row.status === "VALID").length;

  return (
    <>
      <section className="import-panel">
        <div>
          <h2>Import Accounts</h2>
          <p>
            Upload a CSV with a domain or company website column. Optional columns:
            companyName, linkedinUrl, industry, notes.
          </p>
        </div>
        <div className="import-actions">
          <input
            accept=".csv,text/csv"
            disabled={importBusy}
            onChange={(event) => previewCsv(event.target.files?.[0] ?? null)}
            type="file"
          />
          <label className="checkbox-label">
            <input
              checked={triggerResearch}
              onChange={(event) => setTriggerResearch(event.target.checked)}
              type="checkbox"
            />
            <span>Research after import</span>
          </label>
          <label>
            <span>Playbook</span>
            <select
              onChange={(event) => setSelectedPlaybookId(event.target.value)}
              value={selectedPlaybookId}
            >
              <option value="">No playbook</option>
              {playbooks.map((playbook) => (
                <option key={playbook.id} value={playbook.id}>
                  {playbook.name}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={importBusy || validPreviewCount === 0}
            onClick={importCsv}
            type="button"
          >
            Import {validPreviewCount} valid
          </button>
          <Link className="button secondary" href="/api/export/accounts">
            Export Accounts CSV
          </Link>
          <Link className="button secondary" href="/api/export/people">
            Export People CSV
          </Link>
        </div>
        {previewRows.length > 0 ? (
          <div className="preview-table-wrap">
            <table className="preview-table">
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
                {previewRows.slice(0, 8).map((row) => (
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
                ))}
              </tbody>
            </table>
            {previewRows.length > 8 ? (
              <p className="table-notice">Showing first 8 of {previewRows.length} rows.</p>
            ) : null}
          </div>
        ) : null}
        {selectedPlaybook ? (
          <p className="table-notice">
            {selectedPlaybook.description} Focus: {selectedPlaybook.targetMotion}.
          </p>
        ) : null}
      </section>

      <section className="toolbar-panel">
        <div className="filters">
          <label>
            <span>Account score &gt;</span>
            <input
              min="0"
              max="100"
              onChange={(event) => setScoreFilter(event.target.value)}
              placeholder="70"
              type="number"
              value={scoreFilter}
            />
          </label>
          <label>
            <span>Signal type</span>
            <select onChange={(event) => setSignalType(event.target.value)} value={signalType}>
              <option value="">Any signal</option>
              {signalTypes.map((type) => (
                <option key={type} value={type}>
                  {formatEnum(type)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Last enriched after</span>
            <input
              onChange={(event) => setLastEnriched(event.target.value)}
              type="date"
              value={lastEnriched}
            />
          </label>
        </div>
        <div className="bulk-bar">
          <strong>{selectedIds.size} selected</strong>
          <button
            disabled={selectedIds.size === 0}
            onClick={() => queueAction("Research account", selectedIds.size)}
            type="button"
          >
            Research
          </button>
          <button
            disabled={selectedIds.size === 0}
            onClick={() => queueAction("Buying committee resolution", selectedIds.size)}
            type="button"
          >
            Resolve committee
          </button>
          <button
            disabled={selectedIds.size === 0}
            onClick={() => queueAction("Contact enrichment", selectedIds.size)}
            type="button"
          >
            Enrich contacts
          </button>
        </div>
        {notice ? <p className="table-notice">{notice}</p> : null}
      </section>

      <section className="data-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="select-column">
                  <input
                    aria-label="Select visible accounts"
                    checked={allVisibleSelected}
                    onChange={toggleVisibleRows}
                    type="checkbox"
                  />
                </th>
                <th>Domain</th>
                <th>Name</th>
                <th>Industry</th>
                <th>Employees</th>
                <th>Score</th>
                <th>Latest Signal</th>
                <th>Max Signal</th>
                <th>Recommended Persona</th>
                <th>Last Enriched</th>
                {formulaColumns.map((name) => (
                  <th key={name}>{name}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="select-column">
                    <input
                      aria-label={`Select ${row.name}`}
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      type="checkbox"
                    />
                  </td>
                  <td>{row.domain}</td>
                  <td>{row.name}</td>
                  <td>{row.industry}</td>
                  <td>{row.employeeCount}</td>
                  <td>{formatScore(row.accountScore)}</td>
                  <td>{row.latestSignal}</td>
                  <td>{formatScore(row.maxSignalScore)}</td>
                  <td>{formatEnum(row.recommendedPersona)}</td>
                  <td>{formatDate(row.lastEnrichedAt)}</td>
                  {formulaColumns.map((name) => {
                    const cell = row.formulas.find((formula) => formula.name === name);
                    return (
                      <td key={name}>
                        {cell ? <FormulaValue cell={cell} /> : <span className="muted">—</span>}
                      </td>
                    );
                  })}
                  <td>
                    <div className="row-actions">
                      <button onClick={() => queueAction("Research account")} type="button">
                        Research
                      </button>
                      <button onClick={() => queueAction("Buying committee resolution")} type="button">
                        Committee
                      </button>
                      <button onClick={() => queueAction("Contact enrichment")} type="button">
                        Contacts
                      </button>
                      <button onClick={() => setDrawerRow(row)} type="button">
                        Evidence
                      </button>
                      <button onClick={() => exportRow(row.name, row)} type="button">
                        Export
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan={11 + formulaColumns.length}>
                    No accounts match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {drawerRow ? (
        <EvidenceDrawer
          evidence={drawerRow.evidence}
          onClose={() => setDrawerRow(null)}
          title={drawerRow.name}
        />
      ) : null}
    </>
  );
}

function exportRow(name: string, row: AccountTableRow) {
  const blob = new Blob([JSON.stringify(row, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatDate(value: string) {
  if (value === "Never") {
    return value;
  }

  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function formatEnum(value: string) {
  if (!value) {
    return "—";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatScore(score: number | null) {
  return score === null ? "—" : Math.round(score).toString();
}
