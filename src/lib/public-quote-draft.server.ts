import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { publicLabSizeOptions, type PublicLabSizeKey } from "./public-lab-options";
import { getPublicLabSizeRule } from "./public-lab-rules";
import {
  acceptsPublicQuoteDraftFill,
  getPublicQuoteDraftDesign,
  isPublicQuoteDraftLocale,
  publicQuoteDraftLocales,
} from "./public-quote-draft-options";

export class PublicQuoteDraftError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "PublicQuoteDraftError";
    this.code = code;
  }
}

export const QUOTE_DRAFT_TOKEN_PREFIX = "public-quote-draft.v1";
export const QUOTE_DRAFT_MAX_AGE_SECONDS = 60 * 60;
export const QUOTE_DRAFT_MAX_ENCODED_BYTES = 2 * 1024;
const QUOTE_DRAFT_TOKEN_FORMAT = /^public-quote-draft\.v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/;
const NONCE_BYTES = 16;
const FILL_AMOUNT_PATTERN = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;
export const QUOTE_DRAFT_MAX_QUANTITY = 5_000_000;
const CANONICAL_KEYS = [
  "colorCount",
  "designId",
  "expiresAt",
  "fillAmount",
  "issuedAt",
  "locale",
  "nonce",
  "quantity",
  "sizeKey",
] as const;

export type PublicQuoteDraftInput = {
  designId: string;
  sizeKey: string;
  fillAmount: string;
  colorCount: number;
  quantity: number;
  locale: string;
};

export type PublicQuoteDraftPayload = {
  colorCount: number;
  designId: string;
  expiresAt: number;
  fillAmount: string;
  issuedAt: number;
  locale: (typeof publicQuoteDraftLocales)[number];
  nonce: string;
  quantity: number;
  sizeKey: string;
};

export type IssuedQuoteDraft = {
  token: string;
  expiresAt: number;
  payload: PublicQuoteDraftPayload;
};

type RequestEnv = NodeJS.ProcessEnv;

export function resolveQuoteDraftSigningKey(
  env: RequestEnv = process.env,
): Buffer {
  const configured = env.POUCH_QUOTE_DRAFT_SIGNING_KEY?.trim();
  if (configured !== undefined && configured.length > 0) {
    const key = Buffer.from(configured, "utf8");
    if (key.byteLength < 32) {
      throw new PublicQuoteDraftError("signing_key_too_short");
    }
    return key;
  }

  if (isProductionEnvironment(env)) {
    throw new PublicQuoteDraftError("signing_key_not_configured");
  }

  // This non-production fallback exists only for local/test startup. It is not
  // a credential and production cannot reach this branch.
  return Buffer.from("shapepouch-local-only-quote-draft-contract-key", "utf8");
}

export function issuePublicQuoteDraft(
  input: unknown,
  {
    now = new Date(),
    lifetimeSeconds = QUOTE_DRAFT_MAX_AGE_SECONDS,
    env = process.env,
  }: {
    now?: Date;
    lifetimeSeconds?: number;
    env?: RequestEnv;
  } = {},
): IssuedQuoteDraft {
  const payload = createValidatedPayload(input, now, lifetimeSeconds);
  const token = signPayload(payload, env);
  return { token, expiresAt: payload.expiresAt, payload };
}

