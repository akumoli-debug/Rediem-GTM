"use client";

import { useState } from "react";
import { EvidenceDrawer } from "@/components/workspace/EvidenceDrawer";
import { FormulaValue } from "@/components/workspace/FormulaValue";
import { ScoreBar } from "./ScoreBar";
import type { RediemAccountDetail } from "./types";

export function RediemAccountDetailView({ detail }: { detail: RediemAccountDetail }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [notice, setNotice] = useState("");
  const { row } = detail;

  function queueAction(action: string) {
    setNotice(`${action} queued for ${row.brand}.`);
  }

  return (
    <>
      <section className="rediem-detail-header">
        <div>
          <p className="eyebrow">Brand Account</p>
          <h2>{row.brand}</h2>
          <p>{row.domain}</p>
        </div>
        <div className="rediem-detail-actions">
          <button onClick={() => queueAction("Rediem analysis")} type="button">
            Analyze
          </button>
          <button onClick={() => queueAction("Buying committee resolution")} type="button">
            Committee
          </button>
          <button onClick={() => queueAction("Activation idea generation")} type="button">
            Ideas
          </button>
          <button onClick={() => setShowEvidence(true)} type="button">
            Evidence
          </button>
          <button onClick={() => exportDetail(detail)} type="button">
            Export row
          </button>
        </div>
      </section>
      {notice ? <p className="table-notice rediem-detail-notice">{notice}</p> : null}

      <section className="rediem-cockpit-grid">
        <div className="rediem-cockpit-main">
          <section className="data-panel rediem-card">
            <div className="panel-header">
              <h2>Rediem Fit Breakdown</h2>
              <p>Weighted fit across commerce stack, retention motion, migration opportunity, and activation readiness.</p>
            </div>
            <div className="rediem-breakdown">
              <div className="rediem-fit-gauge">
                <span>Rediem Fit</span>
                <strong>{formatScore(row.rediemFitScore)}</strong>
                <em>{row.tier}</em>
              </div>
              <div className="rediem-score-list">
                {detail.fitBreakdown.map((item) => (
                  <ScoreBar key={item.label} label={item.label} score={item.score} />
                ))}
                {detail.fitBreakdown.length === 0 ? (
                  <p className="empty-state">Run Rediem analysis to populate the fit breakdown.</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="data-panel rediem-card">
            <div className="panel-header">
              <h2>Loyalty Program Analysis</h2>
              <p>Program maturity, subscription hooks, referral surface area, and community participation signals.</p>
            </div>
            <div className="rediem-fact-grid">
              {detail.profileFacts.map((fact) => (
                <div className="rediem-fact" key={fact.label}>
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="data-panel rediem-card">
            <div className="panel-header">
              <h2>Activation Ideas</h2>
              <p>Evidence-backed plays generated from detected brand facts.</p>
            </div>
            <div className="rediem-idea-list">
              {detail.activationIdeas.length === 0 ? (
                <p className="empty-state">No activation ideas stored for this brand yet.</p>
              ) : (
                detail.activationIdeas.map((idea) => (
                  <article className="rediem-idea-card" key={idea.id}>
                    <div>
                      <span className="status cached">{formatEnum(idea.type)}</span>
                      <strong>{idea.title}</strong>
                    </div>
                    <p>{idea.targetBehavior}</p>
                    <p>{idea.expectedImpact}</p>
                    <small>{formatConfidence(idea.confidence)} · {idea.evidenceIds.length} evidence links</small>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="data-panel rediem-card">
            <div className="panel-header">
              <h2>Buyer Committee</h2>
              <p>Rediem-specific buyer lanes for executive, operator, technical, and influencer paths.</p>
            </div>
            <div className="rediem-buyer-grid">
              <BuyerGroup label="Economic buyers" people={detail.buyerCommittee.economicBuyers} />
              <BuyerGroup label="Operator buyers" people={detail.buyerCommittee.operatorBuyers} />
              <BuyerGroup label="Technical buyers" people={detail.buyerCommittee.technicalBuyers} />
              <BuyerGroup label="Influencers" people={detail.buyerCommittee.influencers} />
            </div>
          </section>
        </div>

        <aside className="rediem-cockpit-side">
          <section className="data-panel rediem-card">
            <div className="panel-header">
              <h2>Suggested Outbound Angle</h2>
              <p>Use only when the evidence below supports the claim.</p>
            </div>
            <p className="rediem-angle">{detail.suggestedOutboundAngle}</p>
          </section>

          <section className="data-panel rediem-card">
            <div className="panel-header">
              <h2>Detected Stack</h2>
              <p>Commerce, loyalty, reviews, subscription, referral, email, and SMS detections.</p>
            </div>
            <div className="settings-list">
              {detail.detections.length === 0 ? (
                <p className="empty-state">No stack detections stored.</p>
              ) : (
                detail.detections.map((detection) => (
                  <div className="settings-row" key={detection.id}>
                    <span>{formatEnum(detection.category)} · {detection.vendor}</span>
                    <strong>{formatConfidence(detection.confidence)}</strong>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="data-panel rediem-card">
            <div className="panel-header">
              <h2>Signals</h2>
              <p>Recent evidence-backed account triggers.</p>
            </div>
            <div className="timeline-list">
              {detail.signals.length === 0 ? (
                <p className="empty-state">No signals stored.</p>
              ) : (
                detail.signals.map((signal) => (
                  <div className="timeline-item" key={signal.id}>
                    <span>{formatEnum(signal.type)} · {formatScore(signal.totalScore)}</span>
                    <strong>{signal.title}</strong>
                    <p>{signal.sourceUrl ?? "No source URL"}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="data-panel rediem-card">
            <div className="panel-header">
              <h2>Formula Outputs</h2>
              <p>Installed formula columns for this account.</p>
            </div>
            <div className="settings-list">
              {row.formulaOutputs.length === 0 ? (
                <p className="empty-state">No formula outputs found.</p>
              ) : (
                row.formulaOutputs.map((formula) => (
                  <div className="settings-row" key={formula.columnId}>
                    <span>{formula.name}</span>
                    <strong>
                      <FormulaValue cell={formula} />
                    </strong>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </section>

      {showEvidence ? (
        <EvidenceDrawer
          evidence={row.evidence}
          onClose={() => setShowEvidence(false)}
          title={row.brand}
        />
      ) : null}
    </>
  );
}

function BuyerGroup({
  label,
  people
}: {
  label: string;
  people: RediemAccountDetail["buyerCommittee"]["economicBuyers"];
}) {
  return (
    <section className="rediem-buyer-group">
      <h3>{label}</h3>
      {people.length === 0 ? (
        <p className="muted">No matching people stored.</p>
      ) : (
        people.map((person) => (
          <article key={person.id}>
            <strong>{person.fullName}</strong>
            <span>{person.title}</span>
            <small>{formatScore(person.score)} · {person.angle}</small>
          </article>
        ))
      )}
    </section>
  );
}

function exportDetail(detail: RediemAccountDetail) {
  const blob = new Blob([JSON.stringify(detail, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${detail.row.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-rediem-detail.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatScore(value: number | null) {
  return value === null ? "—" : Math.round(value).toString();
}

function formatConfidence(value: number | null) {
  return value === null ? "Confidence n/a" : `${Math.round(value * 100)}%`;
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
