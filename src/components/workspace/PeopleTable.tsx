"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { FormulaValue } from "./FormulaValue";
import type { PeopleTableRow } from "./types";

export function PeopleTable({
  rows,
  formulaColumns,
  emailStatuses,
  personaTypes
}: {
  rows: PeopleTableRow[];
  formulaColumns: string[];
  emailStatuses: string[];
  personaTypes: string[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailStatus, setEmailStatus] = useState("");
  const [personaType, setPersonaType] = useState("");
  const [roleScoreFilter, setRoleScoreFilter] = useState("");
  const [lastEnriched, setLastEnriched] = useState("");
  const [drawerRow, setDrawerRow] = useState<PeopleTableRow | null>(null);
  const [notice, setNotice] = useState("");

  const filteredRows = useMemo(() => {
    const minScore = roleScoreFilter === "" ? null : Number(roleScoreFilter);
    const enrichedAfter = lastEnriched === "" ? null : new Date(lastEnriched);

    return rows.filter((row) => {
      const emailMatches = emailStatus === "" || row.emailStatus === emailStatus;
      const personaMatches = personaType === "" || row.personaType === personaType;
      const scoreMatches =
        minScore === null || (row.roleScore !== null && row.roleScore > minScore);
      const enrichedMatches =
        enrichedAfter === null ||
        (row.lastEnrichedAt !== "Never" && new Date(row.lastEnrichedAt) >= enrichedAfter);

      return emailMatches && personaMatches && scoreMatches && enrichedMatches;
    });
  }, [emailStatus, lastEnriched, personaType, roleScoreFilter, rows]);

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
    setNotice(`${action} queued for ${count} ${count === 1 ? "row" : "rows"}.`);
  }

  return (
    <>
      <section className="toolbar-panel">
        <div className="filters">
          <label>
            <span>Email status</span>
            <select onChange={(event) => setEmailStatus(event.target.value)} value={emailStatus}>
              <option value="">Any status</option>
              {emailStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatEnum(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Persona</span>
            <select onChange={(event) => setPersonaType(event.target.value)} value={personaType}>
              <option value="">Any persona</option>
              {personaTypes.map((type) => (
                <option key={type} value={type}>
                  {formatEnum(type)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Role score &gt;</span>
            <input
              min="0"
              max="100"
              onChange={(event) => setRoleScoreFilter(event.target.value)}
              placeholder="70"
              type="number"
              value={roleScoreFilter}
            />
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
            onClick={() => queueAction("Contact enrichment", selectedIds.size)}
            type="button"
          >
            Enrich contact
          </button>
          <button
            disabled={selectedIds.size === 0}
            onClick={() => queueAction("Email verification", selectedIds.size)}
            type="button"
          >
            Verify email
          </button>
          <button
            disabled={selectedIds.size === 0}
            onClick={() => queueAction("Suppression", selectedIds.size)}
            type="button"
          >
            Mark suppressed
          </button>
          <Link className="button secondary" href="/api/export/people">
            Export People CSV
          </Link>
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
                    aria-label="Select visible people"
                    checked={allVisibleSelected}
                    onChange={toggleVisibleRows}
                    type="checkbox"
                  />
                </th>
                <th>Full Name</th>
                <th>Account</th>
                <th>Title</th>
                <th>Persona</th>
                <th>Role Score</th>
                <th>Email</th>
                <th>Email Status</th>
                <th>Contactability</th>
                <th>LinkedIn URL</th>
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
                      aria-label={`Select ${row.fullName}`}
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      type="checkbox"
                    />
                  </td>
                  <td>{row.fullName}</td>
                  <td>{row.account}</td>
                  <td>{row.title}</td>
                  <td>{formatEnum(row.personaType)}</td>
                  <td>{formatScore(row.roleScore)}</td>
                  <td>{row.email}</td>
                  <td>
                    <span className={`status ${row.emailStatus.toLowerCase()}`}>
                      {formatEnum(row.emailStatus)}
                    </span>
                  </td>
                  <td>{formatScore(row.contactabilityScore)}</td>
                  <td>
                    {row.linkedinUrl ? <a href={row.linkedinUrl}>{row.linkedinUrl}</a> : "—"}
                  </td>
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
                      <button onClick={() => queueAction("Contact enrichment")} type="button">
                        Enrich
                      </button>
                      <button onClick={() => queueAction("Email verification")} type="button">
                        Verify
                      </button>
                      <button onClick={() => setDrawerRow(row)} type="button">
                        Evidence
                      </button>
                      <button onClick={() => queueAction("Suppression")} type="button">
                        Suppress
                      </button>
                      <button onClick={() => exportRow(row.fullName, row)} type="button">
                        Export
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan={11 + formulaColumns.length}>
                    No people match the current filters.
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
          title={drawerRow.fullName}
        />
      ) : null}
    </>
  );
}

function exportRow(name: string, row: PeopleTableRow) {
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
