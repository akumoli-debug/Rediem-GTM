import type { EvidenceItem, FormulaCell } from "@/components/workspace/types";

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

export type RediemAccountDetail = {
  row: RediemAccountRow;
  fitBreakdown: Array<{ label: string; score: number }>;
  profileFacts: Array<{ label: string; value: string }>;
  detections: RediemDetectionView[];
  signals: RediemSignalView[];
  activationIdeas: RediemActivationIdeaView[];
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
