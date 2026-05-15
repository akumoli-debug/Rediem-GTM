import assert from "node:assert/strict";
import { test } from "node:test";
import { extractDependencies } from "../src/server/formulas/dependencies";
import { evaluateFormula } from "../src/server/formulas/evaluator";
import { parseFormula, tokenize } from "../src/server/formulas/parser";
import {
  addFormulaTemplateToWorkspace,
  previewFormulaTemplate
} from "../src/server/formulas/service";
import { formulaTemplates } from "../src/server/formulas/templates";
import { FormulaError, type FormulaContext } from "../src/server/formulas/types";

const NOW = new Date("2026-05-14T12:00:00.000Z");

const context: FormulaContext = {
  account: {
    domain: "northstar.example",
    name: "Northstar Robotics",
    accountScore: 86,
    employeeCount: 420,
    careersSummary: "Hiring RevOps and enterprise sales operations roles",
    pricingSummary: "Enterprise plan with annual contracts",
    ecommercePlatformScore: 92,
    shopifyDetected: true,
    shopifyPlusLikely: true,
    brandCategory: "Beauty",
    hasSubscription: true,
    hasLoyaltyProgram: true,
    loyaltyProgramType: "Points and VIP tiers",
    hasReferralProgram: true,
    hasReviews: true,
    hasUGC: true,
    hasRetailPresence: true,
    instagramUrl: "https://instagram.com/northstar",
    tiktokUrl: "https://tiktok.com/@northstar",
    socialCommunityScore: 88,
    sustainabilityAngle: "Refillable packaging",
    missionDrivenAngle: "Ingredient education",
    rediemFitScore: 93,
    loyaltyMaturityScore: 82,
    communityReadinessScore: 91,
    migrationPainScore: 76,
    agenticCommerceScore: 84,
    estimatedCfr: 0.82,
    cfrConfidence: 0.68,
    cfrTier: "Emerging Community Loop",
    verifiedParticipationValue: 44,
    repeatParticipationRate: 62,
    advocacyConversionRate: 58,
    zeroPartyCompletionRate: 24,
    retentionLiftValue: 66,
    discountDependency: 72,
    rewardCostRatio: 84,
    paidCacDependency: 40,
    churnRecoveryCost: 52,
    recommendedPlay: "VIP_TIER_MIGRATION"
  },
  brand: {
    ecommercePlatformScore: 92,
    shopifyDetected: true,
    shopifyPlusLikely: true,
    brandCategory: "Beauty",
    hasSubscription: true,
    hasLoyaltyProgram: true,
    loyaltyProgramType: "points",
    hasReferralProgram: true,
    hasReviews: true,
    hasUGC: true,
    hasRetailPresence: true,
    instagramUrl: "https://instagram.com/northstar",
    tiktokUrl: "https://tiktok.com/@northstar",
    socialCommunityScore: 88,
    sustainabilityAngle: "Refillable packaging",
    missionDrivenAngle: "Ingredient education",
    rediemFitScore: 93,
    loyaltyMaturityScore: 82,
    loyaltyPainScore: 95,
    communityReadinessScore: 91,
    migrationPainScore: 76,
    agenticCommerceScore: 84,
    estimatedCfr: 0.82,
    cfrConfidence: 0.68,
    cfrTier: "Emerging Community Loop",
    verifiedParticipationValue: 44,
    repeatParticipationRate: 62,
    advocacyConversionRate: 58,
    zeroPartyCompletionRate: 24,
    retentionLiftValue: 66,
    discountDependency: 72,
    rewardCostRatio: 84,
    paidCacDependency: 40,
    churnRecoveryCost: 52,
    recommendedPlay: "VIP_TIER_MIGRATION"
  },
  person: {
    fullName: "Maya Chen",
    title: "Director of RevOps",
    email: "maya@northstar.example",
    emailStatus: "VERIFIED",
    roleScore: 88,
    contactabilityScore: 92
  },
  signal: {
    maxScore: 91,
    latestSignalDate: "2026-05-01T12:00:00.000Z",
    types: ["HIRING", "EXPANSION"]
  }
};

function value(expression: string) {
  return evaluateFormula(expression, context, { now: NOW }).value;
}