export function verifyPublicQuoteDraft(
  token: unknown,
  {
    now = new Date(),
    env = process.env,
  }: {
    now?: Date;
    env?: RequestEnv;
  } = {},
): PublicQuoteDraftPayload {
  if (typeof token !== "string" || Buffer.byteLength(token, "utf8") > QUOTE_DRAFT_MAX_ENCODED_BYTES) {
    throw new PublicQuoteDraftError("invalid_token");
  }

  const match = QUOTE_DRAFT_TOKEN_FORMAT.exec(token);
  if (!match) throw new PublicQuoteDraftError("invalid_token");
  const [, encodedPayload, encodedSignature] = match;
  const expectedSignature = signatureFor(encodedPayload, env);
  const actualSignature = decodeBase64Url(encodedSignature);
  if (
    actualSignature.byteLength !== expectedSignature.byteLength
    || !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    throw new PublicQuoteDraftError("invalid_token");
  }

  let decodedPayload: unknown;
  try {
    decodedPayload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload)));
  } catch {
    throw new PublicQuoteDraftError("invalid_token");
  }
  if (!isPlainObject(decodedPayload)) throw new PublicQuoteDraftError("invalid_token");
  if (!hasExactKeys(decodedPayload)) throw new PublicQuoteDraftError("invalid_token");

  // Recanonicalization rejects property reordering, duplicate-key JSON chosen
  // by the parser, numeric aliases, and whitespace variants.
  let canonical: string;
  try {
    canonical = createCanonicalJson(decodedPayload);
  } catch {
    throw new PublicQuoteDraftError("invalid_token");
  }
  if (encodeBase64Url(Buffer.from(canonical, "utf8")) !== encodedPayload) {
    throw new PublicQuoteDraftError("invalid_token");
  }

  const payload = decodedPayload as PublicQuoteDraftPayload;
  validatePayloadShape(payload);
  const currentTime = Math.floor(now.getTime() / 1_000);
  if (!Number.isInteger(payload.expiresAt) || payload.expiresAt <= currentTime) {
    throw new PublicQuoteDraftError("expired_token");
  }

  return structuredClone(payload);
}

function createValidatedPayload(
  input: unknown,
  now: Date,
  lifetimeSeconds: number,
): PublicQuoteDraftPayload {
  if (!isPlainObject(input)) throw new PublicQuoteDraftError("invalid_request");
  const candidate = input as Record<string, unknown>;
  const requiredKeys = [
    "colorCount",
    "designId",
    "fillAmount",
    "locale",
    "quantity",
    "sizeKey",
  ];
  if (!requiredKeys.every((key) => key in candidate) || Object.keys(candidate).length !== requiredKeys.length) {
    throw new PublicQuoteDraftError("invalid_request");
  }

  const designId = candidate.designId;
  const sizeKey = candidate.sizeKey;
  const locale = candidate.locale;
  if (typeof designId !== "string" || typeof sizeKey !== "string" || typeof locale !== "string") {
    throw new PublicQuoteDraftError("invalid_request");
  }
  const design = getPublicQuoteDraftDesign(designId);
  const size = publicLabSizeOptions.find((option) => option.key === sizeKey);
  if (!design || !size || !isKnownSizeKey(sizeKey) || !isPublicQuoteDraftLocale(locale)) {
    throw new PublicQuoteDraftError("invalid_request");
  }
  if (!design.sizeKeys.includes(sizeKey)) {
    throw new PublicQuoteDraftError("invalid_request");
  }

  const fillAmount = canonicalizeAmount(candidate.fillAmount);
  const rule = getPublicLabSizeRule(sizeKey);
  if (
    fillAmount === undefined
    || !acceptsPublicQuoteDraftFill(designId, sizeKey, fillAmount)
  ) {
    throw new PublicQuoteDraftError("invalid_request");
  }

  const colorCount = candidate.colorCount;
  const quantity = candidate.quantity;
  if (!isInteger(colorCount) || colorCount < 1 || colorCount > 10) {
    throw new PublicQuoteDraftError("invalid_request");
  }
  if (!isInteger(quantity) || quantity < rule.minimumQuantity || quantity > QUOTE_DRAFT_MAX_QUANTITY) {
    throw new PublicQuoteDraftError("invalid_request");
  }

  if (!isInteger(lifetimeSeconds) || lifetimeSeconds < 1 || lifetimeSeconds > QUOTE_DRAFT_MAX_AGE_SECONDS) {
    throw new PublicQuoteDraftError("invalid_lifetime");
  }
  const issuedAt = Math.floor(now.getTime() / 1_000);
  const expiresAt = issuedAt + lifetimeSeconds;
  const nonce = encodeBase64Url(randomBytes(NONCE_BYTES));

  return {
    colorCount,
    designId,
    expiresAt,
    fillAmount,
    issuedAt,
    locale,
    nonce,
    quantity,
    sizeKey,
  };
}

