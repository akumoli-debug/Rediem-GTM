import type { PlaybookDefinition } from "./types";

export const examplePlaybooks: PlaybookDefinition[] = [
  {
    name: "AI GTM Workflow Sale",
    description:
      "Prioritize revenue teams that appear to be formalizing GTM systems, workflow automation, and sales-led execution.",
    targetMotion: "AI GTM workflow software",
    targetPersonas: ["RevOps", "Sales Ops", "Growth", "CRO"],
    accountFitRules: [
      "B2B software or sales-led business",
      "Evidence of GTM, RevOps, Sales Ops, Growth, or CRM systems work",
      "Enterprise plan, funding, or hiring momentum increases priority"
    ],
    signalTypes: [
      "hiring GTM roles",
      "new pricing page",
      "enterprise plan",
      "funding",
      "CRM/tooling mentions"
    ],
    formulaColumns: [
      {
        name: "GTM Fit Tier",
        scope: "ACCOUNT",
        expression:
          "IF(SCORE(IF({account.accountScore} > 80, 40, 0), IF(CONTAINS(LOWER({account.careersSummary}), \"revops\"), 35, 0), IF(CONTAINS(LOWER({account.pricingSummary}), \"enterprise\"), 25, 0)) >= 70, \"Tier 1\", \"Tier 2\")",
        outputType: "STRING"
      },
      {
        name: "Sequence Readiness",
        scope: "PERSON",
        expression:
          "IF(AND({person.emailStatus} = \"VERIFIED\", {person.roleScore} > 70), \"Ready\", \"Review\")",
        outputType: "STRING"
      }
    ],
    workflowSteps: [
      "researchAccount",
      "resolveBuyingCommittee",
      "enrichContacts",
      "generateOutreachAngles",
      "exportCsv"
    ],
    exportFields: [
      "account.domain",
      "account.name",
      "account.accountScore",
      "account.latestSignal",
      "person.fullName",
      "person.title",
      "person.email",
      "person.emailStatus",
      "formula.GTM Fit Tier",
      "sourceUrls"
    ],
    budgetDefaults: {
      maxCostPerAccount: 0.75,
      maxCostPerContact: 0.35,
      maxTotalRunCost: 75,
      stopRunOnBudgetExceeded: true
    }
  },
  {
    name: "Developer Infrastructure Sale",
    description:
      "Find engineering-led accounts showing platform, infrastructure, security, compliance, or scaling pressure.",
    targetMotion: "developer infrastructure",
    targetPersonas: [
      "VP Engineering",
      "Platform Engineering",
      "Infrastructure",
      "DevOps/SRE"
    ],
    accountFitRules: [
      "Engineering-heavy account or technical product",
      "Hiring for platform, infrastructure, DevOps, SRE, or security",
      "Engineering blog or compliance evidence raises priority"
    ],
    signalTypes: [
      "hiring platform roles",
      "security/compliance mentions",
      "scaling language",
      "engineering blog"
    ],
    formulaColumns: [
      {
        name: "Infra Fit Score",
        scope: "ACCOUNT",
        expression:
          "SCORE(IF(REGEX_MATCH(LOWER({account.careersSummary}), \"platform|infrastructure|devops|sre\"), 45, 0), IF(CONTAINS(LOWER({account.blogSummary}), \"engineering\"), 25, 0), IF({account.employeeCount} > 100, 20, 0))",
        outputType: "NUMBER"
      },
      {
        name: "Technical Buyer Match",
        scope: "PERSON",
        expression:
          "IF(REGEX_MATCH(LOWER({person.title}), \"engineering|platform|infrastructure|devops|sre|security\"), \"High\", \"Medium\")",
        outputType: "STRING"
      }
    ],
    workflowSteps: [
      "researchAccount",
      "resolveBuyingCommittee",
      "generateOutreachAngles",
      "exportCsv"
    ],
    exportFields: [
      "account.domain",
      "account.name",
      "account.accountScore",
      "signal.types",
      "person.fullName",
      "person.title",
      "person.personaType",
      "formula.Infra Fit Score",
      "sourceUrls"
    ],
    budgetDefaults: {
      maxCostPerAccount: 0.65,
      maxCostPerContact: 0.25,
      maxTotalRunCost: 60,
      stopRunOnBudgetExceeded: true
    }
  },
  {
    name: "VC Founder Research",
    description:
      "Research founder-led companies for funding, product, hiring, expansion, and executive context.",
    targetMotion: "VC founder research",
    targetPersonas: ["Founder", "CEO", "COO"],
    accountFitRules: [
      "Founder-led or executive-led company",
      "Recent funding, launch, hiring, expansion, or public founder activity",
      "High confidence source coverage required for outreach angles"
    ],
    signalTypes: [
      "recent funding",
      "hiring",
      "product launch",
      "market expansion",
      "founder posts"
    ],
    formulaColumns: [
      {
        name: "Founder Research Priority",
        scope: "ACCOUNT",
        expression:
          "SCORE(IF({signal.maxScore} > 75, 40, 0), IF(CONTAINS(LOWER({account.pressSummary}), \"funding\"), 30, 0), IF(CONTAINS(LOWER({account.pressSummary}), \"launch\"), 20, 0))",
        outputType: "NUMBER"
      },
      {
        name: "Founder Persona Match",
        scope: "PERSON",
        expression:
          "IF(REGEX_MATCH(LOWER({person.title}), \"founder|ceo|chief executive|coo|chief operating\"), \"Founder lane\", \"Secondary\")",
        outputType: "STRING"
      }
    ],
    workflowSteps: [
      "researchAccount",
      "resolveBuyingCommittee",
      "generateOutreachAngles",
      "exportCsv"
    ],
    exportFields: [
      "account.domain",
      "account.name",
      "account.pressSummary",
      "account.accountScore",
      "signal.latestSignalDate",
      "person.fullName",
      "person.title",
      "formula.Founder Research Priority",
      "sourceUrls"
    ],
    budgetDefaults: {
      maxCostPerAccount: 0.55,
      maxCostPerContact: 0.2,
      maxTotalRunCost: 50,
      stopRunOnBudgetExceeded: true
    }
  }
];
