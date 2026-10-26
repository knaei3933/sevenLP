import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

const databasePath = join(tmpdir(), `quote-draft-route-${process.pid}-${Date.now()}.db`);
process.env.POUCH_PUBLIC_LEAD_DB = databasePath;
process.env.POUCH_QUOTE_DRAFT_SIGNING_KEY = "f".repeat(64);
process.env.POUCH_QUOTE_DRAFT_ALLOWED_ORIGINS = "https://lp.example.com";

const {
  closePublicLeadStoreForTest,
  countPublicLeads,
  countPublicQuotations,
  resetPublicLeadStoreForTest,
} = await import("@/lib/public-lead-store");
const { verifyPublicQuoteDraft } = await import("@/lib/public-quote-draft.server");
const { DELETE, GET, PATCH, POST, PUT } = await import("@/app/api/public/lab/quote-drafts/route");

const url = "https://lp.example.com/api/public/lab/quote-drafts";
const fields = new URLSearchParams({
  colorCount: "3",
  designId: "rda",
  fillAmount: "2.50",
  locale: "ja",
  quantity: "10000",
  sizeKey: "round-60x80",
});

function request({
  body = fields,
  contentType = "application/x-www-form-urlencoded",
  headers = {},
  method = "POST",
}: {
  body?: BodyInit;
  contentType?: string | null;
  headers?: Record<string, string>;
  method?: string;
} = {}): Request {
  const requestHeaders = new Headers({
    host: "lp.example.com",
    origin: "https://lp.example.com",
    ...headers,
  });
  if (contentType !== null) requestHeaders.set("content-type", contentType);
  return new Request(url, { body, headers: requestHeaders, method });
}

beforeEach(async () => {
  await resetPublicLeadStoreForTest({ deleteDatabase: true });
});

afterEach(async () => {
  await resetPublicLeadStoreForTest({ deleteDatabase: true });
});

afterAll(async () => {
  await closePublicLeadStoreForTest();
  await rm(databasePath, { force: true });
});

describe("POST /api/public/lab/quote-drafts", () => {
  it("DRAFT-007A issues a fragment-only quote transport redirect without lead persistence", async () => {
    const response = await POST(request());
    expect(response.status).toBe(303);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const location = response.headers.get("location");
    expect(location).toMatch(/^https:\/\/lp\.example\.com\/quote#quoteDraft=/);

    const destination = new URL(location!);
    expect(destination.pathname).toBe("/quote");
    expect(destination.search).toBe("");
    expect(destination.searchParams.size).toBe(0);
    const token = decodeURIComponent(destination.hash.slice("#quoteDraft=".length));
    const payload = verifyPublicQuoteDraft(token);
    expect(payload).toEqual(expect.objectContaining({
      colorCount: 3,
      designId: "rda",
      fillAmount: "2.5",
      locale: "ja",
      quantity: 10_000,
      sizeKey: "round-60x80",
    }));

    expect(await countPublicLeads()).toBe(0);
    expect(await countPublicQuotations()).toBe(0);
  });

  it("enforces content type, strict origin allowlist, host identity, body size, and unknown fields", async () => {
    await expect(POST(request({ contentType: "application/json" }))).resolves.toMatchObject({ status: 415 });
    await expect(POST(request({ headers: { origin: "https://attacker.example" } }))).resolves.toMatchObject({ status: 403 });
    await expect(POST(request({ headers: { host: "other-host.example" } }))).resolves.toMatchObject({ status: 403 });
    await expect(POST(request({ body: "x".repeat(2_049) }))).resolves.toMatchObject({ status: 413 });

    const unknown = new URLSearchParams(fields);
    unknown.set("email", "guest@example.test");
    const rejected = await POST(request({ body: unknown }));
    expect(rejected.status).toBe(400);
    await expect(rejected.json()).resolves.toEqual({ errors: [{ field: "email", code: "unknownField" }] });
    expect(await countPublicLeads()).toBe(0);
    expect(await countPublicQuotations()).toBe(0);
  });

  it("returns 429 after ten durable route requests", async () => {
    for (let index = 0; index < 10; index += 1) {
      const response = await POST(request());
      expect(response.status).toBe(303);
    }
    const denied = await POST(request());
    expect(denied.status).toBe(429);
    expect(denied.headers.get("retry-after")).toBe("3600");
    await expect(denied.json()).resolves.toEqual({ error: "rate_limited" });
    expect(await countPublicLeads()).toBe(0);
    expect(await countPublicQuotations()).toBe(0);
  });

  it("DRAFT-008A exposes only POST with a safe no-store 405 contract", async () => {
    for (const [method, handler] of [
      ["GET", GET],
      ["PATCH", PATCH],
      ["PUT", PUT],
      ["DELETE", DELETE],
    ] as const) {
      const response = await (handler as unknown as (request: Request) => Promise<Response>)(
        new Request(url, { method }),
      );
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("POST");
      expect(response.headers.get("cache-control")).toBe("no-store");
      await expect(response.json()).resolves.toEqual({ error: "method_not_allowed" });
    }
  });
});