function validatePayloadShape(payload: Record<string, unknown>): void {
  const designId = payload.designId;
  const sizeKey = payload.sizeKey;
  const locale = payload.locale;
  const fillAmount = payload.fillAmount;
  if (
    typeof designId !== "string"
    || typeof sizeKey !== "string"
    || typeof locale !== "string"
    || typeof fillAmount !== "string"
    || !isInteger(payload.issuedAt)
    || !isInteger(payload.expiresAt)
    || !isInteger(payload.colorCount)
    || !isInteger(payload.quantity)
    || typeof payload.nonce !== "string"
  ) {
    throw new PublicQuoteDraftError("invalid_token");
  }

  const design = getPublicQuoteDraftDesign(designId);
  const size = publicLabSizeOptions.find((option) => option.key === sizeKey);
  const rule = getPublicLabSizeRule(sizeKey);
  const nonce = decodeBase64Url(payload.nonce);
  if (
    !design
    || !size
    || !isKnownSizeKey(sizeKey)
    || !design.sizeKeys.includes(sizeKey)
    || !isPublicQuoteDraftLocale(locale)
    || nonce.byteLength !== NONCE_BYTES
    || payload.expiresAt - payload.issuedAt > QUOTE_DRAFT_MAX_AGE_SECONDS
    || payload.expiresAt - payload.issuedAt < 1
    || payload.colorCount < 1
    || payload.colorCount > 10
    || payload.quantity < rule.minimumQuantity
    || payload.quantity > QUOTE_DRAFT_MAX_QUANTITY
    || fillAmount !== canonicalizeAmount(fillAmount)
    || !acceptsPublicQuoteDraftFill(designId, sizeKey, fillAmount)
  ) {
    throw new PublicQuoteDraftError("invalid_token");
  }
}

function createCanonicalJson(payload: Record<string, unknown>): string {
  if (!hasExactKeys(payload)) throw new PublicQuoteDraftError("invalid_token");
  return JSON.stringify({
    colorCount: payload.colorCount,
    designId: payload.designId,
    expiresAt: payload.expiresAt,
    fillAmount: payload.fillAmount,
    issuedAt: payload.issuedAt,
    locale: payload.locale,
    nonce: payload.nonce,
    quantity: payload.quantity,
    sizeKey: payload.sizeKey,
  });
}

function hasExactKeys(payload: Record<string, unknown>): boolean {
  const keys = Object.keys(payload).sort();
  return keys.length === CANONICAL_KEYS.length
    && keys.every((key, index) => key === CANONICAL_KEYS[index]);
}

function signatureFor(encodedPayload: string, env: RequestEnv): Buffer {
  return createHmac("sha256", resolveQuoteDraftSigningKey(env))
    .update(`${QUOTE_DRAFT_TOKEN_PREFIX}.${encodedPayload}`)
    .digest();
}

function signPayload(payload: PublicQuoteDraftPayload, env: RequestEnv): string {
  const encodedPayload = encodeBase64Url(
    Buffer.from(createCanonicalJson(payload), "utf8"),
  );
  if (Buffer.byteLength(encodedPayload, "utf8") > QUOTE_DRAFT_MAX_ENCODED_BYTES) {
    throw new PublicQuoteDraftError("token_too_large");
  }
  const signature = encodeBase64Url(signatureFor(encodedPayload, env));
  const token = `${QUOTE_DRAFT_TOKEN_PREFIX}.${encodedPayload}.${signature}`;
  if (Buffer.byteLength(token, "utf8") > QUOTE_DRAFT_MAX_ENCODED_BYTES) {
    throw new PublicQuoteDraftError("token_too_large");
  }
  return token;
}

function canonicalizeAmount(value: unknown): string | undefined {
  if (typeof value !== "string" || !FILL_AMOUNT_PATTERN.test(value)) return undefined;
  const [whole, fraction = ""] = value.split(".");
  const normalizedWhole = whole.replace(/^0+(?=[0-9])/, "");
  const normalizedFraction = fraction.replace(/0+$/, "");
  return normalizedFraction.length === 0
    ? normalizedWhole
    : `${normalizedWhole}.${normalizedFraction}`;
}

function decodeBase64Url(value: string): Buffer {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new PublicQuoteDraftError("invalid_token");
  }
  const decoded = Buffer.from(value, "base64url");
  if (decoded.length === 0 && value.length > 0) {
    throw new PublicQuoteDraftError("invalid_token");
  }
  return decoded;
}

function encodeBase64Url(value: Buffer): string {
  return value.toString("base64url");
}

function isKnownSizeKey(value: string): value is PublicLabSizeKey {
  return publicLabSizeOptions.some((option) => option.key === value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isProductionEnvironment(env: RequestEnv): boolean {
  return env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
}
