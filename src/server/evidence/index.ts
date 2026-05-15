type PrimitiveFieldValue = string | number | boolean | Date;

export type OverwritePolicy =
  | "BLANK_ONLY"
  | "HIGHER_CONFIDENCE"
  | "ALWAYS"
  | "NEVER";

export type FieldEvidence<T> = {
  value: T | null | undefined;
  sourceUrl?: string | null;
  provider?: string | null;
  confidence?: number | null;
  capturedAt?: Date | null;
  rawExcerpt?: string | null;
};

export type EnrichedField<T> = FieldEvidence<T>;

export type EvidenceEntityType =
  | "ACCOUNT"
  | "PERSON"
  | "SIGNAL"
  | "FORMULA_RESULT";

type EvidenceRecord = {
  id?: string;
  workspaceId: string;
  entityType: EvidenceEntityType;
  entityId: string;
  fieldName: string;
  value: string | null;
  sourceUrl?: string | null;
  provider?: string | null;
  rawExcerpt?: string | null;
  confidence?: number | null;
  capturedAt: Date;
  createdAt?: Date;
};

type EvidenceCreateInput = Omit<EvidenceRecord, "id" | "createdAt">;

type AccountRecord = {
  id: string;
  workspaceId: string;
  domain?: string | null;
  name: string;
  linkedinUrl?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  hqLocation?: string | null;
  websiteSummary?: string | null;
  pricingSummary?: string | null;
  careersSummary?: string | null;
  blogSummary?: string | null;
  pressSummary?: string | null;
  accountScore?: number | null;
  confidenceScore?: number | null;
  lastEnrichedAt?: Date | null;
};

type PersonRecord = {
  id: string;
  workspaceId: string;
  accountId?: string | null;
  fullName: string;
  title?: string | null;
  seniority?: string | null;
  department?: string | null;
  linkedinUrl?: string | null;
  email?: string | null;
  emailStatus?: string | null;
  emailVerifiedAt?: Date | null;
  phone?: string | null;
  location?: string | null;
  personaType?: string | null;
  roleScore?: number | null;
  contactabilityScore?: number | null;
  sourceConfidence?: number | null;
  lastEnrichedAt?: Date | null;
};

type SignalRecord = {
  id: string;
  workspaceId: string;
  accountId: string;
  type: string;
  title: string;
  description?: string | null;
  signalDate?: Date | null;
  freshnessScore?: number | null;
  relevanceScore?: number | null;
  sourceQualityScore?: number | null;
  totalScore?: number | null;
  sourceUrl?: string | null;
  capturedAt: Date;
};

type EvidenceDelegate = {
  create(args: { data: EvidenceCreateInput }): Promise<EvidenceRecord>;
  findMany(args: {
    where: {
      workspaceId: string;
      entityType: EvidenceEntityType;
      entityId: string;
      fieldName?: string;
    };
    orderBy?: { capturedAt?: "asc" | "desc"; createdAt?: "asc" | "desc" };
  }): Promise<EvidenceRecord[]>;
};

type AccountDelegate = {
  findFirst(args: {
    where: {
      id?: string;
      workspaceId: string;
      OR?: Array<{
        domain?: string;
        linkedinUrl?: string;
        name?: string;
      }>;
    };
  }): Promise<AccountRecord | null>;
  create(args: { data: Record<string, unknown> }): Promise<AccountRecord>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<AccountRecord>;
};

type PersonDelegate = {
  findFirst(args: {
    where: {
      id?: string;
      workspaceId: string;
      OR?: Array<{
        linkedinUrl?: string;
        email?: string;
        fullName?: string;
      }>;
    };
  }): Promise<PersonRecord | null>;
  create(args: { data: Record<string, unknown> }): Promise<PersonRecord>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<PersonRecord>;
};

type SignalDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<SignalRecord>;
};

export type EvidenceClient = {
  account: AccountDelegate;
  person: PersonDelegate;
  signal: SignalDelegate;
  evidence: EvidenceDelegate;
};

