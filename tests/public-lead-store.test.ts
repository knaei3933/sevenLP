import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  closePublicLeadStoreForTest,
  countPublicLeads,
  countPublicQuotations,
  getPublicLeadDatabaseForTest,
  listPublicLeads,
  listPublicQuotations,
  PublicLeadStoreError,
  resolvePublicLeadDatabasePath,
  resetPublicLeadStoreForTest,
  savePublicLead,
  savePublicQuotation,
  setReferenceGeneratorForTest,
} from "@/lib/public-lead-store";
import {
  validatePublicLabRequest,
  type PublicLabConsultationRequest,
  type PublicLabQuotationRequest,
  type PublicLabRequest,
  type PublicLabSampleRequest,
} from "@/lib/public-lab";
import { createPublicLabQuote } from "@/lib/public-lab-quote.server";

const FIXED_NOW = new Date("2026-04-01T09:00:00.000Z");
const clock = { now: () => FIXED_NOW };
const databaseDirectory = await mkdtemp(join(tmpdir(), "public-lead-store-g005-"));
const publicDatabasePath = join(databaseDirectory, "public-leads.db");
const internalDatabasePath = join(databaseDirectory, "internal-quotation.db");

const quotationBase: PublicLabQuotationRequest = {
  requestType: "quotation",
  company: "株式会社テストラボ",
  contactName: "担当太郎",
  email: "taro@example.co.jp",
  phone: "03-1234-5678",
  sizeKey: "tube-35x80",
  quantity: 20_000,
  fillMlPerChamber: 3,
  connectedChambers: 1,
  fillingMethod: "hopper",
  printingMethod: "digital",
  colorCount: 2,
  bulkSupplied: true,
  consentVersion: "public-lab-privacy-v1",
  consentAccepted: true,
};

const consultationBase: PublicLabConsultationRequest = {
  requestType: "consultation",
  company: "合同会社サンプル営業",
  contactName: "担当花子",
  email: "hanako@example.com",
  phone: "+81 50 1234 5678",
  inquiryTopic: "shape_size",
  productCategory: "スキンケア",
  useCase: "新製品サンプルの条件確認",
  developmentStage: "development",
  plannedQuantity: "5000_10000",
  desiredTiming: "within_3m",
  message: "用途について相談したい（テスト用架空データ）",
  consentVersion: "public-lab-privacy-v1",
  consentAccepted: true,
};

const sampleBase: PublicLabSampleRequest = {
  requestType: "sample",
  company: "有限会社資材見本店",
  contactName: "担当次郎",
  email: "jiro@example.net",
  phone: "045-123-4567",
  sampleShapes: ["rda", "tua"],
  sampleType: "filled_sample",
  sampleQuantity: 2,
  productName: "保湿美容液",
  productCategory: "スキンケア",
  useCase: "展示会サンプル",
  plannedQuantity: "10001_50000",
  desiredTiming: "within_1m",
  recipientName: "サンプル受取太郎",
  postalCode: "150-0001",
  prefecture: "東京都",
  addressLine1: "渋谷区テスト1-2-3",
  deliveryPhone: "03-0000-0000",
  message: "サンプル条件を確認したい（テスト用架空データ）",
  consentVersion: "public-lab-privacy-v1",
  consentAccepted: true,
};

function createRequest<T extends PublicLabRequest>(
  base: T,
  input: Partial<T> = {},
): T {
  const result = validatePublicLabRequest({ ...base, ...input });
  if (!result.success) {
    throw new Error(`invalid fixture: ${JSON.stringify(result.errors)}`);
  }
  if (result.data.requestType !== base.requestType) {
    throw new Error("unexpected normalized request type");
  }
  return result.data as T;
}

function createQuotationFixture(
  input: Partial<PublicLabQuotationRequest> = {},
) {
  const request = createRequest(quotationBase, input);
  const calculation = createPublicLabQuote(request, clock);
  return {
    request,
    quote: calculation.quote,
    calculationVersion: calculation.internal.calculationVersion,
    resultHash: calculation.internal.resultHash,
  };
}

