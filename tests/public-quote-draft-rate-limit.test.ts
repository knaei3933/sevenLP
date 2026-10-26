import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

const databasePath = join(tmpdir(), `quote-draft-rate-${process.pid}-${Date.now()}.db`);
process.env.POUCH_PUBLIC_LEAD_DB = databasePath;
process.env.POUCH_QUOTE_DRAFT_SIGNING_KEY = "e".repeat(64);

const {
  closePublicLeadStoreForTest,
  consumePublicQuoteDraftRateLimit,
  countPublicLeads,
  countPublicQuotations,
  getPublicLeadDatabaseForTest,
  PUBLIC_QUOTE_DRAFT_RATE_LIMIT,
  resetPublicLeadStoreForTest,
} = await import("@/lib/public-lead-store");

const start = new Date("2026-01-02T00:00:00.000Z");

afterEach(async () => {
  await resetPublicLeadStoreForTest({ deleteDatabase: true });
});

afterAll(async () => {
  await closePublicLeadStoreForTest();
  await rm(databasePath, { force: true });
});

describe("durable public quote draft rate limit", () => {
  beforeEach(async () => {
    await resetPublicLeadStoreForTest({ deleteDatabase: true });
  });

  it("DRAFT-006A allows ten one-hour requests per hashed bucket and persists only safe columns", async () => {
    for (let index = 0; index < PUBLIC_QUOTE_DRAFT_RATE_LIMIT; index += 1) {
      const result = await consumePublicQuoteDraftRateLimit("192.0.2.10", { at: start });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(PUBLIC_QUOTE_DRAFT_RATE_LIMIT - index - 1);
    }

    const denied = await consumePublicQuoteDraftRateLimit("192.0.2.10", {
      at: new Date(start.getTime() + 1),
    });
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.retryAfterSeconds).toBe(3_600);

    const otherBucket = await consumePublicQuoteDraftRateLimit("192.0.2.11", { at: start });
    expect(otherBucket.allowed).toBe(true);

    const db = await getPublicLeadDatabaseForTest();
    const columns = db.prepare("PRAGMA table_info(public_quote_draft_rate_limits)").all()
      .map((row) => (row as { name: string }).name);
    expect(columns).toEqual([
      "bucket_hash",
      "request_count",
      "window_started_at",
      "expires_at",
    ]);

    const rows = db.prepare("SELECT * FROM public_quote_draft_rate_limits ORDER BY bucket_hash").all() as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual([
        "bucket_hash",
        "expires_at",
        "request_count",
        "window_started_at",
      ]);
      expect(row.bucket_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(row.request_count).toBeGreaterThanOrEqual(1);
      expect(String(row.window_started_at)).not.toContain("192.0.2.");
      expect(String(row.expires_at)).not.toContain("192.0.2.");
    }

    expect(await countPublicLeads()).toBe(0);
    expect(await countPublicQuotations()).toBe(0);
  });

  it("opens a new one-hour window after expiry and removes records older than 24 hours", async () => {
    await consumePublicQuoteDraftRateLimit("2001:db8::1", { at: start });

    const stillOldWindow = await consumePublicQuoteDraftRateLimit("2001:db8::1", {
      at: new Date(start.getTime() + 60 * 60 * 1_000),
    });
    expect(stillOldWindow.allowed).toBe(true);
    expect(stillOldWindow.remaining).toBe(9);

    const db = await getPublicLeadDatabaseForTest();
    db.prepare("UPDATE public_quote_draft_rate_limits SET expires_at = ? WHERE bucket_hash IS NOT NULL")
      .run(new Date(start.getTime() + 23 * 60 * 60 * 1_000).toISOString());

    db.prepare(`
      INSERT INTO public_quote_draft_rate_limits (
        bucket_hash, request_count, window_started_at, expires_at
      ) VALUES ('old', 1, ?, ?)
    `).run(
      new Date(start.getTime() - 60 * 60 * 1_000).toISOString(),
      new Date(start.getTime() - 60 * 60 * 1_000).toISOString(),
    );

    // Cleanup removes the 25-hour-old row, while merely expired records remain.
    await consumePublicQuoteDraftRateLimit("2001:db8::2", {
      at: new Date(start.getTime() + 24 * 60 * 60 * 1_000),
    });
    const beforeCleanup = db.prepare("SELECT COUNT(*) AS count FROM public_quote_draft_rate_limits").get() as { count: number };
    expect(beforeCleanup.count).toBe(2);

    // A fixed window resets when its own expiry passes, even though cleanup
    // retains records younger than 24 hours.
    const reset = await consumePublicQuoteDraftRateLimit("2001:db8::1", {
      at: new Date(start.getTime() + 25 * 60 * 60 * 1_000),
    });
    expect(reset.allowed).toBe(true);
    expect(reset.remaining).toBe(9);
    const rows = db.prepare(`
      SELECT bucket_hash, request_count
      FROM public_quote_draft_rate_limits
      ORDER BY bucket_hash
    `).all() as Array<{ bucket_hash: string; request_count: number }>;
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.bucket_hash === "old")).toBeUndefined();
    expect(rows.find((row) => row.bucket_hash === "2001:db8::1")).toBeUndefined();
    expect(await countPublicLeads()).toBe(0);
    expect(await countPublicQuotations()).toBe(0);
  });
});
