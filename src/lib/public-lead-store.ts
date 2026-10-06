import { randomBytes } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type {
  PublicLabConsultationRequest,
  PublicLabQuotationRequest,
  PublicLabRequest,
  PublicLabSampleRequest,
} from "./public-lab";
import type { PublicLabRequestType } from "./public-lab-options";
import { validatePublicLabRequest } from "./public-lab";
import type { PublicLabQuote } from "./public-lab-quote.server";

const REQUEST_TYPES: readonly PublicLabRequestType[] = [
  "quotation",
  "consultation",
  "sample",
] as const;
const BUSY_TIMEOUT_MS = 5_000;
const MAX_REFERENCE_ATTEMPTS = 5;
const PUBLIC_QUOTE_KEYS = [
  "billedQuantity",
  "consultationCta",
  "createdAt",
  "currency",
  "deliveryNote",
  "exclusions",
  "grandTotal",
  "pricePerPiece",
  "reference",
  "requestSummary",
  "requestType",
  "requestedQuantity",
  "sampleCta",
  "serviceRouteLabel",
  "subtotal",
  "tax",
  "validUntil",
] as const;
const MONEY_PATTERN = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;

export class PublicLeadStoreError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "PublicLeadStoreError";
    this.code = code;
  }
}

export type PublicLeadSaveResult = {
  reference: string;
  requestType: Exclude<PublicLabRequestType, "quotation">;
};

export type PublicQuotationSaveResult = {
  leadReference: string;
  quotationReference: string;
  quote: PublicLabQuote;
};

export interface PublicQuotationInput {
  request: PublicLabQuotationRequest;
  quote: PublicLabQuote;
  calculationVersion: string;
  resultHash: string;
}

export interface PublicLeadSaveOptions {
  createdAt?: Date;
}

export type PublicQuotationSaveOptions = PublicLeadSaveOptions;

export interface PublicLeadCountFilter {
  requestType?: PublicLabRequestType;
  createdFrom?: Date | string;
  createdTo?: Date | string;
}

export interface PublicLeadSummary {
  id: number;
  reference: string;
  requestType: PublicLabRequestType;
  createdAt: string;
}

export interface PublicLeadPrivateRecord extends PublicLeadSummary {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  message: string | null;
  consentVersion: string;
  consentAt: string;
}

export interface PublicQuotationCountFilter extends PublicLeadCountFilter {
  calculationVersion?: string;
}

export interface PublicQuotationRecord {
  id: number;
  reference: string;
  leadId: number;
  quote: PublicLabQuote;
  calculationVersion: string;
  resultHash: string;
  createdAt: string;
}

interface LeadRow {
  id: number;
  reference: string;
  request_type: PublicLabRequestType;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  message: string | null;
  consent_version: string;
  consent_at: string;
  created_at: string;
}

interface QuotationRow {
  id: number;
  reference: string;
  lead_id: number;
  customer_safe_quote_json: string;
  calculation_version: string;
  result_hash: string;
  created_at: string;
}

let database: DatabaseSync | null = null;
let databasePath: string | null = null;
let referenceGenerator: () => string = createServerReference;

export function resolvePublicLeadDatabasePath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configured = env.POUCH_PUBLIC_LEAD_DB;
  if (nonEmptyString(configured)) {
    const databasePath = resolve(configured);
    if (isProductionEnvironment(env) && isTemporaryPath(databasePath)) {
      throw new PublicLeadStoreError("public_storage_path_not_allowed");
    }
    return databasePath;
  }

  if (isProductionEnvironment(env) && !isVercelPreviewEnvironment(env)) {
    throw new PublicLeadStoreError("public_storage_not_configured");
  }
  if (isVercelPreviewEnvironment(env)) return "/tmp/public-leads.db";
  return resolve(process.cwd(), ".data/public-leads.db");
}

