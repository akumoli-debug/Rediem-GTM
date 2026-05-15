"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EvidenceDrawer } from "@/components/workspace/EvidenceDrawer";
import type { RediemAccountRow, RediemMetric, RediemTierLabel } from "./types";

const categoryFilters = ["beauty", "apparel", "beverage", "wellness"] as const;

export function RediemAccountTable({
  rows,
  metrics
}: {
  rows: RediemAccountRow[];
  metrics: RediemMetric[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerRow, setDrawerRow] = useState<RediemAccountRow | null>(null);
  const [notice, setNotice] = useState("");
  const [tierOneOnly, setTierOneOnly] = useState(false);
  const [shopifyOnly, setShopifyOnly] = useState(false);
  const [pointsLoyalty, setPointsLoyalty] = useState(false);
  const [noLoyalty, setNoLoyalty] = useState(false);
  const [subscriptionOnly, setSubscriptionOnly] = useState(false);
  const [reviewsOnly, setReviewsOnly] = useState(false);
  const [category, setCategory] = useState("");
  const [migrationThreshold, setMigrationThreshold] = useState(false);
  const [communityThreshold, setCommunityThreshold] = useState(false);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (tierOneOnly && row.tier !== "Tier 1") {
          return false;
        }
        if (shopifyOnly && !row.shopifyDetected) {
          return false;
        }
        if (pointsLoyalty && !row.loyaltyType.toLowerCase().includes("point")) {
          return false;
        }
        if (noLoyalty && row.hasLoyaltyProgram !== false) {
          return false;
        }
        if (subscriptionOnly && !row.hasSubscription) {
          return false;
        }
        if (reviewsOnly && !row.hasReviews) {
          return false;
        }
        if (category && !row.category.toLowerCase().includes(category)) {
          return false;
        }
        if (migrationThreshold && (row.migrationPainScore ?? 0) <= 70) {
          return false;
        }
        if (communityThreshold && (row.communityReadinessScore ?? 0) <= 70) {
          return false;
        }
        return true;
      }),
    [
      category,
      communityThreshold,
      migrationThreshold,
      noLoyalty,
      pointsLoyalty,
      reviewsOnly,
      rows,
      shopifyOnly,
      subscriptionOnly,
      tierOneOnly
    ]
  );

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
    setNotice(`${action} queued for ${count} ${count === 1 ? "brand" : "brands"}.`);
  }

  return (
    <>
      <section className="metrics compact-metrics rediem-metrics" aria-label="Rediem metrics">
        {metrics.map((metric) => (
          <div className="metric-card rediem-metric-card" key={metric.label}>
            <span className="metric-label">{metric.label}</span>
            <strong className="metric-value">{metric.value}</strong>
            {metric.detail ? <p>{metric.detail}</p> : null}
          </div>
        ))}
      </section>

      <section className="toolbar-panel rediem-control-panel">
        <div className="rediem-filter-grid">
          <FilterToggle checked={tierOneOnly} label="Tier 1 only" onChange={setTierOneOnly} />
          <FilterToggle checked={shopifyOnly} label="Shopify detected" onChange={setShopifyOnly} />
          <FilterToggle checked={pointsLoyalty} label="Has points loyalty" onChange={setPointsLoyalty} />
          <FilterToggle checked={noLoyalty} label="No loyalty program" onChange={setNoLoyalty} />
          <FilterToggle checked={subscriptionOnly} label="Has subscription" onChange={setSubscriptionOnly} />
          <FilterToggle checked={reviewsOnly} label="Has reviews" onChange={setReviewsOnly} />
          <FilterToggle
            checked={migrationThreshold}
            label="Migration pain > 70"
            onChange={setMigrationThreshold}
          />
          <FilterToggle
            checked={communityThreshold}
            label="Community readiness > 70"
            onChange={setCommunityThreshold}
          />
          <label className="rediem-select-filter">
            <span>Category</span>
            <select onChange={(event) => setCategory(event.target.value)} value={category}>
              <option value="">Beauty/apparel/beverage/wellness</option>
              {categoryFilters.map((item) => (
                <option key={item} value={item}>
                  {capitalize(item)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="bulk-bar">
          <strong>{selectedIds.size} selected</strong>
          <button
            disabled={selectedIds.size === 0}
            onClick={() => queueAction("Rediem analysis", selectedIds.size)}
            type="button"
          >
            Analyze
          </button>
          <button
            disabled={selectedIds.size === 0}
            onClick={() => queueAction("Buying committee resolution", selectedIds.size)}
            type="button"
          >
            Committee
          </button>
          <button
            disabled={selectedIds.size === 0}
            onClick={() => queueAction("Activation idea generation", selectedIds.size)}
            type="button"
          >
            Ideas
          </button>
          <Link className="button secondary" href="/rediem/import">
            Import Brands
          </Link>
        </div>
        {notice ? <p className="table-notice">{notice}</p> : null}
      </section>

      <section className="data-panel rediem-table-panel">
        <div className="table-scroll">
          <table className="data-table rediem-data-table">
            <thead>
              <tr>
                <th className="select-column">
                  <input
                    aria-label="Select visible Rediem accounts"
                    checked={allVisibleSelected}
                    onChange={toggleVisibleRows}
                    type="checkbox"
                  />
                </th>
                <th>Brand</th>
                <th>Domain</th>
                <th>Category</th>
                <th>Commerce</th>
                <th>Loyalty Provider</th>
                <th>Loyalty Type</th>
                <th>Subscriptions</th>
                <th>Social/Community</th>
                <th>Loyalty Pain</th>
                <th>Migration Pain</th>
                <th>Agentic Commerce</th>
                <th>Rediem Fit</th>
                <th>Tier</th>
                <th>Recommended Play</th>
                <th>Last Analyzed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="select-column">
                    <input
                      aria-label={`Select ${row.brand}`}
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      type="checkbox"
                    />
                  </td>
                  <td>
                    <Link className="rediem-brand-link" href={`/rediem/accounts/${row.id}`}>
                      {row.brand}
                    </Link>
                  </td>
                  <td>{row.domain}</td>
                  <td>{row.category}</td>
                  <td>{row.ecommercePlatform}</td>
                  <td>{row.loyaltyProvider}</td>
                  <td>{row.loyaltyType}</td>
                  <td>{formatBoolean(row.hasSubscription)}</td>
                  <td>{formatScore(row.socialCommunityScore)}</td>
                  <td>{formatScore(row.loyaltyPainScore)}</td>
                  <td>{formatScore(row.migrationPainScore)}</td>
                  <td>{formatScore(row.agenticCommerceScore)}</td>
                  <td>{formatScore(row.rediemFitScore)}</td>
                  <td>
                    <span className={`rediem-tier ${tierClass(row.tier)}`}>{row.tier}</span>
                  </td>
                  <td>{row.recommendedPlay}</td>
                  <td>{formatDate(row.lastAnalyzed)}</td>
                  <td>
                    <div className="row-actions rediem-row-actions">
                      <Link className="button secondary" href={`/rediem/accounts/${row.id}`}>
                        Open
                      </Link>
                      <button onClick={() => queueAction("Rediem analysis")} type="button">
                        Analyze
                      </button>
                      <button onClick={() => setDrawerRow(row)} type="button">
                        Evidence
                      </button>
                      <button onClick={() => exportRow(row)} type="button">
                        Export
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan={17}>
                    No Rediem accounts match the current filters.
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
          title={drawerRow.brand}
        />
      ) : null}
    </>
  );
}

function FilterToggle({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="rediem-filter-toggle">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}

function exportRow(row: RediemAccountRow) {
  const blob = new Blob([JSON.stringify(row, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${row.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-rediem.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatBoolean(value: boolean | null) {
  if (value === null) {
    return "Unknown";
  }

  return value ? "Yes" : "No";
}

function formatScore(value: number | null) {
  return value === null ? "—" : Math.round(value).toString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function capitalize(value: string) {
  return value[0]?.toUpperCase() + value.slice(1);
}

function tierClass(tier: RediemTierLabel) {
  return tier.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
