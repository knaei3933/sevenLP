import { createHash } from "node:crypto";

import {
  calculatePouchCost,
  calculateSelectedCandidateCore,
  type CalculationInput,
  type CostResult,
} from "./calculation";
import { CALCULATION_VERSION, defaultParameters, sizeMaster } from "./constants";
import { defaultGravureRollParameters } from "./gravure-roll";
import { QuotationValidationError } from "./digital-film";
import type { PublicLabQuotationRequest } from "./public-lab";
import { calculateAutomaticQuotation } from "./quotation-pricing";
import type { PrintCandidate } from "./print-recommendation";
import type { PouchSpec } from "./types";

// This module intentionally imports calculation internals and Node APIs.
// Public/shared/client modules must not import it.

const VALIDITY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const TAX_RATE_PERCENT = "10";
const PUBLIC_TARGET_MARGINS = {
  digital: "0.4",
  gravure: "0.3",
} as const;

const PUBLIC_MONEY_FIELDS = [
  "pricePerPiece",
  "subtotal",
  "tax",
  "grandTotal",
] as const;

export interface PublicLabQuote {
  reference: string;
  requestType: PublicLabQuotationRequest["requestType"];
  createdAt: string;
  validUntil: string;
  requestSummary: string;
  serviceRouteLabel: string;
  requestedQuantity: string;
  billedQuantity: string;
  currency: "JPY";
  pricePerPiece: string;
  subtotal: string;
  tax: string;
  grandTotal: string;
  exclusions: string[];
  deliveryNote: string;
  consultationCta: string;
  sampleCta: string;
}

export interface PublicLabQuoteInternalMetadata {
  canonicalRequest: PublicLabQuotationRequest;
  calculationVersion: string;
  resultHash: string;
}

export interface PublicLabQuoteCalculation {
  quote: PublicLabQuote;
  internal: PublicLabQuoteInternalMetadata;
}

export interface PublicLabQuoteOptions {
  now?: () => Date;
}

export class PublicLabQuoteError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "PublicLabQuoteError";
    this.code = code;
  }
}

export function createPublicLabQuote(
  request: PublicLabQuotationRequest,
  options: PublicLabQuoteOptions = {},
): PublicLabQuoteCalculation {
  try {
    const now = options.now?.() ?? new Date();
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
      throw new PublicLabQuoteError("invalid_clock");
    }

    const targetMargin = PUBLIC_TARGET_MARGINS[request.printingMethod];
    const recommendationInput = createInternalCalculationInput(request, targetMargin);
    const recommendation = calculatePouchCost({
      ...recommendationInput,
      recommendationMode: true,
    });
    const selectedCandidate = selectRecommendedRouteCandidate(
      recommendation.recommendationCandidates ?? [],
      request.printingMethod,
    );
    const result = calculateSelectedCandidateCore(selectedCandidate, recommendationInput);
    const totals = calculateAutomaticQuotation(result, targetMargin, TAX_RATE_PERCENT);
    if (!totals) throw new PublicLabQuoteError("quotation_unavailable");

    const createdAt = now.toISOString();
    const validUntil = new Date(now.getTime() + VALIDITY_DAYS_MS).toISOString();
    const quote: PublicLabQuote = {
      reference: createReference(request, createdAt),
      requestType: request.requestType,
      createdAt,
      validUntil,
      requestSummary: createRequestSummary(request),
      serviceRouteLabel: request.printingMethod === "digital" ? "デジタル印刷" : "グラビア印刷",
      requestedQuantity: request.quantity.toString(),
      billedQuantity: result.quantity,
      currency: "JPY",
      pricePerPiece: totals.display.pricePerPiece,
      subtotal: totals.display.subtotal,
      tax: totals.display.tax,
      grandTotal: totals.display.grandTotal,
      exclusions: [
        "お客様支給の充填物（中身）の費用は含まれません。",
        "法規対応費、試験費、デザイン制作費、オプション包装費は含まれません。",
      ],
      deliveryNote: "納期はお約束できません。",
      consultationCta: "お問い合わせ・相談はこちら",
      sampleCta: "サンプル依頼はこちら",
    };

    return {
      quote,
      internal: {
        canonicalRequest: structuredClone(request),
        calculationVersion: CALCULATION_VERSION,
        resultHash: result.audit.resultJsonSha256,
      },
    };
  } catch (error) {
    throw toPublicQuoteError(error);
  }
}

function createInternalCalculationInput(
  request: PublicLabQuotationRequest,
  targetMargin: string,
): CalculationInput {
  const size = sizeMaster[request.sizeKey];
  if (!size) throw new QuotationValidationError("size_not_found");

  const spec: PouchSpec = {
    sizeKey: request.sizeKey,
    fillMlPerChamber: request.fillMlPerChamber.toString(),
    connectedChambers: request.connectedChambers,
    fillingMethod: request.fillingMethod,
    fillingLanes: size.lanes,
    isCustom: false,
    colorCount: request.colorCount,
    bulkUnitPrice: "0",
    skuCount: 1,
    skuQuantities: [request.quantity.toString()],
  };

  return {
    spec,
    quantity: request.quantity.toString(),
    printingMethod: request.printingMethod,
    parameters: defaultParameters,
    gravureParameters: defaultGravureRollParameters(),
    targetMargins: [targetMargin],
  };
}

function selectRecommendedRouteCandidate(
  candidates: readonly PrintCandidate[],
  printingMethod: PublicLabQuotationRequest["printingMethod"],
): PrintCandidate {
  const requestedRoute = printingMethod === "digital" ? "D" : undefined;
  const eligible = candidates.filter((candidate) => {
    const routeMatches = requestedRoute
      ? candidate.route === requestedRoute
      : candidate.route === "K" || candidate.route === "Y";
    return routeMatches && candidate.isFulfilling && candidate.isPractical;
  });
  const selected = eligible.find((candidate) => candidate.recommended) ?? eligible[0];
  if (!selected) throw new QuotationValidationError("candidate_not_found");
  return selected;
}

function createRequestSummary(request: PublicLabQuotationRequest): string {
  const sizeLabel = sizeMaster[request.sizeKey].label;
  const quantity = formatInteger(request.quantity);
  const printing = request.printingMethod === "digital" ? "デジタル" : "グラビア";
  const filling = request.fillingMethod === "hopper" ? "ホッパー" : "加圧";
  return [
    `希望サイズ: ${sizeLabel}`,
    `希望数量: ${quantity}枚`,
    `印刷: ${printing}`,
    `充填: ${filling}`,
    `色数: ${request.colorCount}色`,
  ].join("／");
}

function createReference(request: PublicLabQuotationRequest, createdAt: string): string {
  const canonical = JSON.stringify({ createdAt, request });
  const hash = createHash("sha256").update(canonical).digest("hex").slice(0, 16).toUpperCase();
  const date = createdAt.slice(0, 10).replaceAll("-", "");
  return `PL-${date}-${hash}`;
}

function formatInteger(value: number): string {
  return value.toString().replaceAll(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function toPublicQuoteError(error: unknown): PublicLabQuoteError {
  if (error instanceof PublicLabQuoteError) return error;
  if (error instanceof QuotationValidationError) return new PublicLabQuoteError(error.code);
  return new PublicLabQuoteError("public_quote_unavailable");
}

export type PublicLabQuoteMoneyField = typeof PUBLIC_MONEY_FIELDS[number];
