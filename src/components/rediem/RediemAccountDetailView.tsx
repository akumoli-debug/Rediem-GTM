"use client";

import { useState } from "react";
import { EvidenceDrawer } from "@/components/workspace/EvidenceDrawer";
import { FormulaValue } from "@/components/workspace/FormulaValue";
import { CommunityFlywheelPanel } from "./CommunityFlywheelPanel";
import { DisplacementWedgePanel } from "./DisplacementWedgePanel";
import { GtmDiagnosticsPanel } from "./GtmDiagnosticsPanel";
import { ParticipationLeakPanel } from "./ParticipationLeakPanel";
import { RecommendedPlaybookPanel } from "./RecommendedPlaybookPanel";
import { ScoreBar } from "./ScoreBar";
import type { RediemAccountDetail, RediemGtmFeedbackStatus } from "./types";

export function RediemAccountDetailView({ detail }: { detail: RediemAccountDetail }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [notice, setNotice] = useState("");
  const [feedback, setFeedback] = useState(detail.feedback);
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
          <div className="rediem-header-meta">
            <span className={`rediem-freshness ${row.analysisFreshness.status.toLowerCase()}`}>
              {row.analysisFreshness.status}
            </span>
            <span className={`status ${row.confidence.isLowConfidence ? "risky" : "ready"}`}>
              {formatConfidence(row.confidence.score)} · {row.confidence.label}
            </span>
            <span className={`status ${row.outboundReadiness.status === "OUTBOUND_READY" ? "ready" : "risky"}`}>
              {formatReadiness(row.outboundReadiness.status)}
            </span>
          </div>
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
      {row.analysisFreshness.status !== "Fresh" || row.outboundReadiness.reasons.length > 0 ? (
        <section className="rediem-review-banner">
          <strong>
            {row.analysisFreshness.isStale
              ? "Refresh required before outbound"
              : "Review freshness before outbound"}
          </strong>
          <p>
            Last analyzed {formatDate(row.lastAnalyzed)}. Rediem treats analysis older than{" "}
            {row.analysisFreshness.staleAfterDays} days as stale.
          </p>
          {row.outboundReadiness.reasons.length > 0 ? (
            <ul>
              {row.outboundReadiness.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="rediem-cockpit-grid">
        <div className="rediem-cockpit-main">
          <CommunityFlywheelPanel detail={detail} />

          <div className="rediem-priority-grid">
            <GtmDiagnosticsPanel
              diagnostics={detail.topDiagnostics}
              diagnosticDetails={detail.diagnosticDetails}
              recommendedPlaybook={detail.recommendedPlaybook}
            />
            <ParticipationLeakPanel leak={detail.primaryParticipationLeak} />
          </div>

          <RecommendedPlaybookPanel
            fallbackAngle={detail.suggestedOutboundAngle}
            playbook={detail.recommendedPlaybook}
          />

          <section className="data-panel rediem-card">
            <div className="panel-header">
              <h2>Supporting Fit Breakdown</h2>
              <p>Weighted fit across community energy, participation capture, retail bridge, mission strength, and stack opportunity.</p>
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
          <AEFeedbackPanel
            feedback={feedback}
            onChange={setFeedback}
            onNotice={(message) => setNotice(message)}
            playbookTitle={detail.recommendedPlaybook?.title ?? "No selected playbook"}
            reviewerLabel="Current AE"
          />

          <DisplacementWedgePanel
            evidenceUrls={detail.evidenceUrls}
            wedge={detail.displacementWedge}
          />

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

function AEFeedbackPanel({
  feedback,
  onChange,
  onNotice,
  playbookTitle,
  reviewerLabel
}: {
  feedback: RediemAccountDetail["feedback"];
  onChange: (feedback: RediemAccountDetail["feedback"]) => void;
  onNotice: (message: string) => void;
  playbookTitle: string;
  reviewerLabel: string;
}) {
  function selectStatus(status: RediemGtmFeedbackStatus) {
    const next = {
      ...feedback,
      status,
      playbookAccepted:
        status === "ACCEPT_PLAY"
          ? true
          : status === "OVERRIDE_PLAY" || status === "NOT_A_FIT"
            ? false
            : null,
      reviewedAt: new Date().toISOString(),
      reviewedBy: feedback.reviewedBy ?? reviewerLabel
    };
    onChange(next);
    onNotice("AE feedback captured locally. Backend persistence is ready for wiring.");
  }

  return (
    <section className="data-panel rediem-card">
      <div className="panel-header">
        <h2>AE Feedback</h2>
        <p>Lightweight review loop for playbook acceptance, overrides, and research needs.</p>
      </div>
      <div className="rediem-feedback-body">
        <div className="rediem-feedback-play">
          <span>Recommended play</span>
          <strong>{playbookTitle}</strong>
        </div>
        <div className="rediem-feedback-actions">
          <button onClick={() => selectStatus("ACCEPT_PLAY")} type="button">
            Accept play
          </button>
          <button onClick={() => selectStatus("OVERRIDE_PLAY")} type="button">
            Override play
          </button>
          <button onClick={() => selectStatus("NEEDS_RESEARCH")} type="button">
            Needs research
          </button>
          <button onClick={() => selectStatus("NOT_A_FIT")} type="button">
            Not a fit
          </button>
        </div>
        <label className="rediem-feedback-field">
          <span>Override reason</span>
          <input
            onChange={(event) =>
              onChange({ ...feedback, playbookOverrideReason: event.target.value })
            }
            placeholder="Different buyer, weak evidence, timing, disqualifier..."
            value={feedback.playbookOverrideReason ?? ""}
          />
        </label>
        <label className="rediem-feedback-field">
          <span>AE notes</span>
          <textarea
            onChange={(event) => onChange({ ...feedback, aeNotes: event.target.value })}
            placeholder="Notes stay local until backend mutation is wired."
            rows={4}
            value={feedback.aeNotes}
          />
        </label>
        <small>
          {feedback.status ? formatEnum(feedback.status) : "No AE review yet"}
          {feedback.reviewedAt ? ` · ${formatDate(feedback.reviewedAt)}` : ""}
        </small>
      </div>
    </section>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatReadiness(value: string) {
  return formatEnum(value);
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
