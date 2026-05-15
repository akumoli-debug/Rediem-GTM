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

export class SalesforceCRMProvider implements CRMProvider {
  name = "salesforce" as const;

  constructor(
    private readonly config: {
      clientId?: string;
      clientSecret?: string;
      refreshToken?: string;
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
    // TODO: Query Salesforce Account records by website/domain after auth setup.
    return null;
  }

  async findContactByEmail(_email: string): Promise<CRMRecordSnapshot | null> {
    // TODO: Query Salesforce Contact records by email after auth setup.
    return null;
  }

  private async logAndMaybeApply(mutations: CRMResolvedMutation[]) {
    logCRMMutations(mutations);

    if (mutations.some((mutation) => !mutation.dryRun && mutation.allowed)) {
      this.assertConfigured();
      // TODO: Apply allowed mutations through Salesforce REST/Bulk APIs.
    }

    return mutations;
  }

  private assertConfigured() {
    if (!this.config.clientId || !this.config.clientSecret || !this.config.refreshToken) {
      throw new Error("Salesforce client credentials are required for non-dry-run sync.");
    }
  }
}

