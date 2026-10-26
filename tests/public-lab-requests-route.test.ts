import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, afterAll, describe, expect, it, vi } from "vitest";
import type { PublicLabQuotationRequest } from "@/lib/public-lab";

vi.mock("@/lib/public-lab-quote.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/public-lab-quote.server")>();
  return {
    ...actual,
    createPublicLabQuote: (
      request: Parameters<typeof actual.createPublicLabQuote>[0],
      options?: Parameters<typeof actual.createPublicLabQuote>[1],
    ) => {
      if (process.env.G006_FAIL_CALCULATION === "1") {
        throw new actual.PublicLabQuoteError("quotation_unavailable");
      }
      return actual.createPublicLabQuote(request, options);
    },
  };
});

const databaseDirectory = await mkdtemp(join(tmpdir(), "public-lab-route-g006-"));
const databasePath = join(databaseDirectory, "public-leads.db");
const originalEnvironment = {
  POUCH_PUBLIC_LEAD_DB: process.env.POUCH_PUBLIC_LEAD_DB,
  G006_FAIL_CALCULATION: process.env.G006_FAIL_CALCULATION,
};
process.env.POUCH_PUBLIC_LEAD_DB = databasePath;
delete process.env.G006_FAIL_CALCULATION;

const { GET, POST, PATCH, PUT, DELETE, OPTIONS } = await import(
  "@/app/api/public/lab/requests/route"
);
const { PUBLIC_LAB_CONSENT_VERSION } = await import("@/lib/public-lab");
const { validatePublicLabRequest } = await import("@/lib/public-lab");
const {
  closePublicLeadStoreForTest,
  countPublicLeads,
  countPublicQuotations,
  getPublicLeadDatabaseForTest,
  listPublicQuotations,
  resetPublicLeadStoreForTest,
  setReferenceGeneratorForTest,
} = await import("@/lib/public-lead-store");
const { createPublicLabQuote } = await import("@/lib/public-lab-quote.server");

const quotationBase: PublicLabQuotationRequest = {
  requestType: "quotation",
  company: "株式会社ルートテスト",
  contactName: "担当太郎",
  email: "taro@route.example.jp",
  phone: "03-1234-5678",
  sizeKey: "tube-35x80",
  quantity: 20_000,
  fillMlPerChamber: 3,
  connectedChambers: 1,
  fillingMethod: "hopper",
  printingMethod: "digital",
  colorCount: 2,
  bulkSupplied: true,
  consentVersion: PUBLIC_LAB_CONSENT_VERSION,
  consentAccepted: true,
};

const consultationBody = {
  requestType: "consultation",
  company: "合同会社ルート相談",
  contactName: "担当花子",
  email: "hanako@route.example.jp",
  phone: "+81 50 1234 5678",
  message: "用途相談の統合テスト用架空連絡先です。",
  consentVersion: PUBLIC_LAB_CONSENT_VERSION,
  consentAccepted: true,
};

const sampleBody = {
  requestType: "sample",
  company: "有限会社ルート見本",
  contactName: "担当次郎",
  email: "jiro@route.example.jp",
  phone: "045-123-4567",
  message: "サンプル条件の統合テスト用架空連絡先です。",
  consentVersion: PUBLIC_LAB_CONSENT_VERSION,
  consentAccepted: true,
};

const quoteKeys = [
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
];

function publicRequest(
  body: string | null,
  {
    contentType = "application/json",
    origin = "http://localhost",
    url = "http://localhost/api/public/lab/requests",
    method = "POST",
  } = {},
): Request {
  const headers = new Headers({ origin });
  if (contentType !== null) headers.set("content-type", contentType);
  headers.set("host", new URL(url).host);
  return body === null
    ? new Request(url, { method, headers })
    : new Request(url, { method, body, headers });
}

async function jsonOf(response: Response): Promise<unknown> {
  expect(response.headers.get("cache-control")).toBe("no-store");
  return response.json();
}

function expectNoInternalValues(payload: unknown): void {
  const serialized = JSON.stringify(payload);
  expect(serialized).not.toContain("canonicalRequest");
  expect(serialized).not.toContain("calculationVersion");
  expect(serialized).not.toContain("resultHash");
  expect(serialized).not.toContain("leadReference");
  expect(serialized).not.toContain("internal");
}

