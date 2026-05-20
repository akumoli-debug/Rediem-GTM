import type { EvidenceItem, FormulaCell } from "@/components/workspace/types";
import type {
  RediemAnalysisFreshness,
  RediemConfidenceSummary,
  RediemOutboundReadiness,
  RediemReadiness
} from "@/server/rediem/accountHealth";

export type RediemTierLabel = "Tier 1" | "Tier 2" | "Tier 3" | "Disqualify" | "Unanalyzed";

export type RediemAccountRow = {
  id: string;
  brand: string;
  domain: string;
  category: string;
  ecommercePlatform: string;
  loyaltyProvider: string;
  loyaltyType: string;
  hasSubscription: boolean | null;
  hasReviews: boolean | null;
  shopifyDetected: boolean | null;
  hasLoyaltyProgram: boolean | null;
  socialCommunityScore: number | null;
  loyaltyPainScore: number | null;
  migrationPainScore: number | null;
  communityReadinessScore: number | null;
  agenticCommerceScore: number | null;
  rediemFitScore: number | null;
  tier: RediemTierLabel;
  recommendedPlay: string;
  lastAnalyzed: string;
  analysisFreshness: RediemAnalysisFreshness;
  confidence: RediemConfidenceSummary;
  outboundReadiness: RediemOutboundReadiness;
  evidence: EvidenceItem[];
  formulaOutputs: FormulaCell[];
};

export type RediemMetric = {
  label: string;
  value: string;
  detail?: string;
};

export type RediemBuyer = {
  id: string;
  fullName: string;
  title: string;
  email: string;
  score: number | null;
  personaGroup: string;
  angle: string;
};

export type RediemActivationIdeaView = {
  id: string;
  title: string;
  type: string;
  targetBehavior: string;
  expectedImpact: string;
  description: string;
  confidence: number | null;
  evidenceIds: string[];
};

export type RediemDetectionView = {
  id: string;
  category: string;
  vendor: string;
  confidence: number | null;
  sourceUrl: string | null;
  evidence: string | null;
};

export type RediemSignalView = {
  id: string;
  type: string;
  title: string;
  totalScore: number | null;
  sourceUrl: string | null;
};

export type RediemCommunityFlywheelView = {
  estimatedCfr: number | null;
  cfrTier: string;
  cfrConfidence: number | null;
  earnedCommunityGrowth: number | null;
  subsidizedTransactionalGrowth: number | null;
  explanation: string[];
  lowConfidence: boolean;
};

export type RediemGtmDiagnosticView = {
  metricId: string;
  label: string;
  score: number;
  tier: string;
  confidence: number;
  confidenceLabel: RediemConfidenceSummary["label"];
  evidenceCount: number;
  explanation: string;
  sourceUrls: string[];
};

export type RediemParticipationLeakView = {
  leakType: string;
  severity: number;
  description: string;
  recommendedFix: string;
  evidenceIds: string[];
  sourceUrls: string[];
};

export type RediemRecommendedPlaybookView = {
  id: string;
  title: string;
  thesis: string;
  readiness: RediemReadiness;
  readinessReasons: string[];
  confidence: number;
  confidenceLabel: RediemConfidenceSummary["label"];
  evidenceCount: number;
  buyerPersona: string;
  outboundAngle: string;
  activationIdea: string;
  whySelected: string[];
  sourceUrls: string[];
};

export type RediemDisplacementWedgeView = {
  vendor: string;
  category: string;
  likelyCurrentMotion: string;
  whatNotToSay: string;
  rediemWedge: string;
  migrationRisk: string;
  recommendedAngle: string;
  buyerPersona: string;
  supportingDiagnostics: string[];
  confidence: number;
  confidenceLabel: RediemConfidenceSummary["label"];
  evidenceCount: number;
  sourceUrls: string[];
};

export type RediemGtmFeedbackStatus =
  | "ACCEPT_PLAY"
  | "OVERRIDE_PLAY"
  | "NEEDS_RESEARCH"
  | "NOT_A_FIT";

export type RediemGtmFeedback = {
  playbookAccepted: boolean | null;
  playbookOverrideReason: string | null;
  aeNotes: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  status: RediemGtmFeedbackStatus | null;
};

export type RediemAccountDetail = {
  row: RediemAccountRow;
  fitBreakdown: Array<{ label: string; score: number }>;
  profileFacts: Array<{ label: string; value: string }>;
  detections: RediemDetectionView[];
  signals: RediemSignalView[];
  activationIdeas: RediemActivationIdeaView[];
  communityFlywheel: RediemCommunityFlywheelView;
  topDiagnostics: RediemGtmDiagnosticView[];
  diagnosticDetails: RediemGtmDiagnosticView[];
  primaryParticipationLeak: RediemParticipationLeakView | null;
  recommendedPlaybook: RediemRecommendedPlaybookView | null;
  displacementWedge: RediemDisplacementWedgeView | null;
  feedback: RediemGtmFeedback;
  evidenceUrls: string[];
  buyerCommittee: {
    economicBuyers: RediemBuyer[];
    operatorBuyers: RediemBuyer[];
    technicalBuyers: RediemBuyer[];
    influencers: RediemBuyer[];
  };
  suggestedOutboundAngle: string;
};

export type RediemAccountsData = {
  workspaceId?: string;
  metrics: RediemMetric[];
  rows: RediemAccountRow[];
};
