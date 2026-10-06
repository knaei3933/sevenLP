import { NextResponse } from "next/server";

import type { PublicLabQuote } from "@/lib/public-lab-quote.server";
import { createPublicLabQuote } from "@/lib/public-lab-quote.server";
import {
  savePublicLead,
  savePublicQuotation,
} from "@/lib/public-lead-store";
import { validatePublicLabRequest } from "@/lib/public-lab";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32 * 1024;

type SafeConfirmation = {
  reference: string;
  requestType: "consultation" | "sample";
  message: string;
};

// Honeypot and same-origin checks reduce accidental submissions, but neither is
// production bot protection or a rate-limit control.
function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function methodNotAllowed(_request?: Request): NextResponse {
  const response = json({ error: "method_not_allowed" }, 405);
  response.headers.set("Allow", "POST");
  return response;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isJsonRequest(request)) return json({ error: "unsupported_media_type" }, 415);
  if (!isSameOrigin(request)) return json({ error: "invalid_origin" }, 403);

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > MAX_BODY_BYTES) {
    return json({ error: "request_too_large" }, 413);
  }

  const requestBody = await readRequestBody(request);
  if (requestBody === undefined) return json({ error: "invalid_json" }, 400);
  if (requestBody.byteLength > MAX_BODY_BYTES) {
    return json({ error: "request_too_large" }, 413);
  }

  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder().decode(requestBody));
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (hasNonEmptyHoneypot(input)) return json({ status: "accepted" }, 202);

  const result = validatePublicLabRequest(input);
  if (!result.success) return json({ errors: result.errors }, 400);

  const startedAtMs = Date.now();
  const { requestType } = result.data;
  try {
    if (requestType === "quotation") {
      const calculation = createPublicLabQuote(result.data);
      const persisted = await savePublicQuotation({
        request: result.data,
        quote: calculation.quote,
        calculationVersion: calculation.internal.calculationVersion,
        resultHash: calculation.internal.resultHash,
      });
      return json({ quote: persisted.quote satisfies PublicLabQuote }, 201);
    }

    const saved = await savePublicLead(result.data);
    return json({
      reference: saved.reference,
      requestType,
      message: "受け付けました。担当からご連絡いたします。",
    } satisfies SafeConfirmation, 201);
  } catch {
    // Payload-free operational evidence only. Never log contact fields, the
    // request body, quote payload, database text, or an internal error object.
    console.error(JSON.stringify({
      event: "public_lab_request_failed",
      outcome: "error",
      requestType,
      durationMs: Date.now() - startedAtMs,
    }));
    if (result.data.requestType === "quotation") {
      return json({ error: "quotation_unavailable" }, 503);
    }
    return json({ error: "submission_unavailable" }, 503);
  }
}

export const GET = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;

function isJsonRequest(request: Request): boolean {
  const mediaType = request.headers.get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  return mediaType === "application/json";
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;

  try {
    const originUrl = new URL(origin);
    const sameHost = originUrl.host === host;
    const secureOrLocalProtocol = ["http:", "https:"].includes(originUrl.protocol);
    return sameHost && secureOrLocalProtocol;
  } catch {
    return false;
  }
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

function hasNonEmptyHoneypot(input: unknown): boolean {
  if (typeof input !== "object" || input === null) return false;
  const candidate = input as Record<string, unknown>;
  const value = candidate.honeypot;
  return value !== undefined && value !== null && value !== "";
}