function createFormulaTemplateClient() {
  let idCounter = 1;
  const account = {
    id: "account_1",
    workspaceId: "workspace_1",
    domain: "northstar.example",
    name: "Northstar Robotics",
    accountScore: 86,
    employeeCount: 420,
    careersSummary: "Hiring RevOps and enterprise sales operations roles",
    pricingSummary: "Enterprise plan with annual contracts",
    createdAt: NOW
  };
  const person = {
    id: "person_1",
    workspaceId: "workspace_1",
    accountId: "account_1",
    fullName: "Maya Chen",
    title: "Director of RevOps",
    emailStatus: "VERIFIED",
    roleScore: 88,
    contactabilityScore: 92,
    createdAt: NOW
  };
  const templates = [
    {
      id: "template_account_tier",
      ...formulaTemplates.find((template) => template.key === "account-tier")!
    },
    {
      id: "template_sequence_status",
      ...formulaTemplates.find((template) => template.key === "person-sequence-status")!
    }
  ];
  const columns: Array<{
    id: string;
    workspaceId: string;
    name: string;
    scope: "ACCOUNT" | "PERSON";
    expression: string;
    outputType: "STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "JSON";
    enabled: boolean;
  }> = [];
  const results: Array<{
    formulaColumnId: string;
    entityType: "ACCOUNT" | "PERSON";
    entityId: string;
    value?: unknown;
    error?: string | null;
  }> = [];

  return {
    formulaTemplate: {
      async findFirst(args: { where: { id: string } }) {
        return templates.find((template) => template.id === args.where.id) ?? null;
      }
    },
    formulaColumn: {
      async findFirst(args: {
        where: {
          id?: string;
          workspaceId?: string;
          name?: string;
          scope?: "ACCOUNT" | "PERSON";
        };
      }) {
        return (
          columns.find((column) => {
            if (args.where.id) {
              return column.id === args.where.id;
            }

            return (
              column.workspaceId === args.where.workspaceId &&
              column.name === args.where.name &&
              column.scope === args.where.scope
            );
          }) ?? null
        );
      },
      async create(args: {
        data: {
          workspaceId: string;
          name: string;
          scope: "ACCOUNT" | "PERSON";
          expression: string;
          outputType: "STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "JSON";
          enabled: boolean;
        };
      }) {
        const column = { id: `formula_${idCounter++}`, ...args.data };
        columns.push(column);
        return column;
      },
      async findMany() {
        return columns;
      }
    },
    formulaResult: {
      async upsert(args: {
        where: {
          formulaColumnId_entityType_entityId: {
            formulaColumnId: string;
            entityType: "ACCOUNT" | "PERSON";
            entityId: string;
          };
        };
        create: {
          formulaColumnId: string;
          entityType: "ACCOUNT" | "PERSON";
          entityId: string;
          value?: unknown;
          error?: string | null;
        };
        update: { value?: unknown; error?: string | null };
      }) {
        const key = args.where.formulaColumnId_entityType_entityId;
        const existing = results.find(
          (result) =>
            result.formulaColumnId === key.formulaColumnId &&
            result.entityType === key.entityType &&
            result.entityId === key.entityId
        );

        if (existing) {
          Object.assign(existing, args.update);
          return existing;
        }

        results.push(args.create);
        return args.create;
      }
    },
    account: {
      async findFirst(args: { where: { id?: string; workspaceId: string } }) {
        return account.workspaceId === args.where.workspaceId &&
          (!args.where.id || account.id === args.where.id)
          ? account
          : null;
      },
      async findMany(args: { where: { workspaceId: string } }) {
        return account.workspaceId === args.where.workspaceId ? [account] : [];
      }
    },
    person: {
      async findFirst(args: { where: { id?: string; workspaceId: string } }) {
        return person.workspaceId === args.where.workspaceId &&
          (!args.where.id || person.id === args.where.id)
          ? person
          : null;
      },
      async findMany(args: { where: { workspaceId: string } }) {
        return person.workspaceId === args.where.workspaceId ? [person] : [];
      }
    },
    signal: {
      async findMany(args: { where: { workspaceId: string; accountId: string } }) {
        return args.where.workspaceId === "workspace_1" &&
          args.where.accountId === "account_1"
          ? [
              {
                id: "signal_1",
                workspaceId: "workspace_1",
                accountId: "account_1",
                totalScore: 91,
                signalDate: "2026-05-01T12:00:00.000Z",
                createdAt: "2026-05-01T12:00:00.000Z",
                type: "HIRING"
              }
            ]
          : [];
      }
    }
  } as never;
}

test("tokenizes field references and strings", () => {
  assert.deepEqual(
    tokenize('CONCAT({person.fullName}, " ok")')
      .filter((token) => token.type !== "eof")
      .map((token) => [token.type, token.value]),
    [
      ["identifier", "CONCAT"],
      ["paren", "("],
      ["field", "person.fullName"],
      ["comma", ","],
      ["string", " ok"],
      ["paren", ")"]
    ]
  );
});

test("extracts formula dependencies", () => {
  const dependencies = extractDependencies(
    parseFormula("IF({account.accountScore} > {signal.maxScore}, {person.email}, {brand.rediemFitScore})")
  );

  assert.deepEqual(dependencies, [
    { entity: "account", field: "accountScore", path: "account.accountScore" },
    { entity: "brand", field: "rediemFitScore", path: "brand.rediemFitScore" },
    { entity: "person", field: "email", path: "person.email" },
    { entity: "signal", field: "maxScore", path: "signal.maxScore" }
  ]);
});