type AccountEvidenceFields = {
  domain?: EnrichedField<string>;
  name?: EnrichedField<string>;
  linkedinUrl?: EnrichedField<string>;
  industry?: EnrichedField<string>;
  employeeCount?: EnrichedField<number>;
  hqLocation?: EnrichedField<string>;
  websiteSummary?: EnrichedField<string>;
  pricingSummary?: EnrichedField<string>;
  careersSummary?: EnrichedField<string>;
  blogSummary?: EnrichedField<string>;
  pressSummary?: EnrichedField<string>;
  accountScore?: EnrichedField<number>;
  confidenceScore?: EnrichedField<number>;
};

type PersonEvidenceFields = {
  accountId?: EnrichedField<string>;
  fullName?: EnrichedField<string>;
  title?: EnrichedField<string>;
  seniority?: EnrichedField<string>;
  department?: EnrichedField<string>;
  linkedinUrl?: EnrichedField<string>;
  email?: EnrichedField<string>;
  emailStatus?: EnrichedField<string>;
  emailVerifiedAt?: EnrichedField<Date>;
  phone?: EnrichedField<string>;
  location?: EnrichedField<string>;
  personaType?: EnrichedField<string>;
  roleScore?: EnrichedField<number>;
  contactabilityScore?: EnrichedField<number>;
  sourceConfidence?: EnrichedField<number>;
  lastEnrichedAt?: EnrichedField<Date>;
};

type SignalEvidenceFields = {
  type: EnrichedField<string>;
  title: EnrichedField<string>;
  description?: EnrichedField<string>;
  signalDate?: EnrichedField<Date>;
  freshnessScore?: EnrichedField<number>;
  relevanceScore?: EnrichedField<number>;
  sourceQualityScore?: EnrichedField<number>;
  totalScore?: EnrichedField<number>;
  sourceUrl?: EnrichedField<string>;
};

export type UpsertAccountWithEvidenceInput = {
  workspaceId: string;
  id?: string;
  fields: AccountEvidenceFields;
  overwritePolicy?: OverwritePolicy;
};

export type UpsertPersonWithEvidenceInput = {
  workspaceId: string;
  id?: string;
  fields: PersonEvidenceFields;
  overwritePolicy?: OverwritePolicy;
};

export type CreateSignalWithEvidenceInput = {
  workspaceId: string;
  accountId: string;
  fields: SignalEvidenceFields;
};

export async function upsertAccountWithEvidence(
  client: EvidenceClient,
  input: UpsertAccountWithEvidenceInput
): Promise<AccountRecord> {
  const overwritePolicy = input.overwritePolicy ?? "BLANK_ONLY";
  const existing = await findExistingAccount(client, input);

  if (!existing) {
    const createData = visibleFieldValues(input.fields);

    if (!createData.name || typeof createData.name !== "string") {
      throw new Error("Cannot create account without a visible name value.");
    }

    const account = await client.account.create({
      data: {
        ...createData,
        workspaceId: input.workspaceId,
        lastEnrichedAt: new Date()
      }
    });

    await attachEvidenceForFields(client, {
      workspaceId: input.workspaceId,
      entityType: "ACCOUNT",
      entityId: account.id,
      fields: input.fields
    });

    return account;
  }

  const data = await filterUpdatableFields(client, {
    workspaceId: input.workspaceId,
    entityType: "ACCOUNT",
    entityId: existing.id,
    current: existing,
    fields: input.fields,
    overwritePolicy
  });

  if (Object.keys(data).length === 0) {
    return existing;
  }

  const account = await client.account.update({
    where: { id: existing.id },
    data: {
      ...data,
      lastEnrichedAt: new Date()
    }
  });

  await attachEvidenceForFields(client, {
    workspaceId: input.workspaceId,
    entityType: "ACCOUNT",
    entityId: account.id,
    fields: pickFields(input.fields, Object.keys(data))
  });

  return account;
}