async function insertLead(
  reference: string,
  requestType: "quotation" | "consultation" | "sample",
) {
  const db = await getPublicLeadDatabaseForTest();
  db.prepare(`
    INSERT INTO public_leads (
      reference, request_type, company_name, contact_name, email, phone,
      message, consent_version, consent_at, created_at
    ) VALUES (?, ?, '事前投入株式会社', '事前担当', 'seed@example.com', '03-0000-0000', NULL, 'public-lab-privacy-v1', ?, ?)
  `).run(reference, requestType, FIXED_NOW.toISOString(), FIXED_NOW.toISOString());
}

async function insertQuotation(reference: string, leadReference: string): Promise<void> {
  const db = await getPublicLeadDatabaseForTest();
  const lead = db.prepare("SELECT id FROM public_leads WHERE reference = ?")
    .get(leadReference) as { id: number } | undefined;
  if (!lead) throw new Error(`missing seed lead: ${leadReference}`);
  const fixture = createQuotationFixture();
  db.prepare(`
    INSERT INTO public_quotations (
      reference, lead_id, canonical_request_json, customer_safe_quote_json,
      calculation_version, result_hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    reference,
    lead.id,
    JSON.stringify(fixture.request),
    JSON.stringify(fixture.quote),
    fixture.calculationVersion,
    fixture.resultHash,
    FIXED_NOW.toISOString(),
  );
}

async function saveQuotationFixture(
  input: Partial<PublicLabQuotationRequest> = {},
) {
  const fixture = createQuotationFixture(input);
  return {
    fixture,
    result: await savePublicQuotation(fixture, { createdAt: FIXED_NOW }),
  };
}

async function getStoreError(operation: Promise<unknown>): Promise<PublicLeadStoreError> {
  try {
    await operation;
  } catch (error) {
    expect(error).toBeInstanceOf(PublicLeadStoreError);
    return error as PublicLeadStoreError;
  }
  throw new Error("expected PublicLeadStoreError");
}

async function withDatabaseClosed<T>(operation: () => Promise<T>): Promise<T> {
  await closePublicLeadStoreForTest();
  return operation();
}

const originalEnvironment = {
  POUCH_PUBLIC_LEAD_DB: process.env.POUCH_PUBLIC_LEAD_DB,
  POUCH_QUOTATION_DB: process.env.POUCH_QUOTATION_DB,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL: process.env.VERCEL,
  NODE_ENV: process.env.NODE_ENV,
};

describe("public lead SQLite store", () => {
  afterEach(async () => {
    await resetPublicLeadStoreForTest({ deleteDatabase: true });
    setReferenceGeneratorForTest();
    process.env.POUCH_PUBLIC_LEAD_DB = publicDatabasePath;
    process.env.POUCH_QUOTATION_DB = internalDatabasePath;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL;
  });

  it("resolves the environment, preview, production, and development paths in precedence order", async () => {
    process.env.POUCH_PUBLIC_LEAD_DB = publicDatabasePath;
    process.env.VERCEL_ENV = "preview";
    expect(resolvePublicLeadDatabasePath()).toBe(resolve(publicDatabasePath));

    delete process.env.POUCH_PUBLIC_LEAD_DB;
    expect(resolvePublicLeadDatabasePath()).toBe("/tmp/public-leads.db");

    process.env.POUCH_PUBLIC_LEAD_DB = "/tmp/forbidden-production.db";
    process.env.VERCEL_ENV = "production";
    expect(() => resolvePublicLeadDatabasePath()).toThrow(PublicLeadStoreError);

    delete process.env.POUCH_PUBLIC_LEAD_DB;
    const failure = await getStoreError(
      savePublicLead(createRequest(consultationBase)),
    );
    expect(failure.code).toBe("public_storage_not_configured");

    delete process.env.VERCEL_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    expect(resolvePublicLeadDatabasePath()).toBe(
      resolve(process.cwd(), ".data/public-leads.db"),
    );
  });

  it("creates only the public tables, required indexes, WAL, and foreign-key configuration", async () => {
    await savePublicLead(createRequest(consultationBase), { createdAt: FIXED_NOW });
    const db = await getPublicLeadDatabaseForTest();

    expect(db.prepare("PRAGMA journal_mode").get()).toEqual({ journal_mode: "wal" });
    expect(db.prepare("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
    expect(db.prepare("PRAGMA busy_timeout").get()).toEqual({ timeout: 5_000 });

    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name
    `).all() as Array<{ name: string }>;
    expect(tables.map((row) => row.name)).toEqual([
      "public_lead_details",
      "public_leads",
      "public_quotations",
      "public_quote_draft_rate_limits",
    ]);

    const leadColumns = db.prepare("PRAGMA table_info(public_leads)").all()
      .map((row) => (row as { name: string }).name);
    expect(leadColumns).toEqual([
      "id", "reference", "request_type", "company_name", "contact_name", "email",
      "phone", "message", "consent_version", "consent_at", "created_at",
    ]);

    const quotationColumns = db.prepare("PRAGMA table_info(public_quotations)").all()
      .map((row) => (row as { name: string }).name);
    expect(quotationColumns).toEqual([
      "id", "reference", "lead_id", "canonical_request_json",
      "customer_safe_quote_json", "calculation_version", "result_hash", "created_at",
    ]);

    const rateLimitColumns = db.prepare("PRAGMA table_info(public_quote_draft_rate_limits)").all()
      .map((row) => (row as { name: string }).name);
    expect(rateLimitColumns).toEqual([
      "bucket_hash", "request_count", "window_started_at", "expires_at",
    ]);

    const typeIndexColumns = db.prepare("PRAGMA index_info(idx_public_leads_type_created_at)")
      .all().map((row) => (row as { name: string }).name);
    expect(typeIndexColumns).toEqual(["request_type", "created_at"]);
    const leadIndexColumns = db.prepare("PRAGMA index_info(idx_public_quotations_lead_id)")
      .all().map((row) => (row as { name: string }).name);
    expect(leadIndexColumns).toEqual(["lead_id"]);
  });

  it("enforces request type, references, and required quotation lead foreign keys", async () => {
    await savePublicLead(createRequest(consultationBase), { createdAt: FIXED_NOW });
    const db = await getPublicLeadDatabaseForTest();

    expect(() => db.prepare(`
      INSERT INTO public_leads (
        reference, request_type, company_name, contact_name, email, phone,
        message, consent_version, consent_at, created_at
      ) VALUES ('PL-BAD-TYPE', 'unknown', '会社', '担当', 'test@example.com', '03-0000-0000', NULL, 'public-lab-privacy-v1', ?, ?)
    `).run(FIXED_NOW.toISOString(), FIXED_NOW.toISOString())).toThrow(/CHECK constraint failed/);

    expect(() => db.prepare(`
      INSERT INTO public_quotations (
        reference, lead_id, canonical_request_json, customer_safe_quote_json,
        calculation_version, result_hash, created_at
      ) VALUES ('PL-ORPHAN', 99999, '{}', '{}', 'v1', '${"a".repeat(64)}', ?)
    `).run(FIXED_NOW.toISOString())).toThrow(/FOREIGN KEY constraint failed/);

    const duplicateReference = db.prepare(`
      INSERT INTO public_leads (
        reference, request_type, company_name, contact_name, email, phone,
        message, consent_version, consent_at, created_at
      ) VALUES (?, ?, '会社', '担当', 'test@example.com', '03-0000-0000', NULL, 'public-lab-privacy-v1', ?, ?)
    `);
    const existing = db.prepare("SELECT reference FROM public_leads LIMIT 1")
      .get() as { reference: string };
    expect(() => duplicateReference.run(
      existing.reference,
      "sample",
      FIXED_NOW.toISOString(),
      FIXED_NOW.toISOString(),
    )).toThrow(/UNIQUE constraint failed/);
  });

  it("persists normalized quotation requests, safe DTO JSON, metadata, and preserves the internal database", async () => {
    await writeFile(internalDatabasePath, "internal-database-baseline");
    const internalBefore = createHash("sha256")
      .update(await readFile(internalDatabasePath))
      .digest("hex");
    const { fixture, result } = await saveQuotationFixture({
      contactName: "  担当太郎  ",
      message: "内部連絡はleadにのみ保存される",
    });

    expect(result.quotationReference).toMatch(/^PL-\d{8}-[0-9A-F]{24}$/);
    expect(result.leadReference).toMatch(/^PL-\d{8}-[0-9A-F]{24}$/);
    expect(result.quote.reference).toBe(result.quotationReference);
    expect(await countPublicLeads({ requestType: "quotation" })).toBe(1);
    expect(await countPublicQuotations()).toBe(1);

    const db = await getPublicLeadDatabaseForTest();
    const quotation = db.prepare("SELECT * FROM public_quotations LIMIT 1").get() as {
      canonical_request_json: string;
      customer_safe_quote_json: string;
      calculation_version: string;
      result_hash: string;
    };
    expect(JSON.parse(quotation.canonical_request_json)).toEqual(fixture.request);
    expect(JSON.parse(quotation.customer_safe_quote_json)).toEqual(result.quote);
    expect(quotation.calculation_version).toBe(fixture.calculationVersion);
    expect(quotation.result_hash).toBe(fixture.resultHash);
    expect(quotation.customer_safe_quote_json).not.toContain("株式会社テストラボ");
    expect(quotation.customer_safe_quote_json).not.toContain("内部連絡はleadにのみ保存される");

    await withDatabaseClosed(async () => {
      const internalAfter = createHash("sha256")
        .update(await readFile(internalDatabasePath))
        .digest("hex");
      expect(internalAfter).toBe(internalBefore);
    });
  });

  it("saves consultation and sample requests as leads only and permits duplicate submissions", async () => {
    const consultation = createRequest(consultationBase);
    const sample = createRequest(sampleBase);
    const firstConsultation = await savePublicLead(consultation, { createdAt: FIXED_NOW });
    const duplicateConsultation = await savePublicLead(consultation, { createdAt: FIXED_NOW });
    const sampleResult = await savePublicLead(sample, { createdAt: FIXED_NOW });

    expect(firstConsultation.requestType).toBe("consultation");
    expect(duplicateConsultation.reference).not.toBe(firstConsultation.reference);
    expect(sampleResult.requestType).toBe("sample");
    expect(await countPublicLeads({ requestType: "consultation" })).toBe(2);
    expect(await countPublicLeads({ requestType: "sample" })).toBe(1);
    expect(await countPublicQuotations()).toBe(0);

    const summaries = await listPublicLeads({ limit: 10 }) as unknown as Array<Record<string, unknown>>;
    for (const summary of summaries) {
      expect(Object.keys(summary)).toEqual([
        "id", "reference", "requestType", "createdAt",
      ]);
    }
  });

  it("returns PII only when list callers explicitly request it", async () => {
    const consultation = createRequest(consultationBase);
    await savePublicLead(consultation, { createdAt: FIXED_NOW });
    const privateRecords = await listPublicLeads({ includePii: true, limit: 10 });
    expect(privateRecords).toHaveLength(1);
    expect(privateRecords[0]).toMatchObject({
      companyName: consultation.company,
      contactName: consultation.contactName,
      email: consultation.email,
      phone: consultation.phone,
      message: consultation.message,
      consentVersion: consultation.consentVersion,
      consentAt: FIXED_NOW.toISOString(),
    });
  });

  it("counts leads and quotations by request type, date, and calculation version", async () => {
    await savePublicLead(createRequest(consultationBase), { createdAt: FIXED_NOW });
    await savePublicLead(createRequest(sampleBase), {
      createdAt: new Date("2026-03-01T09:00:00.000Z"),
    });
    await saveQuotationFixture({ printingMethod: "digital" });
    await saveQuotationFixture({
      printingMethod: "gravure",
      quantity: 133_000,
    });

    expect(await countPublicLeads({
      requestType: "quotation",
      createdFrom: new Date("2026-04-01T00:00:00.000Z"),
      createdTo: "2026-04-01T23:59:59.999Z",
    })).toBe(2);
    expect(await countPublicLeads({
      createdFrom: "2026-03-01T00:00:00.000Z",
      createdTo: "2026-03-01T23:59:59.999Z",
    })).toBe(1);
    const quotationFixture = createQuotationFixture();
    expect(await countPublicQuotations({
      calculationVersion: quotationFixture.calculationVersion,
    })).toBe(2);
    expect(await listPublicQuotations({ requestType: "quotation", limit: 1 })).toHaveLength(1);
  });

  it("retries a lead reference collision with a new server-generated reference", async () => {
    await insertLead("PL-COLLISION-LEAD", "consultation");
    const references = ["PL-COLLISION-LEAD", "PL-RETRY-LEAD"];
    setReferenceGeneratorForTest(() => references.shift() ?? "PL-UNEXPECTED");

    const result = await savePublicLead(createRequest(consultationBase), { createdAt: FIXED_NOW });
    expect(result.reference).toBe("PL-RETRY-LEAD");
    expect(await countPublicLeads()).toBe(2);
  });

  it("retries a quotation reference collision atomically with a new server-generated reference", async () => {
    await insertLead("PL-SEED-LEAD", "quotation");
    await insertQuotation("PL-COLLISION-QUOTE", "PL-SEED-LEAD");
    const references = [
      "PL-FIRST-LEAD", "PL-COLLISION-QUOTE",
      "PL-SECOND-LEAD", "PL-RETRY-QUOTE",
    ];
    setReferenceGeneratorForTest(() => references.shift() ?? "PL-UNEXPECTED");

    const { result } = await saveQuotationFixture();
    expect(result.quotationReference).toBe("PL-RETRY-QUOTE");
    expect(result.leadReference).toBe("PL-SECOND-LEAD");
    expect(await countPublicLeads({ requestType: "quotation" })).toBe(2);
    expect(await countPublicQuotations()).toBe(2);
  });

  it("rolls back the complete quotation transaction after repeated reference collisions", async () => {
    await insertLead("PL-ROLLBACK-SEED", "quotation");
    await insertQuotation("PL-ROLLBACK-COLLISION", "PL-ROLLBACK-SEED");
    const references: string[] = [];
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      references.push(`PL-ROLLBACK-LEAD-${attempt}`, "PL-ROLLBACK-COLLISION");
    }
    setReferenceGeneratorForTest(() => references.shift() ?? "PL-UNEXPECTED");

    const failure = await getStoreError(saveQuotationFixture());
    expect(failure.code).toBe("public_quotation_save_failed");
    expect(await countPublicLeads({ requestType: "quotation" })).toBe(1);
    expect(await countPublicQuotations()).toBe(1);
    const db = await getPublicLeadDatabaseForTest();
    expect(db.prepare(`
      SELECT COUNT(*) AS count FROM public_leads WHERE reference LIKE 'PL-ROLLBACK-LEAD-%'
    `).get()).toEqual({ count: 0 });
  });

  it("keeps quotation JSON storage decoupled from the internal database schema", async () => {
    const source = await readFile("src/lib/public-lead-store.ts", "utf8");
    expect(source).not.toContain("POUCH_QUOTATION_DB");
    expect(source).not.toContain("ATTACH");
    expect(source).not.toContain("ALTER TABLE");
    await saveQuotationFixture();
    const quotations = await listPublicQuotations({ limit: 10 });
    expect(quotations).toHaveLength(1);
    expect(quotations[0].quote.requestType).toBe("quotation");
  });

  it("accepts contract-valid one-character lead values without accidental DTO substring rejection", async () => {
    const request = createQuotationFixture({
      company: "X",
      contactName: "X",
    });
    const result = await savePublicQuotation(request, { createdAt: FIXED_NOW });

    expect(result.quote.reference).toMatch(/^PL-[0-9]{8}-[0-9A-F]{16,28}$/);
    expect(await countPublicLeads({ requestType: "quotation" })).toBe(1);
    expect(await countPublicQuotations()).toBe(1);
  });

  it("reuses one initialized database connection for concurrent cold starts", async () => {
    const [first, second] = await Promise.all([
      getPublicLeadDatabaseForTest(),
      getPublicLeadDatabaseForTest(),
    ]);
    expect(second).toBe(first);
  });
});
