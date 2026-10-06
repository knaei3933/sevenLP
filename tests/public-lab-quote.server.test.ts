import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { calculatePouchCost } from "@/lib/calculation";
import { defaultGravureRollParameters } from "@/lib/gravure-roll";
import { validatePublicLabRequest, type PublicLabQuotationRequest } from "@/lib/public-lab";
import {
  createPublicLabQuote,
  type PublicLabQuote,
} from "@/lib/public-lab-quote.server";
import type { PrintCandidate, PrintCandidateRoute } from "@/lib/print-recommendation";
import type { CostParameters, PouchSpec } from "@/lib/types";
import { defaultParameters } from "@/lib/constants";

const FIXED_NOW = new Date("2026-04-01T09:00:00.000Z");
const clock = { now: () => FIXED_NOW };

const baseRequest: PublicLabQuotationRequest = {
  requestType: "quotation",
  company: "株式会社ラボ",
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

function validRequest(input: Partial<PublicLabQuotationRequest>): PublicLabQuotationRequest {
  const result = validatePublicLabRequest({ ...baseRequest, ...input });
  if (!result.success) throw new Error(`invalid test request: ${JSON.stringify(result.errors)}`);
  if (result.data.requestType !== "quotation") throw new Error("unexpected non-quotation");
  return result.data;
}

function publicSpec(request: PublicLabQuotationRequest, sizeLanes = 4): PouchSpec {
  return {
    sizeKey: request.sizeKey,
    fillMlPerChamber: request.fillMlPerChamber.toString(),
    connectedChambers: request.connectedChambers,
    fillingMethod: request.fillingMethod,
    fillingLanes: sizeLanes,
    isCustom: false,
    colorCount: request.colorCount,
    bulkUnitPrice: "0",
    skuCount: 1,
    skuQuantities: [request.quantity.toString()],
  };
}

function firstRecommendedRouteCandidate(
  request: PublicLabQuotationRequest,
  route: PrintCandidateRoute,
): PrintCandidate {
  const recommendation = calculatePouchCost({
    spec: publicSpec(request),
    quantity: request.quantity.toString(),
    printingMethod: request.printingMethod,
    parameters: defaultParameters satisfies CostParameters,
    gravureParameters: defaultGravureRollParameters(),
    targetMargins: [request.printingMethod === "digital" ? "0.4" : "0.3"],
    recommendationMode: true,
  });
  return (recommendation.recommendationCandidates ?? [])
    .filter((candidate) => candidate.route === route && candidate.isFulfilling && candidate.isPractical)[0];
}

function collectValues(value: unknown): { keys: string[]; strings: string[] } {
  const keys: string[] = [];
  const strings: string[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") {
      if (typeof node === "string") strings.push(node);
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      keys.push(key);
      visit(child);
    }
  };
  visit(value);
  return { keys, strings };
}

function assertCustomerSafeQuote(quote: PublicLabQuote, request: PublicLabQuotationRequest): void {
  expect(Object.keys(quote).sort()).toEqual([
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
  ]);

  const { keys, strings } = collectValues(quote);
  const prohibitedKeyPatterns = [
    /candidate/i,
    /checklist/i,
    /commission/i,
    /cost/i,
    /margin/i,
    /machine/i,
    /labor/i,
    /profit/i,
    /purchase/i,
    /audit/i,
    /supplier/i,
    /source/i,
    /bulkUnit/i,
    /targetMargin/i,
    /recommendation/i,
    /selectedCandidate/i,
  ];
  expect(keys.filter((key => prohibitedKeyPatterns.some((pattern) => pattern.test(key))))).toEqual([]);
  expect(strings).not.toContain(request.company);
  expect(strings).not.toContain(request.contactName);
  expect(strings).not.toContain(request.email);
  expect(strings).not.toContain(request.phone);
  expect(strings.join("\n")).not.toContain("韓国輸入");
  expect(strings.join("\n")).not.toContain("国内調達");
}