export async function upsertPersonWithEvidence(
  client: EvidenceClient,
  input: UpsertPersonWithEvidenceInput
): Promise<PersonRecord> {
  const overwritePolicy = input.overwritePolicy ?? "BLANK_ONLY";
  const existing = await findExistingPerson(client, input);

  if (!existing) {
    const createData = visibleFieldValues(input.fields);

    if (!createData.fullName || typeof createData.fullName !== "string") {
      throw new Error("Cannot create person without a visible fullName value.");
    }

    const person = await client.person.create({
      data: {
        ...createData,
        workspaceId: input.workspaceId,
        lastEnrichedAt: new Date()
      }
    });

    await attachEvidenceForFields(client, {
      workspaceId: input.workspaceId,
      entityType: "PERSON",
      entityId: person.id,
      fields: input.fields
    });

    return person;
  }

  const data = await filterUpdatableFields(client, {
    workspaceId: input.workspaceId,
    entityType: "PERSON",
    entityId: existing.id,
    current: existing,
    fields: input.fields,
    overwritePolicy
  });

  if (Object.keys(data).length === 0) {
    return existing;
  }

  const person = await client.person.update({
    where: { id: existing.id },
    data: {
      ...data,
      lastEnrichedAt: new Date()
    }
  });

  await attachEvidenceForFields(client, {
    workspaceId: input.workspaceId,
    entityType: "PERSON",
    entityId: person.id,
    fields: pickFields(input.fields, Object.keys(data))
  });

  return person;
}

export async function createSignalWithEvidence(
  client: EvidenceClient,
  input: CreateSignalWithEvidenceInput
): Promise<SignalRecord> {
  const createData = visibleFieldValues(input.fields);

  if (!createData.type || !createData.title) {
    throw new Error("Cannot create signal without visible type and title values.");
  }

  const signal = await client.signal.create({
    data: {
      ...createData,
      workspaceId: input.workspaceId,
      accountId: input.accountId,
      capturedAt: visibleDate(input.fields.sourceUrl?.capturedAt) ?? new Date()
    }
  });

  await attachEvidenceForFields(client, {
    workspaceId: input.workspaceId,
    entityType: "SIGNAL",
    entityId: signal.id,
    fields: input.fields
  });

  return signal;
}

export async function attachEvidence(
  client: EvidenceClient,
  input: {
    workspaceId: string;
    entityType: EvidenceEntityType;
    entityId: string;
    fieldName: string;
    field: EnrichedField<PrimitiveFieldValue>;
  }
): Promise<EvidenceRecord | null> {
  if (!isVisibleValue(input.field.value)) {
    return null;
  }

  return client.evidence.create({
    data: {
      workspaceId: input.workspaceId,
      entityType: input.entityType,
      entityId: input.entityId,
      fieldName: input.fieldName,
      value: stringifyEvidenceValue(input.field.value),
      sourceUrl: input.field.sourceUrl ?? null,
      provider: input.field.provider ?? null,
      rawExcerpt: input.field.rawExcerpt ?? null,
      confidence: input.field.confidence ?? null,
      capturedAt: input.field.capturedAt ?? new Date()
    }
  });
}

export async function getEvidenceForEntity(
  client: EvidenceClient,
  input: {
    workspaceId: string;
    entityType: EvidenceEntityType;
    entityId: string;
    fieldName?: string;
  }
): Promise<EvidenceRecord[]> {
  return client.evidence.findMany({
    where: input,
    orderBy: {
      capturedAt: "desc"
    }
  });
}

async function findExistingAccount(
  client: EvidenceClient,
  input: UpsertAccountWithEvidenceInput
): Promise<AccountRecord | null> {
  if (input.id) {
    return client.account.findFirst({
      where: {
        id: input.id,
        workspaceId: input.workspaceId
      }
    });
  }

  const domain = visibleString(input.fields.domain?.value);
  const linkedinUrl = visibleString(input.fields.linkedinUrl?.value);
  const name = visibleString(input.fields.name?.value);
  const OR = [
    ...(domain ? [{ domain }] : []),
    ...(linkedinUrl ? [{ linkedinUrl }] : []),
    ...(name ? [{ name }] : [])
  ];

  if (OR.length === 0) {
    return null;
  }

  return client.account.findFirst({
    where: {
      workspaceId: input.workspaceId,
      OR
    }
  });
}

async function findExistingPerson(
  client: EvidenceClient,
  input: UpsertPersonWithEvidenceInput
): Promise<PersonRecord | null> {
  if (input.id) {
    return client.person.findFirst({
      where: {
        id: input.id,
        workspaceId: input.workspaceId
      }
    });
  }

  const linkedinUrl = visibleString(input.fields.linkedinUrl?.value);
  const email = visibleString(input.fields.email?.value);
  const fullName = visibleString(input.fields.fullName?.value);
  const OR = [
    ...(linkedinUrl ? [{ linkedinUrl }] : []),
    ...(email ? [{ email }] : []),
    ...(fullName ? [{ fullName }] : [])
  ];

  if (OR.length === 0) {
    return null;
  }

  return client.person.findFirst({
    where: {
      workspaceId: input.workspaceId,
      OR
    }
  });
}

