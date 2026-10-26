import { createHmac } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, describe, expect, it } from "vitest";

process.env.POUCH_QUOTE_DRAFT_SIGNING_KEY = "a".repeat(64);
process.env.POUCH_QUOTE_DRAFT_ALLOWED_ORIGINS = "https://lp.example.com";

const {
  issuePublicQuoteDraft,
  PublicQuoteDraftError,
  QUOTE_DRAFT_MAX_AGE_SECONDS,
  QUOTE_DRAFT_MAX_ENCODED_BYTES,
  verifyPublicQuoteDraft,
} = await import("@/lib/public-quote-draft.server");

const validInput = {
  colorCount: 2,
  designId: "spa",
  fillAmount: "1.00",
  locale: "ja",
  quantity: 50_000,
  sizeKey: "spa-35x80",
};

function payloadFrom(token: string): Record<string, unknown> {
  const [, , encoded] = token.split(".");
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Record<string, unknown>;
}

type PublicQuoteDraftErrorInstance = InstanceType<typeof PublicQuoteDraftError>;

function expectError(code: string, operation: () => unknown): void {
  try {
    operation();
    expect.unreachable(`expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(PublicQuoteDraftError);
    expect((error as PublicQuoteDraftErrorInstance).code).toBe(code);
  }
}

async function withProductionEnv(operation: () => void | Promise<void>): Promise<void> {
  const oldKey = process.env.POUCH_QUOTE_DRAFT_SIGNING_KEY;
  const oldVercel = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "production";
  try {
    await operation();
  } finally {
    process.env.POUCH_QUOTE_DRAFT_SIGNING_KEY = oldKey;
    if (oldVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = oldVercel;
  }
}

afterEach(() => {
  delete process.env.VERCEL_ENV;
});

afterAll(async () => {
  await rm(join(tmpdir(), "does-not-exist-g004"), { force: true });
});

describe("signed guest quote draft contract", () => {
  it("DRAFT-001A issues a canonical v1 payload with exactly the allowed fields", () => {
    const issued = issuePublicQuoteDraft(validInput, {
      now: new Date("2026-01-02T03:04:05.000Z"),
    });
    const payload = payloadFrom(issued.token);

    expect(Object.keys(payload).sort()).toEqual([
      "colorCount",
      "designId",
      "expiresAt",
      "fillAmount",
      "issuedAt",
      "locale",
      "nonce",
      "quantity",
      "sizeKey",
    ]);
    expect(payload).toEqual({
      colorCount: 2,
      designId: "spa",
      expiresAt: 1767326645,
      fillAmount: "1",
      issuedAt: 1767323045,
      locale: "ja",
      nonce: payload.nonce,
      quantity: 50_000,
      sizeKey: "spa-35x80",
    });
    expect(Buffer.from(String(payload.nonce), "base64url")).toHaveLength(16);
    expect(() => verifyPublicQuoteDraft(issued.token, {
      now: new Date("2026-01-02T03:04:05.000Z"),
    })).not.toThrow();
  });

  it("DRAFT-002A rejects unknown fields, invalid design constraints, and unknown tokens", () => {
    expectError("invalid_request", () => issuePublicQuoteDraft({ ...validInput, unknown: true }));
    expectError("invalid_request", () => issuePublicQuoteDraft({ ...validInput, sizeKey: "tube-35x60" }));
    expectError("invalid_request", () => issuePublicQuoteDraft({ ...validInput, fillAmount: "2" }));
    expectError("invalid_request", () => issuePublicQuoteDraft({ ...validInput, quantity: 10_000 }));
    expectError("invalid_token", () => verifyPublicQuoteDraft("unknown-token"));
    expectError("invalid_token", () => verifyPublicQuoteDraft(null));
  });

  it("DRAFT-003A rejects payload tampering and signature tampering", () => {
    const token = issuePublicQuoteDraft(validInput).token;
    const parts = token.split(".");
    const payload = Buffer.from(parts[1], "base64url").toString("utf8").replace('"quantity":50000', '"quantity":10000');
    const tamperedPayload = [parts[0], Buffer.from(payload).toString("base64url"), parts[2]].join(".");
    expect(() => verifyPublicQuoteDraft(tamperedPayload)).toThrow(PublicQuoteDraftError);

    const lastSignatureCharacter = parts[2].at(-1)!;
    const replacement = lastSignatureCharacter === "A" ? "B" : "A";
    const tamperedSignature = [parts[0], parts[1], parts[2].slice(0, -1) + replacement].join(".");
    expect(() => verifyPublicQuoteDraft(tamperedSignature)).toThrow(PublicQuoteDraftError);
    expect(() => verifyPublicQuoteDraft(token)).not.toThrow();
  });

  it("DRAFT-004A enforces a maximum lifetime of 60 minutes and expires deterministically", () => {
    const issuedAt = new Date("2026-01-02T03:04:05.000Z");
    expectError("invalid_lifetime", () => issuePublicQuoteDraft(validInput, {
      lifetimeSeconds: QUOTE_DRAFT_MAX_AGE_SECONDS + 1,
    }));

    const issued = issuePublicQuoteDraft(validInput, { now: issuedAt });
    const atExpiry = new Date(issuedAt.getTime() + QUOTE_DRAFT_MAX_AGE_SECONDS * 1_000);
    expectError("expired_token", () => verifyPublicQuoteDraft(issued.token, { now: atExpiry }));
    expect(() => verifyPublicQuoteDraft(issued.token, {
      now: new Date(atExpiry.getTime() - 1_000),
    })).not.toThrow();
  });

  it("DRAFT-005A rejects encoded tokens over 2 KiB and keeps issued tokens bounded", () => {
    const issued = issuePublicQuoteDraft(validInput);
    expect(Buffer.byteLength(issued.token, "utf8")).toBeLessThanOrEqual(QUOTE_DRAFT_MAX_ENCODED_BYTES);
    expect(Buffer.byteLength(issued.token.split(".")[1]!, "utf8")).toBeLessThanOrEqual(QUOTE_DRAFT_MAX_ENCODED_BYTES);
    expectError("invalid_token", () => verifyPublicQuoteDraft(`public-quote-draft.v1.${"A".repeat(2049)}.B`));
  });

  it("validates the signing key only when production or a non-production key is supplied", async () => {
    await withProductionEnv(() => {
      delete process.env.POUCH_QUOTE_DRAFT_SIGNING_KEY;
      expectError("signing_key_not_configured", () => issuePublicQuoteDraft(validInput));
      process.env.POUCH_QUOTE_DRAFT_SIGNING_KEY = "a".repeat(31);
      expectError("signing_key_too_short", () => issuePublicQuoteDraft(validInput));
      process.env.POUCH_QUOTE_DRAFT_SIGNING_KEY = "b".repeat(32);
      expect(() => issuePublicQuoteDraft(validInput)).not.toThrow();
    });

    process.env.POUCH_QUOTE_DRAFT_SIGNING_KEY = "a".repeat(31);
    expectError("signing_key_too_short", () => issuePublicQuoteDraft(validInput));
    delete process.env.POUCH_QUOTE_DRAFT_SIGNING_KEY;
    expect(() => issuePublicQuoteDraft(validInput)).not.toThrow();
    process.env.POUCH_QUOTE_DRAFT_SIGNING_KEY = "a".repeat(64);
  });

  it("binds verification to the configured key", () => {
    const issued = issuePublicQuoteDraft(validInput, {
      env: { NODE_ENV: "test", POUCH_QUOTE_DRAFT_SIGNING_KEY: "c".repeat(32) },
    });
    expectError("invalid_token", () => verifyPublicQuoteDraft(issued.token, {
      env: { NODE_ENV: "test", POUCH_QUOTE_DRAFT_SIGNING_KEY: "d".repeat(32) },
    }));
    expect(() => verifyPublicQuoteDraft(issued.token, {
      env: { NODE_ENV: "test", POUCH_QUOTE_DRAFT_SIGNING_KEY: "c".repeat(32) },
    })).not.toThrow();
  });

  it("keeps the detached HMAC over the exact version and canonical encoding", () => {
    const issued = issuePublicQuoteDraft(validInput);
    const [, , encodedPayload, signature] = issued.token.split(".");
    const expected = createHmac("sha256", Buffer.from("a".repeat(64)))
      .update(`public-quote-draft.v1.${encodedPayload}`)
      .digest("base64url");
    expect(signature).toBe(expected);
    const canonical = JSON.stringify({
      colorCount: 2,
      designId: "spa",
      expiresAt: issued.payload.expiresAt,
      fillAmount: "1",
      issuedAt: issued.payload.issuedAt,
      locale: "ja",
      nonce: issued.payload.nonce,
      quantity: 50_000,
      sizeKey: "spa-35x80",
    });
    expect(Buffer.from(encodedPayload!, "base64url").toString("utf8")).toBe(canonical);
  });
});
