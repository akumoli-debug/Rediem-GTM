"use client";

import type { EvidenceItem } from "./types";

export function EvidenceDrawer({
  title,
  evidence,
  onClose
}: {
  title: string;
  evidence: EvidenceItem[];
  onClose: () => void;
}) {
  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        aria-label="Evidence"
        className="evidence-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <span className="eyebrow">Evidence</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="evidence-list">
          {evidence.length === 0 ? (
            <p className="empty-state">
              No field-level evidence has been stored for this row yet.
            </p>
          ) : (
            evidence.map((item) => (
              <article className="evidence-item" key={item.id}>
                <div className="evidence-item-header">
                  <strong>{item.fieldName}</strong>
                  <span>{formatConfidence(item.confidence)}</span>
                </div>
                {item.value ? <p className="evidence-value">{item.value}</p> : null}
                <dl className="evidence-meta">
                  <div>
                    <dt>Provider</dt>
                    <dd>{item.provider ?? "Unknown"}</dd>
                  </div>
                  <div>
                    <dt>Captured</dt>
                    <dd>{formatDateTime(item.capturedAt)}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>
                      {item.sourceUrl ? (
                        <a href={item.sourceUrl}>{item.sourceUrl}</a>
                      ) : (
                        "Not recorded"
                      )}
                    </dd>
                  </div>
                </dl>
                {item.rawExcerpt ? (
                  <blockquote className="raw-excerpt">{item.rawExcerpt}</blockquote>
                ) : null}
              </article>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

function formatConfidence(confidence: number | null) {
  if (confidence === null) {
    return "Confidence n/a";
  }

  return `${Math.round(confidence * 100)}% confidence`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