async function filterUpdatableFields(
  client: EvidenceClient,
  input: {
    workspaceId: string;
    entityType: EvidenceEntityType;
    entityId: string;
    current: Record<string, unknown>;
    fields: Record<string, EnrichedField<PrimitiveFieldValue> | undefined>;
    overwritePolicy: OverwritePolicy;
  }
): Promise<Record<string, PrimitiveFieldValue>> {
  const data: Record<string, PrimitiveFieldValue> = {};

  for (const [fieldName, field] of Object.entries(input.fields)) {
    if (!field || !isVisibleValue(field.value)) {
      continue;
    }

    const currentValue = input.current[fieldName];
    const shouldUpdate = await shouldOverwriteField(client, {
      workspaceId: input.workspaceId,
      entityType: input.entityType,
      entityId: input.entityId,
      fieldName,
      currentValue,
      incoming: field,
      overwritePolicy: input.overwritePolicy
    });

    if (shouldUpdate) {
      data[fieldName] = field.value;
    }
  }

  return data;
}

async function shouldOverwriteField(
  client: EvidenceClient,
  input: {
    workspaceId: string;
    entityType: EvidenceEntityType;
    entityId: string;
    fieldName: string;
    currentValue: unknown;
    incoming: EnrichedField<PrimitiveFieldValue>;
    overwritePolicy: OverwritePolicy;
  }
): Promise<boolean> {
  if (input.overwritePolicy === "NEVER") {
    return false;
  }

  if (input.overwritePolicy === "ALWAYS") {
    return true;
  }

  if (!isVisibleValue(input.currentValue)) {
    return true;
  }

  if (input.overwritePolicy === "BLANK_ONLY") {
    return false;
  }

  const existingConfidence = await getBestFieldConfidence(client, input);
  const incomingConfidence = input.incoming.confidence ?? Number.NEGATIVE_INFINITY;

  return incomingConfidence > existingConfidence;
}

async function getBestFieldConfidence(
  client: EvidenceClient,
  input: {
    workspaceId: string;
    entityType: EvidenceEntityType;
    entityId: string;
    fieldName: string;
  }
): Promise<number> {
  const evidence = await getEvidenceForEntity(client, {
    workspaceId: input.workspaceId,
    entityType: input.entityType,
    entityId: input.entityId,
    fieldName: input.fieldName
  });

  return evidence.reduce(
    (best, row) => Math.max(best, row.confidence ?? Number.NEGATIVE_INFINITY),
    Number.NEGATIVE_INFINITY
  );
}

async function attachEvidenceForFields(
  client: EvidenceClient,
  input: {
    workspaceId: string;
    entityType: EvidenceEntityType;
    entityId: string;
    fields: Record<string, EnrichedField<PrimitiveFieldValue> | undefined>;
  }
): Promise<void> {
  await Promise.all(
    Object.entries(input.fields).map(([fieldName, field]) =>
      field
        ? attachEvidence(client, {
            workspaceId: input.workspaceId,
            entityType: input.entityType,
            entityId: input.entityId,
            fieldName,
            field
          })
        : Promise.resolve(null)
    )
  );
}

function visibleFieldValues(
  fields: Record<string, EnrichedField<PrimitiveFieldValue> | undefined>
): Record<string, PrimitiveFieldValue> {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([, field]) => field && isVisibleValue(field.value))
      .map(([fieldName, field]) => [fieldName, field?.value])
  ) as Record<string, PrimitiveFieldValue>;
}

function pickFields(
  fields: Record<string, EnrichedField<PrimitiveFieldValue> | undefined>,
  fieldNames: string[]
): Record<string, EnrichedField<PrimitiveFieldValue> | undefined> {
  return Object.fromEntries(
    fieldNames.map((fieldName) => [fieldName, fields[fieldName]])
  );
}

function isVisibleValue(value: unknown): value is PrimitiveFieldValue {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

function visibleString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function visibleDate(value: unknown): Date | undefined {
  return value instanceof Date ? value : undefined;
}

function stringifyEvidenceValue(value: PrimitiveFieldValue): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}