export async function savePublicLead(
  request: PublicLabRequest,
  options: PublicLeadSaveOptions = {},
): Promise<PublicLeadSaveResult> {
  const validatedRequest = validateRequest(request);
  if (validatedRequest.requestType === "quotation") {
    throw new PublicLeadStoreError("quotation_requires_quote");
  }
  const db = await getDatabase();
  const createdAt = toIsoDate(options.createdAt ?? new Date());

  for (let attempt = 1; attempt <= MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    const reference = nextReference();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(`
        INSERT INTO public_leads (
          reference, request_type, company_name, contact_name, email, phone,
          message, consent_version, consent_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        reference,
        validatedRequest.requestType,
        validatedRequest.company,
        validatedRequest.contactName,
        validatedRequest.email,
        validatedRequest.phone,
        validatedRequest.message ?? null,
        validatedRequest.consentVersion,
        createdAt,
        createdAt,
      );
      db.exec("COMMIT");
      return {
        reference,
        requestType: validatedRequest.requestType,
      };
    } catch (error) {
      db.exec("ROLLBACK");
      if (!isReferenceCollision(error) || attempt === MAX_REFERENCE_ATTEMPTS) {
        throw new PublicLeadStoreError("public_lead_save_failed");
      }
    }
  }

  throw new PublicLeadStoreError("public_reference_exhausted");
}

export async function savePublicQuotation(
  input: PublicQuotationInput,
  options: PublicQuotationSaveOptions = {},
): Promise<PublicQuotationSaveResult> {
  const request = validateQuotationRequest(input.request);
  const safeQuote = validateCustomerSafeQuote(input.quote, request);
  const calculationVersion = input.calculationVersion;
  if (!nonEmptyString(calculationVersion)) {
    throw new PublicLeadStoreError("invalid_calculation_version");
  }
  const resultHash = validateResultHash(input.resultHash);
  if (!calculationVersion) throw new PublicLeadStoreError("invalid_calculation_version");

  const db = await getDatabase();
  const createdAt = toIsoDate(options.createdAt ?? new Date());
  for (let attempt = 1; attempt <= MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    const leadReference = nextReference();
    const quotationReference = nextReference();
    const quote = structuredClone(safeQuote);
    quote.reference = quotationReference;
    const quoteJson = JSON.stringify(quote);
    const requestJson = JSON.stringify(request);
    db.exec("BEGIN IMMEDIATE");
    try {
      const lead = db.prepare(`
        INSERT INTO public_leads (
          reference, request_type, company_name, contact_name, email, phone,
          message, consent_version, consent_at, created_at
        ) VALUES (?, 'quotation', ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
      `).get(
        leadReference,
        request.company,
        request.contactName,
        request.email,
        request.phone,
        request.message ?? null,
        request.consentVersion,
        createdAt,
        createdAt,
      ) as Pick<LeadRow, "id">;

      db.prepare(`
        INSERT INTO public_quotations (
          reference, lead_id, canonical_request_json, customer_safe_quote_json,
          calculation_version, result_hash, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        quotationReference,
        lead.id,
        requestJson,
        quoteJson,
        calculationVersion,
        resultHash,
        createdAt,
      );
      db.exec("COMMIT");
      return {
        leadReference,
        quotationReference,
        quote,
      };
    } catch (error) {
      db.exec("ROLLBACK");
      if (!isReferenceCollision(error) || attempt === MAX_REFERENCE_ATTEMPTS) {
        throw new PublicLeadStoreError("public_quotation_save_failed");
      }
    }
  }

  throw new PublicLeadStoreError("public_reference_exhausted");
}

export async function countPublicLeads(
  filter: PublicLeadCountFilter = {},
): Promise<number> {
  const db = await getDatabase();
  const { predicates, arguments: sqlArguments } = createLeadPredicates(filter);
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM public_leads
    ${predicates.length > 0 ? `WHERE ${predicates.join(" AND ")}` : ""}
  `).get(...sqlArguments) as { count: number };
  return Number(row.count);
}

export async function listPublicLeads({
  includePii = false,
  limit = 100,
  ...filter
}: PublicLeadCountFilter & { includePii?: boolean; limit?: number } = {},
): Promise<Array<PublicLeadSummary | PublicLeadPrivateRecord>> {
  const db = await getDatabase();
  const { predicates, arguments: sqlArguments } = createLeadPredicates(filter);
  const rows = db.prepare(`
    SELECT *
    FROM public_leads
    ${predicates.length > 0 ? `WHERE ${predicates.join(" AND ")}` : ""}
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(...sqlArguments, normalizeLimit(limit)) as unknown as LeadRow[];
  return rows.map((row) => includePii ? mapPrivateLead(row) : mapLeadSummary(row));
}

export async function countPublicQuotations(
  filter: PublicQuotationCountFilter = {},
): Promise<number> {
  const db = await getDatabase();
  const { predicates, arguments: sqlArguments } = createQuotationPredicates(filter);
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM public_quotations AS quotations
    INNER JOIN public_leads AS leads ON leads.id = quotations.lead_id
    ${predicates.length > 0 ? `WHERE ${predicates.join(" AND ")}` : ""}
  `).get(...sqlArguments) as { count: number };
  return Number(row.count);
}

export async function listPublicQuotations({
  limit = 100,
  ...filter
}: PublicQuotationCountFilter & { limit?: number } = {},
): Promise<PublicQuotationRecord[]> {
  const db = await getDatabase();
  const { predicates, arguments: sqlArguments } = createQuotationPredicates(filter);
  const rows = db.prepare(`
    SELECT quotations.id, quotations.reference, quotations.lead_id,
           quotations.customer_safe_quote_json, quotations.calculation_version,
           quotations.result_hash, quotations.created_at
    FROM public_quotations AS quotations
    INNER JOIN public_leads AS leads ON leads.id = quotations.lead_id
    ${predicates.length > 0 ? `WHERE ${predicates.join(" AND ")}` : ""}
    ORDER BY quotations.created_at DESC, quotations.id DESC
    LIMIT ?
  `).all(...sqlArguments, normalizeLimit(limit)) as unknown as QuotationRow[];
  return rows.map(mapQuotation);
}

/** Test-only lifecycle hook: closes the isolated database connection. */
export async function closePublicLeadStoreForTest(): Promise<void> {
  database?.close();
  database = null;
}

/** Test-only accessor for schema, constraint, pragma, and rollback assertions. */
export async function getPublicLeadDatabaseForTest(): Promise<DatabaseSync> {
  return getDatabase();
}

/** Test-only lifecycle hook: optionally removes the SQLite sidecar files. */
export async function resetPublicLeadStoreForTest(
  options: { deleteDatabase?: boolean } = {},
): Promise<void> {
  const path = databasePath;
  await closePublicLeadStoreForTest();
  if (options.deleteDatabase && path) {
    await Promise.all([
      rm(path, { force: true }),
      rm(`${path}-wal`, { force: true }),
      rm(`${path}-shm`, { force: true }),
    ]);
  }
}

/** Test-only hook for deterministic unique-reference collision retries. */
export function setReferenceGeneratorForTest(generator?: () => string): void {
  referenceGenerator = generator ?? createServerReference;
}

async function getDatabase(): Promise<DatabaseSync> {
  if (database) return database;
  const path = resolvePublicLeadDatabasePath();
  await mkdir(dirname(path), { recursive: true });
  const initializedDatabase = new DatabaseSync(path, {
    enableForeignKeyConstraints: true,
    timeout: BUSY_TIMEOUT_MS,
  });
  initializedDatabase.exec("PRAGMA foreign_keys = ON");
  initializedDatabase.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
  initializedDatabase.exec("PRAGMA journal_mode = WAL");
  initializedDatabase.exec(`
    CREATE TABLE IF NOT EXISTS public_leads (
      id INTEGER PRIMARY KEY,
      reference TEXT NOT NULL UNIQUE,
      request_type TEXT NOT NULL CHECK (request_type IN ('quotation', 'consultation', 'sample')),
      company_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      message TEXT,
      consent_version TEXT NOT NULL,
      consent_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_public_leads_type_created_at
      ON public_leads(request_type, created_at);

    CREATE TABLE IF NOT EXISTS public_quotations (
      id INTEGER PRIMARY KEY,
      reference TEXT NOT NULL UNIQUE,
      lead_id INTEGER NOT NULL REFERENCES public_leads(id),
      canonical_request_json TEXT NOT NULL,
      customer_safe_quote_json TEXT NOT NULL,
      calculation_version TEXT NOT NULL,
      result_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_public_quotations_lead_id
      ON public_quotations(lead_id);
  `);

  database = initializedDatabase;
  databasePath = path;
  return database;
}

function createLeadPredicates(filter: PublicLeadCountFilter): {
  predicates: string[];
  arguments: Array<string | number>;
} {
  const predicates: string[] = [];
  const sqlArguments: Array<string | number> = [];
  if (filter.requestType) {
    if (!REQUEST_TYPES.includes(filter.requestType)) {
      throw new PublicLeadStoreError("invalid_request_type");
    }
    predicates.push("request_type = ?");
    sqlArguments.push(filter.requestType);
  }
  if (filter.createdFrom) {
    predicates.push("created_at >= ?");
    sqlArguments.push(toIsoDate(filter.createdFrom));
  }
  if (filter.createdTo) {
    predicates.push("created_at <= ?");
    sqlArguments.push(toIsoDate(filter.createdTo));
  }
  return { predicates, arguments: sqlArguments };
}

function createQuotationPredicates(filter: PublicQuotationCountFilter): {
  predicates: string[];
  arguments: Array<string | number>;
} {
  const leadPredicates = createLeadPredicates(filter);
  const predicates = leadPredicates.predicates.map((predicate) => `leads.${predicate}`);
  const sqlArguments = [...leadPredicates.arguments];
  if (filter.calculationVersion) {
    const version = filter.calculationVersion;
    if (!nonEmptyString(version)) throw new PublicLeadStoreError("invalid_calculation_version");
    predicates.push("quotations.calculation_version = ?");
    sqlArguments.push(version);
  }
  return { predicates, arguments: sqlArguments };
}

function mapLeadSummary(row: LeadRow): PublicLeadSummary {
  return {
    id: row.id,
    reference: row.reference,
    requestType: row.request_type,
    createdAt: row.created_at,
  };
}

function mapPrivateLead(row: LeadRow): PublicLeadPrivateRecord {
  return {
    ...mapLeadSummary(row),
    companyName: row.company_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    consentVersion: row.consent_version,
    consentAt: row.consent_at,
  };
}

function mapQuotation(row: QuotationRow): PublicQuotationRecord {
  return {
    id: row.id,
    reference: row.reference,
    leadId: row.lead_id,
    quote: JSON.parse(row.customer_safe_quote_json) as PublicLabQuote,
    calculationVersion: row.calculation_version,
    resultHash: row.result_hash,
    createdAt: row.created_at,
  };
}

function validateRequest(request: PublicLabRequest): PublicLabRequest {
  const result = validatePublicLabRequest(request);
  if (!result.success) throw new PublicLeadStoreError("invalid_public_lab_request");
  return result.data;
}

function validateQuotationRequest(
  request: PublicLabQuotationRequest,
): PublicLabQuotationRequest {
  const validated = validateRequest(request);
  if (validated.requestType !== "quotation") {
    throw new PublicLeadStoreError("invalid_quotation_request");
  }
  return validated;
}

function validateCustomerSafeQuote(
  quote: PublicLabQuote,
  request: PublicLabQuotationRequest,
): PublicLabQuote {
  if (!quote || typeof quote !== "object" || Array.isArray(quote)) {
    throw new PublicLeadStoreError("invalid_public_quote");
  }
  const keys = Object.keys(quote).sort();
  const expectedKeys = [...PUBLIC_QUOTE_KEYS].sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    throw new PublicLeadStoreError("invalid_public_quote");
  }

  const stringKeys = [
    "reference", "createdAt", "validUntil", "requestSummary", "serviceRouteLabel",
    "requestedQuantity", "billedQuantity", "pricePerPiece", "subtotal", "tax",
    "grandTotal", "deliveryNote", "consultationCta", "sampleCta",
  ] as const;
  for (const key of stringKeys) {
    if (typeof quote[key] !== "string" || !quote[key]) {
      throw new PublicLeadStoreError("invalid_public_quote");
    }
  }
  if (quote.requestType !== "quotation" || quote.currency !== "JPY") {
    throw new PublicLeadStoreError("invalid_public_quote");
  }
  if (!Array.isArray(quote.exclusions) || quote.exclusions.some((item) => typeof item !== "string")) {
    throw new PublicLeadStoreError("invalid_public_quote");
  }
  for (const key of ["pricePerPiece", "subtotal", "tax", "grandTotal"] as const) {
    if (!MONEY_PATTERN.test(quote[key])) throw new PublicLeadStoreError("invalid_public_quote");
  }
  if (Number.isNaN(new Date(quote.createdAt).getTime())) {
    throw new PublicLeadStoreError("invalid_public_quote");
  }

  const serialized = JSON.stringify(quote);
  const prohibitedValues = [
    request.company,
    request.contactName,
    request.email,
    request.phone,
    request.message,
  ].filter((value): value is string => Boolean(value));
  if (prohibitedValues.some((value) => serialized.includes(value))) {
    throw new PublicLeadStoreError("unsafe_public_quote");
  }
  return structuredClone(quote);
}

function validateResultHash(value: string): string {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new PublicLeadStoreError("invalid_result_hash");
  }
  return value;
}

function isProductionEnvironment(env: NodeJS.ProcessEnv): boolean {
  return env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
}

function isVercelPreviewEnvironment(env: NodeJS.ProcessEnv): boolean {
  return env.VERCEL_ENV === "preview";
}

function isTemporaryPath(path: string): boolean {
  return path === "/tmp" || path.startsWith("/tmp/");
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toIsoDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new PublicLeadStoreError("invalid_date");
  return date.toISOString();
}

function normalizeLimit(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 1_000) {
    throw new PublicLeadStoreError("invalid_limit");
  }
  return value;
}

function createServerReference(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `PL-${date}-${randomBytes(12).toString("hex").toUpperCase()}`;
}

function nextReference(): string {
  return referenceGenerator();
}

function isReferenceCollision(error: unknown): boolean {
  return error instanceof Error
    && /UNIQUE constraint failed: public_(?:leads|quotations)\.reference/.test(error.message);
}
