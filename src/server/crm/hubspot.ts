import type {
  CRMCompanyInput,
  CRMContactInput,
  CRMFieldMutation,
  CRMProvider,
  CRMRecordSnapshot,
  CRMResolvedMutation,
  CRMSyncOptions
} from "./types";
import { logCRMMutations, planCRMMutations } from "./syncRules";

export class HubSpotCRMProvider implements CRMProvider {
  name = "hubspot" as const;

  constructor(
    private readonly config: {
      accessToken?: string;
    } = {}
  ) {}

  async upsertCompany(input: CRMCompanyInput, options?: CRMSyncOptions) {
    const existing = await this.findCompanyByDomain(input.domain);
    const mutations = planCRMMutations({
      provider: this.name,
      objectType: "company",
      operation: "UPSERT_COMPANY",
      externalId: existing?.id,
      domain: input.domain,
      existingFields: existing?.fields ?? {},
      incomingFields: input.fields,
      options
    });
    return this.logAndMaybeApply(mutations);
  }

  async upsertContact(input: CRMContactInput, options?: CRMSyncOptions) {
    const existing = await this.findContactByEmail(input.email);
    const mutations = planCRMMutations({
      provider: this.name,
      objectType: "contact",
      operation: "UPSERT_CONTACT",
      externalId: existing?.id,
      email: input.email,
      existingFields: existing?.fields ?? {},
      incomingFields: input.fields,
      options
    });
    return this.logAndMaybeApply(mutations);
  }

  async updateCompanyFields(
    externalId: string,
    fields: CRMFieldMutation[],
    options?: CRMSyncOptions
  ) {
    const mutations = planCRMMutations({
      provider: this.name,
      objectType: "company",
      operation: "UPDATE_COMPANY_FIELDS",
      externalId,
      existingFields: {},
      incomingFields: fields,
      options
    });
    return this.logAndMaybeApply(mutations);
  }

  async updateContactFields(
    externalId: string,
    fields: CRMFieldMutation[],
    options?: CRMSyncOptions
  ) {
    const mutations = planCRMMutations({
      provider: this.name,
      objectType: "contact",
      operation: "UPDATE_CONTACT_FIELDS",
      externalId,
      existingFields: {},
      incomingFields: fields,
      options
    });
    return this.logAndMaybeApply(mutations);
  }

  async findCompanyByDomain(_domain: string): Promise<CRMRecordSnapshot | null> {
    // Deferred live integration: query HubSpot companies by domain once OAuth/private app setup is added.
    return null;
  }

  async findContactByEmail(_email: string): Promise<CRMRecordSnapshot | null> {
    // Deferred live integration: query HubSpot contacts by email once OAuth/private app setup is added.
    return null;
  }

  private async logAndMaybeApply(mutations: CRMResolvedMutation[]) {
    logCRMMutations(mutations);

    if (mutations.some((mutation) => !mutation.dryRun && mutation.allowed)) {
      this.assertConfigured();
      // Deferred live integration: apply allowed mutations through HubSpot CRM object APIs.
    }

    return mutations;
  }

  private assertConfigured() {
    if (!this.config.accessToken) {
      throw new Error("HubSpot access token is required for non-dry-run sync.");
    }
  }
}