test("supports IF tier formula", () => {
  assert.equal(value('IF({account.accountScore} > 80, "Tier 1", "Tier 2")'), "Tier 1");
});

test("supports nested IF with AND function", () => {
  assert.equal(
    value('IF(AND({person.emailStatus} = "VERIFIED", {person.roleScore} > 70), "Ready", "Review")'),
    "Ready"
  );
});

test("supports DAYS_SINCE", () => {
  assert.equal(value("DAYS_SINCE({signal.latestSignalDate})"), 13);
});

test("supports CONTAINS and LOWER", () => {
  assert.equal(
    value('CONTAINS(LOWER({account.careersSummary}), "enterprise")'),
    true
  );
});

test("supports SCORE with nested IF calls", () => {
  assert.equal(
    value(
      'SCORE(IF(CONTAINS(LOWER({account.careersSummary}), "revops"), 20, 0), IF({account.employeeCount} > 100, 15, 0), IF({account.accountScore} > 75, 25, 0))'
    ),
    60
  );
});

test("supports CONCAT", () => {
  assert.equal(
    value('CONCAT({person.fullName}, " \\u2014 ", {person.title})'),
    "Maya Chen \\u2014 Director of RevOps"
  );
});

test("supports COALESCE", () => {
  assert.equal(value('COALESCE({person.email}, "No email found")'), "maya@northstar.example");
});

test("supports REGEX_MATCH", () => {
  assert.equal(
    value('REGEX_MATCH(LOWER({person.title}), "revops|revenue operations|sales operations")'),
    true
  );
});

test("supports contactability sequence formula", () => {
  assert.equal(
    value('IF({person.contactabilityScore} >= 80, "Sequence", "Do not sequence")'),
    "Sequence"
  );
});

test("supports equality operator", () => {
  assert.equal(value('{person.emailStatus} = "VERIFIED"'), true);
});

test("supports not equals operator", () => {
  assert.equal(value('{person.emailStatus} != "INVALID"'), true);
});

test("supports greater than or equal", () => {
  assert.equal(value("{person.contactabilityScore} >= 92"), true);
});

test("supports less than", () => {
  assert.equal(value("{account.employeeCount} < 500"), true);
});

test("supports arithmetic precedence", () => {
  assert.equal(value("1 + 2 * 3"), 7);
});

test("supports parentheses in arithmetic", () => {
  assert.equal(value("(1 + 2) * 3"), 9);
});

test("supports division", () => {
  assert.equal(value("ROUND(10 / 4, 1)"), 2.5);
});

test("supports unary minus", () => {
  assert.equal(value("-5 + 8"), 3);
});

test("supports AND operator", () => {
  assert.equal(value('{person.emailStatus} = "VERIFIED" AND {person.roleScore} > 80'), true);
});

test("supports OR operator", () => {
  assert.equal(value('{person.emailStatus} = "INVALID" OR {person.roleScore} > 80'), true);
});

test("supports NOT operator", () => {
  assert.equal(value('NOT({person.emailStatus} = "INVALID")'), true);
});

test("supports NOT function style", () => {
  assert.equal(value('NOT({person.emailStatus} = "INVALID")'), true);
});

test("supports UPPER", () => {
  assert.equal(value("UPPER({account.domain})"), "NORTHSTAR.EXAMPLE");
});

test("supports TRIM", () => {
  assert.equal(value('TRIM("  x  ")'), "x");
});

test("supports MIN", () => {
  assert.equal(value("MIN(3, 1, 2)"), 1);
});

test("supports MAX", () => {
  assert.equal(value("MAX(3, 1, 2)"), 3);
});

test("supports AVG", () => {
  assert.equal(value("AVG(3, 6, 9)"), 6);
});

test("supports SUM", () => {
  assert.equal(value("SUM(3, 6, 9)"), 18);
});

test("supports ROUND", () => {
  assert.equal(value("ROUND(3.14159, 2)"), 3.14);
});

test("supports DATE_DIFF in days", () => {
  assert.equal(value('DATE_DIFF("2026-05-14", "2026-05-01", "days")'), 13);
});

test("supports EXISTS", () => {
  assert.equal(value("EXISTS({person.email})"), true);
});

test("supports EMPTY", () => {
  assert.equal(evaluateFormula("EMPTY({person.missing})", context).value, true);
});

test("supports array fields through CONTAINS", () => {
  assert.equal(value('CONTAINS({signal.types}, "HIRING")'), true);
});

test("missing field resolves to null", () => {
  assert.equal(evaluateFormula("{account.missing}", context).value, null);
});

