import type {
  CRMFieldMutation,
  CRMFieldState,
  CRMOverwritePolicy,
  CRMResolvedMutation,
  CRMSyncOptions,
  CRMProviderName,
  CRMObjectType
} from "./types";

export const DEFAULT_CRM_OVERWRITE_POLICY: CRMOverwritePolicy = "BLANK_ONLY";

export function shouldApplyCRMField(
  existing: CRMFieldState | undefined,
  incoming: CRMFieldMutation,
  options: CRMSyncOptions = {}
): { allowed: boolean; policy: CRMOverwritePolicy; reason: string } {
  const policy = options.overwritePolicy ?? DEFAULT_CRM_OVERWRITE_POLICY;

  if (incoming.value === null || incoming.value === "") {
    return {
      allowed: false,
      policy,
      reason: "Incoming value is blank."
    };
  }

  if (existing?.manuallyEdited && !options.allowManualOverwrite) {
    return {
      allowed: false,
      policy,
      reason: "Existing CRM field appears manually edited."
    };
  }

  if (policy === "NEVER_OVERWRITE") {
    return {
      allowed: false,
      policy,
      reason: "Overwrite policy is NEVER_OVERWRITE."
    };
  }

  if (policy === "ALWAYS_OVERWRITE") {
    if (!options.allowAlwaysOverwrite) {
      return {
        allowed: false,
        policy,
        reason: "ALWAYS_OVERWRITE requires explicit enablement."
      };
    }

    return {
      allowed: true,
      policy,
      reason: "Explicit ALWAYS_OVERWRITE enabled."
    };
  }

  if (!existing || existing.value === null || existing.value === "") {
    return {
      allowed: true,
      policy,
      reason: "Existing CRM field is blank."
    };
  }

  if (policy === "HIGHER_CONFIDENCE") {
    const incomingConfidence = incoming.confidence ?? 0;
    const existingConfidence = existing.confidence ?? 0;

    return incomingConfidence > existingConfidence
      ? {
          allowed: true,
          policy,
          reason: "Incoming confidence is higher."
        }
      : {
          allowed: false,
          policy,
          reason: "Existing confidence is greater than or equal to incoming confidence."
        };
  }

  return {
    allowed: false,
    policy,
    reason: "Existing CRM field is populated and policy is BLANK_ONLY."
  };
}

export function planCRMMutations(input: {
  provider: CRMProviderName;
  objectType: CRMObjectType;
  operation: CRMResolvedMutation["operation"];
  externalId?: string;
  domain?: string;
  email?: string;
  existingFields: Record<string, CRMFieldState>;
  incomingFields: CRMFieldMutation[];
  options?: CRMSyncOptions;
}): CRMResolvedMutation[] {
  const dryRun = input.options?.dryRun ?? true;

  return input.incomingFields.map((field) => {
    const decision = shouldApplyCRMField(
      input.existingFields[field.crmField],
      field,
      input.options
    );

    return {
      provider: input.provider,
      objectType: input.objectType,
      operation: input.operation,
      externalId: input.externalId,
      domain: input.domain,
      email: input.email,
      sourceField: field.sourceField,
      crmField: field.crmField,
      previousValue: input.existingFields[field.crmField]?.value ?? null,
      nextValue: field.value,
      policy: decision.policy,
      allowed: decision.allowed,
      dryRun,
      reason: decision.reason,
      sourceUrls: field.sourceUrls ?? [],
      createdAt: new Date()
    };
  });
}

export function logCRMMutations(mutations: CRMResolvedMutation[]) {
  for (const mutation of mutations) {
    console.info(formatCRMMutationLog(mutation));
  }
}

export function formatCRMMutationLog(mutation: CRMResolvedMutation) {
  const mode = mutation.dryRun ? "DRY_RUN" : "APPLY";
  const decision = mutation.allowed ? "ALLOW" : "SKIP";
  const target = mutation.domain ?? mutation.email ?? mutation.externalId ?? "unknown";

  return JSON.stringify({
    mode,
    decision,
    provider: mutation.provider,
    objectType: mutation.objectType,
    operation: mutation.operation,
    target,
    crmField: mutation.crmField,
    previousValue: mutation.previousValue,
    nextValue: mutation.nextValue,
    policy: mutation.policy,
    reason: mutation.reason,
    sourceUrls: mutation.sourceUrls,
    createdAt: mutation.createdAt.toISOString()
  });
}