async function seedQuotationForCollision(
  leadReference: string,
  quotationReference: string,
): Promise<void> {
  const db = await getPublicLeadDatabaseForTest();
  const result = validateFixture(quotationBase);
  const calculation = createPublicLabQuote(result.data);
  db.exec("BEGIN IMMEDIATE");
  try {
    const lead = db.prepare(`
      INSERT INTO public_leads (
        reference, request_type, company_name, contact_name, email, phone,
        message, consent_version, consent_at, created_at
      ) VALUES (?, 'quotation', ?, ?, ?, ?, NULL, ?, ?, ?)
      RETURNING id
    `).get(
      leadReference,
      result.data.company,
      result.data.contactName,
      result.data.email,
      result.data.phone,
      result.data.consentVersion,
      new Date(0).toISOString(),
      new Date(0).toISOString(),
    ) as { id: number };
    db.prepare(`
      INSERT INTO public_quotations (
        reference, lead_id, canonical_request_json, customer_safe_quote_json,
        calculation_version, result_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      quotationReference,
      lead.id,
      JSON.stringify(result.data),
      JSON.stringify(calculation.quote),
      calculation.internal.calculationVersion,
      calculation.internal.resultHash,
      new Date(0).toISOString(),
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function validateFixture(input: typeof quotationBase) {
  const result = validatePublicLabRequest(input);
  if (!result.success) throw new Error("invalid route test fixture");
  return { success: true, data: result.data as PublicLabQuotationRequest } as const;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await resetPublicLeadStoreForTest({ deleteDatabase: true });
  setReferenceGeneratorForTest();
  delete process.env.G006_FAIL_CALCULATION;
});

afterAll(async () => {
  await closePublicLeadStoreForTest();
  await rm(databaseDirectory, { recursive: true, force: true });
  process.env.POUCH_PUBLIC_LEAD_DB = originalEnvironment.POUCH_PUBLIC_LEAD_DB;
  process.env.G006_FAIL_CALCULATION = originalEnvironment.G006_FAIL_CALCULATION;
});

describe("POST /api/public/lab/requests", () => {
  it("calculates and persists a customer-safe digital quotation", async () => {
    const response = await POST(publicRequest(JSON.stringify(quotationBase)));
    const payload = await jsonOf(response);

    expect(response.status).toBe(201);
    expect(payload).toHaveProperty("quote");
    const { quote } = payload as { quote: Record<string, unknown> };
    expect(Object.keys(quote).sort()).toEqual(quoteKeys);
    expect(quote.requestType).toBe("quotation");
    expect(quote.currency).toBe("JPY");

    const expected = createPublicLabQuote(validateFixture(quotationBase).data);
    for (const field of ["pricePerPiece", "subtotal", "tax", "grandTotal"] as const) {
      expect(quote[field]).toBe(expected.quote[field]);
    }
    expect(await countPublicLeads({ requestType: "quotation" })).toBe(1);
    expect(await countPublicQuotations()).toBe(1);
    const stored = (await listPublicQuotations())[0];
    expect(stored.quote).toEqual((payload as { quote: unknown }).quote);
    expectNoInternalValues(payload);
  });

  it("calculates and persists a customer-safe gravure quotation", async () => {
    const body = { ...quotationBase, printingMethod: "gravure", colorCount: 4 };
    const response = await POST(publicRequest(JSON.stringify(body)));
    const payload = await jsonOf(response);
    const { quote } = payload as { quote: Record<string, unknown> };

    expect(response.status).toBe(201);
    expect(quote.serviceRouteLabel).toBe("グラビア印刷");
    const expected = createPublicLabQuote(validateFixture({
      ...quotationBase,
      printingMethod: "gravure",
      colorCount: 4,
    }).data);
    expect(quote.grandTotal).toBe(expected.quote.grandTotal);
    expect(await countPublicLeads({ requestType: "quotation" })).toBe(1);
    expect(await countPublicQuotations()).toBe(1);
  });

  it("persists consultation and sample leads without releasing a quotation", async () => {
    for (const body of [consultationBody, sampleBody] as const) {
      const response = await POST(publicRequest(JSON.stringify(body)));
      const payload = await jsonOf(response);
      const confirmation = payload as {
        reference?: unknown;
        requestType?: unknown;
        message?: unknown;
      };

      expect(response.status).toBe(201);
      expect(typeof confirmation.reference).toBe("string");
      expect(confirmation.requestType).toBe(body.requestType);
      expect(typeof confirmation.message).toBe("string");
      expect(payload).not.toHaveProperty("quote");
      expectNoInternalValues(payload);
    }

    expect(await countPublicLeads({ requestType: "consultation" })).toBe(1);
    expect(await countPublicLeads({ requestType: "sample" })).toBe(1);
    expect(await countPublicQuotations()).toBe(0);
  });

  it("returns field errors for missing consent and persists nothing", async () => {
    const body = {
      ...quotationBase,
      consentVersion: "obsolete-consent",
      consentAccepted: false,
    };
    const response = await POST(publicRequest(JSON.stringify(body)));
    const payload = await jsonOf(response);

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      errors: [
        { field: "consentVersion", code: "invalidValue" },
        { field: "consentAccepted", code: "mustBeAccepted" },
      ],
    });
    expect(await countPublicLeads()).toBe(0);
    expect(await countPublicQuotations()).toBe(0);
  });

  it("reports unknown and invalid fields without echoing submitted values", async () => {
    const secretTotal = "secret-client-total-value";
    const unknownResponse = await POST(publicRequest(JSON.stringify({
      ...quotationBase,
      clientGrandTotal: secretTotal,
    })));
    const unknownPayload = await jsonOf(unknownResponse);
    const invalidResponse = await POST(publicRequest(JSON.stringify({
      ...quotationBase,
      quantity: 9_999,
    })));
    const spaMinimumResponse = await POST(publicRequest(JSON.stringify({
      ...quotationBase,
      sizeKey: "spa-35x80",
      quantity: 49_999,
      fillMlPerChamber: 1,
    })));
    const spaMinimumPayload = await jsonOf(spaMinimumResponse);
    const invalidPayload = await jsonOf(invalidResponse);

    expect(unknownResponse.status).toBe(400);
    expect(unknownPayload).toEqual({
      errors: [{ field: "clientGrandTotal", code: "unknownField" }],
    });
    expect(JSON.stringify(unknownPayload)).not.toContain(secretTotal);
    expect(invalidResponse.status).toBe(400);
    expect(invalidPayload).toEqual({
      errors: [{ field: "quantity", code: "outOfRange" }],
    });
    expect(spaMinimumResponse.status).toBe(400);
    expect(spaMinimumPayload).toEqual({
      errors: [{ field: "quantity", code: "outOfRange" }],
    });
    expect(JSON.stringify(invalidPayload)).not.toContain("9999");
    expect(await countPublicLeads()).toBe(0);
  });

  it("rejects the wrong content type and cross-origin requests", async () => {
    const body = JSON.stringify(consultationBody);
    const wrongType = await POST(publicRequest(body, { contentType: "text/plain" }));
    const crossOrigin = await POST(publicRequest(body, {
      origin: "https://evil.example",
      url: "https://localhost/api/public/lab/requests",
    }));
    const missingOrigin = await POST(publicRequest(body, { origin: "" }));

    expect(wrongType.status).toBe(415);
    expect(await wrongType.json()).toEqual({ error: "unsupported_media_type" });
    for (const response of [crossOrigin, missingOrigin]) {
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "invalid_origin" });
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(await countPublicLeads()).toBe(0);
  });

  it("rejects malformed JSON and oversized bodies safely", async () => {
    const malformed = await POST(publicRequest("{not-json", { origin: "http://localhost" }));
    const oversized = JSON.stringify({
      ...consultationBody,
      message: "x".repeat(33_000),
    });
    const tooLarge = await POST(publicRequest(oversized));

    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: "invalid_json" });
    expect(tooLarge.status).toBe(413);
    expect(await tooLarge.json()).toEqual({ error: "request_too_large" });
    expect(await countPublicLeads()).toBe(0);
    expect(await countPublicQuotations()).toBe(0);
  });

  it("returns a generic accepted response for a non-empty honeypot without persistence", async () => {
    const body = { ...quotationBase, honeypot: "bot-content" };
    const response = await POST(publicRequest(JSON.stringify(body)));
    const payload = await jsonOf(response);

    expect(response.status).toBe(202);
    expect(payload).toEqual({ status: "accepted" });
    expect(await countPublicLeads()).toBe(0);
    expect(await countPublicQuotations()).toBe(0);
  });

  it("maps calculation failure to a safe response without persistence", async () => {
    process.env.G006_FAIL_CALCULATION = "1";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(publicRequest(JSON.stringify(quotationBase)));
    const payload = await jsonOf(response);

    expect(response.status).toBe(503);
    expect(payload).toEqual({ error: "quotation_unavailable" });
    expectNoInternalValues(payload);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const log = JSON.parse(errorSpy.mock.calls[0]?.[0] as string);
    expect(log).toMatchObject({
      event: "public_lab_request_failed",
      outcome: "error",
      requestType: "quotation",
    });
    expect(log.durationMs).toBeGreaterThanOrEqual(0);
    expect(Object.keys(log).sort()).toEqual([
      "durationMs", "event", "outcome", "requestType",
    ]);
    errorSpy.mockRestore();
    expect(await countPublicLeads()).toBe(0);
    expect(await countPublicQuotations()).toBe(0);
  });

  it("rolls back a failing quotation transaction and does not release a quote", async () => {
    await seedQuotationForCollision("PL-ROUTE-EXISTING-LEAD", "PL-ROUTE-COLLISION");
    const references: string[] = [];
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      references.push(
        `PL-ROUTE-LEAD-${attempt}`,
        "PL-ROUTE-COLLISION",
      );
    }
    setReferenceGeneratorForTest(() => references.shift() ?? "PL-ROUTE-UNEXPECTED");

    const response = await POST(publicRequest(JSON.stringify(quotationBase)));
    const payload = await jsonOf(response);

    expect(response.status).toBe(503);
    expect(payload).toEqual({ error: "quotation_unavailable" });
    expect(await countPublicLeads({ requestType: "quotation" })).toBe(1);
    expect(await countPublicQuotations()).toBe(1);
    const db = await getPublicLeadDatabaseForTest();
    expect(db.prepare(`
      SELECT COUNT(*) AS count
      FROM public_leads
      WHERE reference LIKE 'PL-ROUTE-LEAD-%'
    `).get()).toEqual({ count: 0 });
  });

  it("allows duplicate submissions and stores duplicate calculation audits separately", async () => {
    const body = JSON.stringify(quotationBase);
    const first = await POST(publicRequest(body));
    const second = await POST(publicRequest(body));
    const firstPayload = await jsonOf(first);
    const secondPayload = await jsonOf(second);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(await countPublicLeads({ requestType: "quotation" })).toBe(2);
    expect(await countPublicQuotations()).toBe(2);

    const quotations = await listPublicQuotations();
    expect(new Set(quotations.map((record) => record.reference)).size).toBe(2);
    expect(new Set(quotations.map((record) => record.resultHash)).size).toBe(1);
    expect(firstPayload).not.toEqual(secondPayload);
  });

  it("returns safe 405 responses for unsupported methods", async () => {
    for (const handler of [GET, PATCH, PUT, DELETE, OPTIONS]) {
      const response = await handler(publicRequest(null, { method: "GET" }));
      expect(response.status).toBe(405);
      expect(await response.json()).toEqual({ error: "method_not_allowed" });
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("keeps the internal calculation endpoint anonymous-only", async () => {
    const { POST: calculate } = await import("@/app/api/calculate/route");
    const response = await calculate(new Request("http://localhost/api/calculate", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "authentication_required" });
  });

  it("keeps route source limited to the mutation and safe method responses", async () => {
    const source = await readFile("src/app/api/public/lab/requests/route.ts", "utf8");
    expect(source).toContain("export async function POST");
    expect(source).toContain("export const GET = methodNotAllowed");
    expect(source).not.toContain("listPublicLeads");
    expect(source).not.toContain("listPublicQuotations");
    expect(source).not.toContain("PublicLeadPrivateRecord");
  });
});