describe("public lab server-only quotation adapter", () => {
  it("produces deterministic digital and gravure customer-safe golden flows", () => {
    const digitalRequest = validRequest({ printingMethod: "digital" });
    const gravureRequest = validRequest({
      printingMethod: "gravure",
      quantity: 133_000,
    });

    const digital = createPublicLabQuote(digitalRequest, clock);
    const digitalRepeat = createPublicLabQuote(digitalRequest, clock);
    const gravure = createPublicLabQuote(gravureRequest, clock);
    const gravureRepeat = createPublicLabQuote(gravureRequest, clock);

    expect(digital.quote.requestedQuantity).toBe("20000");
    expect(digital.quote.billedQuantity).toBe("20000");
    expect(digital.quote.serviceRouteLabel).toBe("デジタル印刷");
    expect(digital.quote.subtotal).toBe(digitalRepeat.quote.subtotal);
    expect(digital.quote.reference).toBe(digitalRepeat.quote.reference);

    const digitalRoute = firstRecommendedRouteCandidate(digitalRequest, "D");
    expect(digitalRoute.route).toBe("D");
    expect(digital.quote.billedQuantity).toBe(digitalRoute.adjustedQuantity);
    expect(digital.quote.pricePerPiece).toBe("25.92");
    expect(digital.quote.subtotal).toBe("518400");
    expect(digital.quote.tax).toBe("51840");
    expect(digital.quote.grandTotal).toBe("570240");

    expect(gravure.quote.requestedQuantity).toBe("133000");
    expect(gravure.quote.billedQuantity).toBe("133000");
    expect(gravure.quote.serviceRouteLabel).toBe("グラビア印刷");
    expect(gravure.quote.subtotal).toBe(gravureRepeat.quote.subtotal);
    expect(gravure.quote.reference).toBe(gravureRepeat.quote.reference);
    expect(gravure.quote.grandTotal).not.toBe(digital.quote.grandTotal);

    const gravureRoute = firstRecommendedRouteCandidate(gravureRequest, "K");
    expect(gravureRoute.route).toBe("K");
    expect(gravure.quote.billedQuantity).toBe(gravureRoute.adjustedQuantity);
    expect(gravure.quote.pricePerPiece).toBe("8.872015037593984962406015037593984962406");
    expect(gravure.quote.subtotal).toBe("1179978");
    expect(gravure.quote.tax).toBe("117998");
    expect(gravure.quote.grandTotal).toBe("1297976");

    for (const calculation of [digital, gravure]) {
      assertCustomerSafeQuote(calculation.quote, digitalRequest);
      expect(Number(calculation.quote.pricePerPiece)).toBeGreaterThan(0);
      expect(Number(calculation.quote.subtotal)).toBeGreaterThan(0);
      expect(Number(calculation.quote.tax)).toBe(Math.round(Number(calculation.quote.subtotal) * 0.1));
      expect(Number(calculation.quote.grandTotal)).toBe(
        Number(calculation.quote.subtotal) + Number(calculation.quote.tax),
      );
      expect(calculation.internal.calculationVersion).toBe("2026-09.1");
      expect(calculation.internal.resultHash).toMatch(/^[a-f0-9]{64}$/);
      expect(calculation.internal.canonicalRequest).toEqual(
        calculation === digital ? digitalRequest : gravureRequest,
      );
    }
  });

  it("bills the recommendation-adjusted quantity when the selected practical route has surplus", () => {
    const request = validRequest({
      printingMethod: "digital",
      quantity: 55_000,
    });
    const result = createPublicLabQuote(request, clock);
    const selected = firstRecommendedRouteCandidate(request, "D");
    expect(selected.isFulfilling).toBe(true);
    expect(selected.isPractical).toBe(true);
    expect(result.quote.requestedQuantity).toBe("55000");
    expect(result.quote.billedQuantity).toBe(selected.adjustedQuantity);
    expect(Number(result.quote.billedQuantity)).toBeGreaterThanOrEqual(55_000);
  });

  it("returns exactly the public DTO allowlist and keeps all money fields as strings", () => {
    const result = createPublicLabQuote(validRequest({}), clock);
    const quote = result.quote;
    expect(quote.currency).toBe("JPY");
    for (const field of ["pricePerPiece", "subtotal", "tax", "grandTotal"] as const) {
      expect(quote[field]).toBeTypeOf("string");
      expect(quote[field]).toMatch(/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/);
    }
    expect(quote.requestedQuantity).toBeTypeOf("string");
    expect(quote.billedQuantity).toBeTypeOf("string");
    expect(JSON.stringify(quote)).not.toContain("Decimal");
    assertCustomerSafeQuote(quote, validRequest({}));
  });

  it("recursively excludes prohibited internals and request payload fields", () => {
    const request = validRequest({ message: "内部資料に載せたい連絡です" });
    const { quote } = createPublicLabQuote(request, clock);
    const { keys, strings } = collectValues(quote);
    for (const key of [
      "calculationVersion",
      "resultHash",
      "inputJsonSha256",
      "canonicalRequest",
      "company",
      "contactName",
      "email",
      "phone",
      "message",
      "consentVersion",
      "consentAccepted",
      "bulkSupplied",
      "parameters",
      "gravureParameters",
      "targetMargins",
      "filmOrders",
      "gravureRoll",
      "sasche",
    ]) {
      expect(keys).not.toContain(key);
    }
    const joined = strings.join("\n");
    expect(joined).not.toContain("内部資料に載せたい連絡です");
    expect(joined).not.toContain("public-lab-privacy-v1");
    expect(joined).not.toContain("0.4");
    expect(joined).not.toContain("0.3");
  });

  it("uses injected time for creation, deterministic references, and 30-day validity", () => {
    const first = createPublicLabQuote(validRequest({}), clock);
    const later = createPublicLabQuote(validRequest({}), {
      now: () => new Date("2026-04-02T09:00:00.000Z"),
    });
    expect(first.quote.createdAt).toBe("2026-04-01T09:00:00.000Z");
    expect(first.quote.validUntil).toBe("2026-05-01T09:00:00.000Z");
    expect(first.quote.reference).toMatch(/^PL-20260401-[0-9A-F]{16}$/);
    expect(later.quote.createdAt).toBe("2026-04-02T09:00:00.000Z");
    expect(later.quote.validUntil).toBe("2026-05-02T09:00:00.000Z");
    expect(first.quote.reference).not.toBe(later.quote.reference);
  });

  it("propagates calculation failures as bounded public errors without internals", () => {
    const brokenClock = {
      now: () => new Date("invalid") as Date,
    };
    try {
      createPublicLabQuote(validRequest({}), brokenClock);
      throw new Error("expected createPublicLabQuote to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).name).toBe("PublicLabQuoteError");
      expect((error as Error).message).toBe("invalid_clock");
      expect((error as Error).message).not.toContain("cost");
      expect((error as Error).message).not.toContain("candidate");
      expect((error as Error).message).not.toContain("margin");
    }
  });

  it("keeps public/shared lab modules from importing the server adapter", () => {
    for (const path of ["src/lib/public-lab.ts", "src/lib/public-lab-options.ts"]) {
      const source = readFileSync(path, "utf8");
      expect(source).not.toContain("public-lab-quote.server");
    }
  });
});
