import { PrismaPg } from "@prisma/adapter-pg";
import {
  EmailStatus,
  EvidenceEntityType,
  FormulaOutputType,
  FormulaResultEntityType,
  FormulaScope,
  PersonaType,
  PrismaClient,
  ProviderResultStatus,
  SignalType,
  WorkflowRunStatus
} from "../src/generated/prisma/client";
import { ActivationIdeaType, ToolCategory } from "../src/generated/prisma/enums";
import { examplePlaybooks } from "../src/server/playbooks/examples";
import { formulaTemplates } from "../src/server/formulas/templates";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/gtm_engine?schema=public";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
});

async function main() {
  for (const template of formulaTemplates) {
    await prisma.formulaTemplate.upsert({
      where: { key: template.key },
      create: template,
      update: {
        name: template.name,
        description: template.description,
        scope: template.scope,
        expression: template.expression,
        outputType: template.outputType
      }
    });
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: "Sample GTM Workspace"
    }
  });

  await prisma.playbook.createMany({
    data: examplePlaybooks.map((playbook) => ({
      workspaceId: workspace.id,
      ...playbook
    }))
  });

  const northstar = await prisma.account.create({
    data: {
      workspaceId: workspace.id,
      domain: "northstar-robotics.example",
      name: "Northstar Robotics",
      linkedinUrl: "https://www.linkedin.com/company/northstar-robotics",
      industry: "Industrial Automation",
      employeeCount: 420,
      hqLocation: "Austin, TX",
      websiteSummary:
        "Builds robotics automation systems for mid-market manufacturers.",
      pricingSummary:
        "Public pricing is not available; sales-assisted deployments are likely.",
      careersSummary:
        "Hiring across revenue operations, field engineering, and security.",
      blogSummary:
        "Recent posts focus on production uptime and warehouse safety.",
      pressSummary:
        "Announced expansion into two new manufacturing regions.",
      accountScore: 86,
      confidenceScore: 0.82,
      lastEnrichedAt: new Date()
    }
  });

  const lumengrid = await prisma.account.create({
    data: {
      workspaceId: workspace.id,
      domain: "lumengrid-energy.example",
      name: "LumenGrid Energy",
      linkedinUrl: "https://www.linkedin.com/company/lumengrid-energy",
      industry: "Energy Infrastructure",
      employeeCount: 260,
      hqLocation: "Denver, CO",
      websiteSummary:
        "Develops grid monitoring software for distributed energy operators.",
      pricingSummary: "Pricing appears to depend on monitored asset volume.",
      careersSummary:
        "Open roles indicate investment in partner engineering and compliance.",
      blogSummary:
        "Content emphasizes reliability, outage response, and regulatory reporting.",
      pressSummary: "Launched a new analytics product for regional utilities.",
      accountScore: 74,
      confidenceScore: 0.76,
      lastEnrichedAt: new Date()
    }
  });

  const auroraBeauty = await prisma.account.create({
    data: {
      workspaceId: workspace.id,
      domain: "aurora-beauty.example",
      name: "Aurora Beauty Co.",
      industry: "Beauty and Personal Care",
      employeeCount: 85,
      hqLocation: "Los Angeles, CA",
      websiteSummary:
        "DTC skincare brand with seasonal launches, creator content, and a replenishment-oriented serum line.",
      pricingSummary:
        "Products sit in a premium accessible price band with bundles and limited drops.",
      blogSummary:
        "Education content focuses on routines, ingredients, and customer transformations.",
      pressSummary:
        "Recent retail placement and creator collaborations indicate community-led growth.",
      accountScore: 91,
      confidenceScore: 0.84,
      lastEnrichedAt: new Date()
    }
  });

  const fizzhouse = await prisma.account.create({
    data: {
      workspaceId: workspace.id,
      domain: "fizzhouse-drinks.example",
      name: "Fizzhouse Drinks",
      industry: "Food and Beverage",
      employeeCount: 42,
      hqLocation: "Brooklyn, NY",
      websiteSummary:
        "Functional beverage brand selling variety packs, subscriptions, and retail-store discovery.",
      pricingSummary:
        "Subscription discounts and bundle pricing encourage repeat purchase behavior.",
      blogSummary:
        "Content highlights flavor drops, wellness routines, and customer recipes.",
      pressSummary:
        "Regional retail expansion suggests online-to-offline community activation potential.",
      accountScore: 83,
      confidenceScore: 0.79,
      lastEnrichedAt: new Date()
    }
  });

  const loomLane = await prisma.account.create({
    data: {
      workspaceId: workspace.id,
      domain: "loom-lane.example",
      name: "Loom Lane",
      industry: "Apparel and Accessories",
      employeeCount: 120,
      hqLocation: "Portland, OR",
      websiteSummary:
        "Sustainable apparel brand with capsule collections, resale messaging, and ambassador-led community content.",
      pricingSummary:
        "Mid-premium apparel pricing with bundles, gift cards, and seasonal launches.",
      blogSummary:
        "Editorial content emphasizes repair, styling, sustainability, and customer stories.",
      pressSummary:
        "Partnerships with independent boutiques suggest retail and community expansion.",
      accountScore: 87,
      confidenceScore: 0.81,
      lastEnrichedAt: new Date()
    }
  });

  await prisma.brandProfile.createMany({
    data: [
      {
        workspaceId: workspace.id,
        accountId: auroraBeauty.id,
        ecommercePlatform: "Shopify",
        ecommercePlatformScore: 92,
        shopifyDetected: true,
        shopifyPlusLikely: true,
        productCategory: "Skincare",
        brandCategory: "Beauty",
        pricePoint: "Premium accessible",
        targetCustomer: "Millennial and Gen Z skincare enthusiasts",
        hasSubscription: true,
        subscriptionProvider: "Recharge",
        hasLoyaltyProgram: true,
        loyaltyProvider: "Legacy points app",
        loyaltyProgramUrl: "https://aurora-beauty.example/rewards",
        loyaltyProgramType: "Points and VIP tiers",
        hasReferralProgram: true,
        hasReviews: true,
        reviewProvider: "Okendo",
        hasUGC: true,
        instagramUrl: "https://instagram.com/aurorabeauty.example",
        tiktokUrl: "https://tiktok.com/@aurorabeauty.example",
        socialCommunityScore: 88,
        hasRetailPresence: true,
        retailSignals: {
          channels: ["specialty retail", "pop-up events"],
          signals: ["retail locator", "creator event calendar"]
        },
        sustainabilityAngle: "Refillable packaging is highlighted across product pages.",
        missionDrivenAngle:
          "Ingredient transparency and routine education can support member challenges.",
        rediemFitScore: 93,
        loyaltyMaturityScore: 82,
        communityReadinessScore: 91,
        migrationPainScore: 76,
        agenticCommerceScore: 84
      },
      {
        workspaceId: workspace.id,
        accountId: fizzhouse.id,
        ecommercePlatform: "Shopify",
        ecommercePlatformScore: 85,
        shopifyDetected: true,
        shopifyPlusLikely: false,
        productCategory: "Functional beverage",
        brandCategory: "Beverage",
        pricePoint: "Mid-market",
        targetCustomer: "Health-conscious urban shoppers",
        hasSubscription: true,
        subscriptionProvider: "Skio",
        hasLoyaltyProgram: false,
        loyaltyProvider: null,
        loyaltyProgramUrl: null,
        loyaltyProgramType: null,
        hasReferralProgram: true,
        hasReviews: true,
        reviewProvider: "Yotpo",
        hasUGC: true,
        instagramUrl: "https://instagram.com/fizzhouse.example",
        tiktokUrl: "https://tiktok.com/@fizzhouse.example",
        socialCommunityScore: 81,
        hasRetailPresence: true,
        retailSignals: {
          channels: ["regional grocery", "fitness studios"],
          signals: ["store finder", "retail launch announcements"]
        },
        sustainabilityAngle:
          "Recyclable cans and local distribution are visible brand themes.",
        missionDrivenAngle:
          "Flavor drops and wellness routines create repeat community prompts.",
        rediemFitScore: 86,
        loyaltyMaturityScore: 54,
        communityReadinessScore: 83,
        migrationPainScore: 42,
        agenticCommerceScore: 78
      },
      {
        workspaceId: workspace.id,
        accountId: loomLane.id,
        ecommercePlatform: "Shopify",
        ecommercePlatformScore: 90,
        shopifyDetected: true,
        shopifyPlusLikely: true,
        productCategory: "Sustainable apparel",
        brandCategory: "Apparel",
        pricePoint: "Mid-premium",
        targetCustomer: "Values-led apparel shoppers",
        hasSubscription: false,
        subscriptionProvider: null,
        hasLoyaltyProgram: true,
        loyaltyProvider: "Smile.io",
        loyaltyProgramUrl: "https://loom-lane.example/community",
        loyaltyProgramType: "Community perks and early access",
        hasReferralProgram: false,
        hasReviews: true,
        reviewProvider: "Judge.me",
        hasUGC: true,
        instagramUrl: "https://instagram.com/loomlane.example",
        tiktokUrl: "https://tiktok.com/@loomlane.example",
        socialCommunityScore: 86,
        hasRetailPresence: true,
        retailSignals: {
          channels: ["independent boutiques", "seasonal markets"],
          signals: ["stockist page", "repair workshop events"]
        },
        sustainabilityAngle:
          "Repair, resale, and lower-waste capsule collections are central messages.",
        missionDrivenAngle:
          "Customer styling stories and repair pledges can become participation loops.",
        rediemFitScore: 89,
        loyaltyMaturityScore: 70,
        communityReadinessScore: 88,
        migrationPainScore: 63,
        agenticCommerceScore: 74
      }
    ]
  });

  await prisma.brandActivationIdea.createMany({
    data: [
      {
        workspaceId: workspace.id,
        accountId: auroraBeauty.id,
        type: ActivationIdeaType.UGC_SOCIAL_CHALLENGE,
        title: "Routine reveal challenge",
        description:
          "Reward members for sharing before-and-after skincare routines tied to a new serum drop.",
        targetBehavior: "UGC creation and repeat product education",
        expectedImpact: "Higher launch participation and reusable creator content",
        confidence: 0.86,
        evidenceIds: []
      },
      {
        workspaceId: workspace.id,
        accountId: fizzhouse.id,
        type: ActivationIdeaType.REFERRAL_CHALLENGE,
        title: "Flavor club referrals",
        description:
          "Use flavor-drop access and referral milestones to convert one-time buyers into subscribers.",
        targetBehavior: "Subscription adoption and referral sharing",
        expectedImpact: "More repeat purchases from retail-discovered shoppers",
        confidence: 0.78,
        evidenceIds: []
      },
      {
        workspaceId: workspace.id,
        accountId: loomLane.id,
        type: ActivationIdeaType.SUSTAINABILITY_OR_MISSION_CHALLENGE,
        title: "Repair pledge rewards",
        description:
          "Recognize customers who log repairs, styling stories, and resale participation.",
        targetBehavior: "Mission-aligned community participation",
        expectedImpact: "Stronger sustainability narrative and post-purchase engagement",
        confidence: 0.82,
        evidenceIds: []
      }
    ]
  });

  await prisma.competitorToolDetection.createMany({
    data: [
      {
        workspaceId: workspace.id,
        accountId: auroraBeauty.id,
        category: ToolCategory.LOYALTY,
        vendor: "Legacy points app",
        confidence: 0.74,
        sourceUrl: "https://aurora-beauty.example/rewards",
        evidence:
          "Rewards page references points, VIP tiers, birthday rewards, and referral credits."
      },
      {
        workspaceId: workspace.id,
        accountId: fizzhouse.id,
        category: ToolCategory.REVIEWS,
        vendor: "Yotpo",
        confidence: 0.7,
        sourceUrl: "https://fizzhouse-drinks.example/products/variety-pack",
        evidence:
          "Product pages show review widgets and syndicated star ratings."
      },
      {
        workspaceId: workspace.id,
        accountId: loomLane.id,
        category: ToolCategory.LOYALTY,
        vendor: "Smile.io",
        confidence: 0.77,
        sourceUrl: "https://loom-lane.example/community",
        evidence:
          "Community page references points, referrals, and early access perks."
      }
    ]
  });

  await prisma.person.createMany({
    data: [
      {
        workspaceId: workspace.id,
        accountId: northstar.id,
        fullName: "Maya Chen",
        title: "VP of Revenue Operations",
        seniority: "Executive",
        department: "Revenue",
        linkedinUrl: "https://www.linkedin.com/in/maya-chen-sample",
        email: "maya.chen@northstar-robotics.example",
        emailStatus: EmailStatus.VERIFIED,
        emailVerifiedAt: new Date(),
        phone: "+1 555 010 1100",
        location: "Austin, TX",
        personaType: PersonaType.DAY_TO_DAY_OWNER,
        roleScore: 88,
        contactabilityScore: 81,
        sourceConfidence: 0.84,
        lastEnrichedAt: new Date()
      },
      {
        workspaceId: workspace.id,
        accountId: northstar.id,
        fullName: "Jordan Patel",
        title: "Chief Information Security Officer",
        seniority: "C-Level",
        department: "Security",
        linkedinUrl: "https://www.linkedin.com/in/jordan-patel-sample",
        email: "jordan.patel@northstar-robotics.example",
        emailStatus: EmailStatus.RISKY,
        location: "Remote",
        personaType: PersonaType.TECHNICAL_BUYER,
        roleScore: 92,
        contactabilityScore: 64,
        sourceConfidence: 0.71,
        lastEnrichedAt: new Date()
      },
      {
        workspaceId: workspace.id,
        accountId: lumengrid.id,
        fullName: "Elena Morris",
        title: "Head of Market Expansion",
        seniority: "VP",
        department: "Growth",
        linkedinUrl: "https://www.linkedin.com/in/elena-morris-sample",
        email: "elena.morris@lumengrid-energy.example",
        emailStatus: EmailStatus.CATCH_ALL,
        location: "Denver, CO",
        personaType: PersonaType.CHAMPION_CANDIDATE,
        roleScore: 79,
        contactabilityScore: 72,
        sourceConfidence: 0.78,
        lastEnrichedAt: new Date()
      }
    ]
  });

  const [maya, jordan, elena] = await Promise.all([
    prisma.person.findFirstOrThrow({
      where: { workspaceId: workspace.id, fullName: "Maya Chen" }
    }),
    prisma.person.findFirstOrThrow({
      where: { workspaceId: workspace.id, fullName: "Jordan Patel" }
    }),
    prisma.person.findFirstOrThrow({
      where: { workspaceId: workspace.id, fullName: "Elena Morris" }
    })
  ]);

  const hiringSignal = await prisma.signal.create({
    data: {
      workspaceId: workspace.id,
      accountId: northstar.id,
      type: SignalType.HIRING,
      title: "Revenue operations and security hiring spike",
      description:
        "Open roles suggest investment in sales process scale and security readiness.",
      signalDate: new Date("2026-05-01T00:00:00.000Z"),
      freshnessScore: 92,
      relevanceScore: 86,
      sourceQualityScore: 78,
      totalScore: 86,
      sourceUrl: "https://northstar-robotics.example/careers"
    }
  });

  await prisma.signal.create({
    data: {
      workspaceId: workspace.id,
      accountId: lumengrid.id,
      type: SignalType.PRODUCT_LAUNCH,
      title: "Analytics product launched for regional utilities",
      description:
        "Product launch may indicate a new outbound wedge into utility operations teams.",
      signalDate: new Date("2026-04-18T00:00:00.000Z"),
      freshnessScore: 78,
      relevanceScore: 82,
      sourceQualityScore: 74,
      totalScore: 79,
      sourceUrl: "https://lumengrid-energy.example/press"
    }
  });

  const accountFitColumn = await prisma.formulaColumn.create({
    data: {
      workspaceId: workspace.id,
      name: "Account Fit Score",
      scope: FormulaScope.ACCOUNT,
      expression:
        "SCORE(IF({account.accountScore} > 80, 60, 30), IF({account.employeeCount} > 300, 25, 10))",
      outputType: FormulaOutputType.NUMBER,
      enabled: true
    }
  });

  const personaPriorityColumn = await prisma.formulaColumn.create({
    data: {
      workspaceId: workspace.id,
      name: "Persona Priority",
      scope: FormulaScope.PERSON,
      expression:
        "IF(REGEX_MATCH(LOWER({person.title}), \"revops|revenue operations|security|chief\"), \"High\", \"Medium\")",
      outputType: FormulaOutputType.STRING,
      enabled: true
    }
  });

  const northstarFormulaResult = await prisma.formulaResult.create({
    data: {
      workspaceId: workspace.id,
      formulaColumnId: accountFitColumn.id,
      entityType: FormulaResultEntityType.ACCOUNT,
      entityId: northstar.id,
      value: 84
    }
  });

  await prisma.formulaResult.create({
    data: {
      workspaceId: workspace.id,
      formulaColumnId: accountFitColumn.id,
      entityType: FormulaResultEntityType.ACCOUNT,
      entityId: lumengrid.id,
      value: 55
    }
  });

  await prisma.formulaResult.createMany({
    data: [
      {
        workspaceId: workspace.id,
        formulaColumnId: personaPriorityColumn.id,
        entityType: FormulaResultEntityType.PERSON,
        entityId: maya.id,
        value: "High"
      },
      {
        workspaceId: workspace.id,
        formulaColumnId: personaPriorityColumn.id,
        entityType: FormulaResultEntityType.PERSON,
        entityId: jordan.id,
        value: "High"
      },
      {
        workspaceId: workspace.id,
        formulaColumnId: personaPriorityColumn.id,
        entityType: FormulaResultEntityType.PERSON,
        entityId: elena.id,
        value: "Medium"
      }
    ]
  });

  await prisma.evidence.createMany({
    data: [
      {
        workspaceId: workspace.id,
        entityType: EvidenceEntityType.ACCOUNT,
        entityId: northstar.id,
        fieldName: "careersSummary",
        value: northstar.careersSummary,
        sourceUrl: "https://northstar-robotics.example/careers",
        provider: "sample-research-provider",
        rawExcerpt:
          "The careers page lists revenue operations, field engineering, and security openings.",
        confidence: 0.82
      },
      {
        workspaceId: workspace.id,
        entityType: EvidenceEntityType.ACCOUNT,
        entityId: lumengrid.id,
        fieldName: "pressSummary",
        value: lumengrid.pressSummary,
        sourceUrl: "https://lumengrid-energy.example/press",
        provider: "sample-research-provider",
        rawExcerpt:
          "LumenGrid announced an analytics product for regional utility operators.",
        confidence: 0.76
      },
      {
        workspaceId: workspace.id,
        entityType: EvidenceEntityType.PERSON,
        entityId: maya.id,
        fieldName: "title",
        value: maya.title,
        sourceUrl: maya.linkedinUrl,
        provider: "sample-people-provider",
        rawExcerpt: "Maya Chen is listed as VP of Revenue Operations.",
        confidence: 0.84
      },
      {
        workspaceId: workspace.id,
        entityType: EvidenceEntityType.PERSON,
        entityId: jordan.id,
        fieldName: "title",
        value: jordan.title,
        sourceUrl: jordan.linkedinUrl,
        provider: "sample-people-provider",
        rawExcerpt: "Jordan Patel is listed as Chief Information Security Officer.",
        confidence: 0.71
      },
      {
        workspaceId: workspace.id,
        entityType: EvidenceEntityType.FORMULA_RESULT,
        entityId: northstarFormulaResult.id,
        fieldName: "value",
        value: "84",
        sourceUrl: null,
        provider: "formula-engine",
        rawExcerpt:
          "Account Fit Score used accountScore and employeeCount to calculate a sample score.",
        confidence: 1
      }
    ]
  });

  await prisma.evidence.create({
    data: {
      workspaceId: workspace.id,
      entityType: EvidenceEntityType.SIGNAL,
      entityId: hiringSignal.id,
      fieldName: "description",
      value: hiringSignal.description,
      sourceUrl: hiringSignal.sourceUrl,
      provider: "sample-research-provider",
      rawExcerpt:
        "Northstar Robotics lists open roles in revenue operations and security engineering.",
      confidence: 0.8
    }
  });

  const workflowRun = await prisma.workflowRun.create({
    data: {
      workspaceId: workspace.id,
      workflowName: "Sample account intelligence enrichment",
      status: WorkflowRunStatus.COMPLETED,
      inputCount: 2,
      successCount: 2,
      failureCount: 0,
      totalCostUsd: "0.1200",
      startedAt: new Date("2026-05-14T16:00:00.000Z"),
      completedAt: new Date("2026-05-14T16:02:00.000Z")
    }
  });

  await prisma.providerResult.create({
    data: {
      workspaceId: workspace.id,
      workflowRunId: workflowRun.id,
      provider: "sample-research-provider",
      toolName: "account.enrich",
      inputHash: "sample-input-hash-northstar",
      rawResponse: {
        account: northstar.name,
        source: "seed"
      },
      normalizedResponse: {
        accountScore: northstar.accountScore,
        confidenceScore: northstar.confidenceScore
      },
      costUsd: "0.0600",
      latencyMs: 842,
      status: ProviderResultStatus.SUCCESS
    }
  });

  await prisma.cacheEntry.create({
    data: {
      namespace: "provider:sample-research-provider",
      key: "account:northstar-robotics.example",
      value: {
        accountId: northstar.id,
        cached: true
      },
      expiresAt: new Date("2026-06-14T00:00:00.000Z")
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