test("snapshot examples evaluate to expected values", () => {
  const examples = {
    accountTier: value('IF({account.accountScore} > 80, "Tier 1", "Tier 2")'),
    readyStatus: value('IF(AND({person.emailStatus} = "VERIFIED", {person.roleScore} > 70), "Ready", "Review")'),
    daysSince: value("DAYS_SINCE({signal.latestSignalDate})"),
    containsEnterprise: value('CONTAINS(LOWER({account.careersSummary}), "enterprise")'),
    score: value('SCORE(IF(CONTAINS(LOWER({account.careersSummary}), "revops"), 20, 0), IF({account.employeeCount} > 100, 15, 0), IF({account.accountScore} > 75, 25, 0))'),
    sequence: value('IF({person.contactabilityScore} >= 80, "Sequence", "Do not sequence")')
  };

  assert.deepEqual(examples, {
    accountTier: "Tier 1",
    readyStatus: "Ready",
    daysSince: 13,
    containsEnterprise: true,
    score: 60,
    sequence: "Sequence"
  });
});

test("formula templates evaluate on the sample context", () => {
  const values = Object.fromEntries(
    formulaTemplates.map((template) => [
      template.key,
      evaluateFormula(template.expression, context, { now: NOW }).value
    ])
  );

  assert.deepEqual(values, {
    "account-tier": "Tier 1",
    "outbound-ready": "Ready",
    "enterprise-motion": true,
    "hiring-momentum": 40,
    "person-sequence-status": "Sequence",
    "founder-led": false,
    "revops-buyer": true,
    "days-since-signal": 13,
    "rediem-fit-score": 86,
    "rediem-loyalty-pain-score": 95,
    "rediem-community-readiness-score": 100,
    "rediem-migration-pain-score": 100,
    "rediem-agentic-commerce-score": 100,
    "rediem-tier": "Tier 1",
    "rediem-points-loyalty-migration": "Migration Opportunity",
    "rediem-community-gap": "Normal",
    "rediem-review-activation-fit": "Pitch review reward series",
    "rediem-subscription-retention-fit": "Pitch subscription reward series",
    "rediem-retail-to-dtc-fit": "Pitch receipt upload challenge",
    "rediem-agentic-commerce-angle": "Use AI discoverability/community moat angle",
    "rediem-ae-priority": "Work now",
    "cfr-tier": "Emerging Community Loop",
    "community-flywheel-upside": "High upside",
    "flywheel-leak-severity": "Severe",
    "first-play-recommendation": "VIP_TIER_MIGRATION",
    "discount-dependency-risk": "High discount risk",
    "participation-capture-gap": "Participation capture gap",
    "rediem-recommended-play": "UGC challenge"
  });
});

test("formula template preview evaluates on a workspace sample row", async () => {
  const client = createFormulaTemplateClient();
  const preview = await previewFormulaTemplate(client, {
    workspaceId: "workspace_1",
    templateId: "template_account_tier"
  });

  assert.equal(preview.error, null);
  assert.equal(preview.value, "Tier 1");
});

test("adding a formula template creates column and evaluates existing rows", async () => {
  const client = createFormulaTemplateClient();
  const result = await addFormulaTemplateToWorkspace(client, {
    workspaceId: "workspace_1",
    templateId: "template_sequence_status"
  });

  assert.equal(result.created, true);
  assert.equal(result.column.name, "Person Sequence Status");
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0]?.value, "Sequence");
});

test("invalid field reference returns helpful error", () => {
  assert.throws(
    () => parseFormula("{company.name}"),
    (error) =>
      error instanceof FormulaError &&
      error.message.includes("Invalid field reference")
  );
});

test("unknown function returns helpful error", () => {
  assert.throws(
    () => value("NOPE(1)"),
    (error) =>
      error instanceof FormulaError &&
      error.message.includes("Unsupported function")
  );
});

test("wrong arity returns helpful error", () => {
  assert.throws(
    () => value("IF(true)"),
    (error) =>
      error instanceof FormulaError &&
      error.message.includes("IF expects 3 arguments")
  );
});

test("type mismatch returns helpful error", () => {
  assert.throws(
    () => value('"x" + 1'),
    (error) =>
      error instanceof FormulaError &&
      error.message.includes("expected a number")
  );
});

test("division by zero returns helpful error", () => {
  assert.throws(
    () => value("1 / 0"),
    (error) =>
      error instanceof FormulaError &&
      error.message.includes("Division by zero")
  );
});

test("invalid regex returns helpful error", () => {
  assert.throws(
    () => value('REGEX_MATCH("x", "[")'),
    (error) =>
      error instanceof FormulaError &&
      error.message.includes("Invalid REGEX_MATCH pattern")
  );
});

test("unclosed string returns helpful parser error", () => {
  assert.throws(
    () => parseFormula('"oops'),
    (error) =>
      error instanceof FormulaError &&
      error.message.includes("Unclosed string literal")
  );
});
