import { NextResponse } from "next/server";

import {
  consumePublicQuoteDraftRateLimit,
} from "@/lib/public-lead-store";
import {
  issuePublicQuoteDraft,
  PublicQuoteDraftError,
} from "@/lib/public-quote-draft.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2 * 1024;
const ALLOWED_FIELDS = new Set([
  "colorCount",
  "designId",
  "fillAmount",
  "locale",
  "quantity",
  "sizeKey",
]);
const DEFAULT_COMPLETION_URL = "http://127.0.0.1:4400/portal/quotes/new";

type SafeFieldErrors = {
  errors: { field?: string; code: string }[];
};

function json(data: unknown, status = 200, headers: HeadersInit = {}): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function methodNotAllowed(): NextResponse {
  const response = json({ error: "method_not_allowed" }, 405);
  response.headers.set("Allow", "POST");
  return response;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isFormRequest(request)) return json({ error: "unsupported_media_type" }, 415);
  if (!isAllowedOrigin(request)) return json({ error: "invalid_origin" }, 403);

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > MAX_BODY_BYTES) {
    return json({ error: "request_too_large" }, 413);
  }

  const requestBody = await readRequestBody(request);
  if (requestBody === undefined) return json({ error: "invalid_request" }, 400);
  if (requestBody.byteLength > MAX_BODY_BYTES) {
    return json({ error: "request_too_large" }, 413);
  }

  // Rate limiting occurs before payload parsing. The route passes only the
  // transport client identity; the store hashes it before any SQLite access.
  const clientIdentity = clientBucketIdentity(request);
  let rateLimit;
  try {
    rateLimit = await consumePublicQuoteDraftRateLimit(clientIdentity);
  } catch {
    return json({ error: "quote_draft_unavailable" }, 503);
  }
  if (!rateLimit.allowed) {
    return json(
      { error: "rate_limited" },
      429,
      { "Retry-After": String(rateLimit.retryAfterSeconds ?? 3600) },
    );
  }

  let fields: URLSearchParams;
  try {
    fields = new URLSearchParams(new TextDecoder().decode(requestBody));
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const parsed = parseFields(fields);
  if (!parsed.success) return json({ errors: parsed.errors } satisfies SafeFieldErrors, 400);

  try {
    const draft = issuePublicQuoteDraft(parsed.data);
    const destination = resolveQuoteDraftCompletionUrl(process.env);
    destination.hash = `quoteDraft=${encodeURIComponent(draft.token)}`;
    if (destination.search !== "") throw new PublicQuoteDraftError("invalid_request");
    const response = NextResponse.redirect(destination.toString(), 303);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof PublicQuoteDraftError && error.code === "invalid_request") {
      return json({ error: "invalid_request" }, 400);
    }
    return json({ error: "quote_draft_unavailable" }, 503);
  }
}

export const GET = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;

function isFormRequest(request: Request): boolean {
  const mediaType = request.headers.get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    ?.toLowerCase();
  return mediaType === "application/x-www-form-urlencoded";
}

function isAllowedOrigin(request: Request): boolean {
  const rawOrigin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!rawOrigin || !host) return false;

  try {
    const origin = new URL(rawOrigin);
    const allowlist = resolveAllowedOrigins(process.env);
    if (
      origin.protocol !== "https:" && origin.protocol !== "http:"
      || origin.username !== ""
      || origin.password !== ""
      || origin.pathname !== "/"
      || origin.search !== ""
      || origin.hash !== ""
      || !allowlist.has(origin.toString())
      || origin.host !== host
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function resolveAllowedOrigins(env: NodeJS.ProcessEnv): Set<string> {
  const configured = env.POUCH_QUOTE_DRAFT_ALLOWED_ORIGINS ?? "";
  if (configured.trim() === "") {
    if (isProductionEnvironment(env)) {
      throw new PublicQuoteDraftError("origin_allowlist_not_configured");
    }
    return new Set([
      "http://localhost/",
      "http://localhost:3000/",
      "http://127.0.0.1/",
      "http://127.0.0.1:3000/",
    ]);
  }

  const origins = new Set<string>();
  for (const entry of configured.split(",")) {
    const value = entry.trim();
    if (value === "") continue;
    const origin = new URL(value);
    if (
      (origin.protocol !== "https:" && origin.protocol !== "http:")
      || origin.username !== ""
      || origin.password !== ""
      || origin.pathname !== "/"
      || origin.search !== ""
      || origin.hash !== ""
    ) {
      throw new PublicQuoteDraftError("invalid_origin_allowlist");
    }
    origins.add(origin.toString());
  }
  if (isProductionEnvironment(env) && origins.size === 0) {
    throw new PublicQuoteDraftError("origin_allowlist_not_configured");
  }
  return origins;
}

function resolveQuoteDraftCompletionUrl(env: NodeJS.ProcessEnv): URL {
  const destination = new URL(env.POUCH_PORTAL_QUOTE_COMPLETION_URL || DEFAULT_COMPLETION_URL);
  if (
    destination.protocol !== "https:" && destination.protocol !== "http:"
    || destination.username !== ""
    || destination.password !== ""
    || destination.pathname === ""
    || destination.search !== ""
    || destination.hash !== ""
  ) {
    throw new PublicQuoteDraftError("invalid_completion_url");
  }
  destination.hash = "";
  return destination;
}

function clientBucketIdentity(request: Request, env: NodeJS.ProcessEnv = process.env): string {
  const trustedProxy = env.POUCH_QUOTE_DRAFT_TRUSTED_PROXY?.trim().toLowerCase();
  if (trustedProxy !== "true" && trustedProxy !== "1") return "direct-peer";
  return request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

function parseFields(
  fields: URLSearchParams,
): { success: true; data: Record<string, string | number> } | { success: false; errors: SafeFieldErrors["errors"] } {
  const names = [...fields.keys()];
  if (
    names.length !== ALLOWED_FIELDS.size
    || names.some((name) => !ALLOWED_FIELDS.has(name))
    || names.some((name) => fields.getAll(name).length !== 1)
  ) {
    return {
      success: false,
      errors: [{ field: names.find((name) => !ALLOWED_FIELDS.has(name)), code: "unknownField" }],
    };
  }

  const designId = required(fields, "designId");
  const sizeKey = required(fields, "sizeKey");
  const fillAmount = required(fields, "fillAmount");
  const locale = required(fields, "locale");
  const colorCount = requiredInteger(fields, "colorCount");
  const quantity = requiredInteger(fields, "quantity");
  if (
    designId === undefined || sizeKey === undefined || fillAmount === undefined
    || locale === undefined || colorCount === undefined || quantity === undefined
  ) {
    return { success: false, errors: [{ code: "invalidValue" }] };
  }

  return {
    success: true,
    data: { colorCount, designId, fillAmount, locale, quantity, sizeKey },
  };
}

function required(fields: URLSearchParams, name: string): string | undefined {
  const value = fields.get(name)?.trim();
  return value === null || value === "" ? undefined : value;
}

function requiredInteger(fields: URLSearchParams, name: string): number | undefined {
  const value = required(fields, name);
  if (value === undefined || !/^[0-9]+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

async function readRequestBody(request: Request): Promise<Uint8Array | undefined> {
  const reader = request.body?.getReader();
  if (!reader) return undefined;

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return new Uint8Array(MAX_BODY_BYTES + 1);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function isProductionEnvironment(env: NodeJS.ProcessEnv): boolean {
  return env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
}
