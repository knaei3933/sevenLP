import type { PublicLabSizeKey } from "./public-lab-options";

export type PublicQuoteDraftDesignId =
  | "rda"
  | "tua"
  | "bta"
  | "cra"
  | "xra";

export type PublicQuoteDraftLocale = "ja";

export interface PublicQuoteDraftDesignOption {
  readonly id: PublicQuoteDraftDesignId;
  readonly label: string;
  readonly sizeKeys: readonly PublicLabSizeKey[];
}

export const publicQuoteDraftLocales = [
  "ja",
] as const satisfies readonly PublicQuoteDraftLocale[];

export const publicQuoteDraftFillOptions = Object.freeze(["1", "2", "3", "5", "10"] as const);

const PUBLIC_QUOTE_DRAFT_FILL_PATTERN = /^[0-9]+(?:\.[0-9]{1,2})?$/;
const PUBLIC_QUOTE_DRAFT_CAPACITY: Record<PublicQuoteDraftDesignId, { min: number; max: number }> = Object.freeze({
  rda: { min: 1, max: 10 },
  tua: { min: 1, max: 10 },
  bta: { min: 1, max: 10 },
  cra: { min: 1, max: 2 },
  xra: { min: 1, max: 1 },
});

export function acceptsPublicQuoteDraftFill(
  designId: string,
  sizeKey: PublicLabSizeKey | string,
  fillAmount: string,
): boolean {
  const design = getPublicQuoteDraftDesign(designId);
  if (!design || !design.sizeKeys.includes(sizeKey as PublicLabSizeKey)) return false;
  if (!PUBLIC_QUOTE_DRAFT_FILL_PATTERN.test(fillAmount)) return false;
  const amount = Number(fillAmount);
  const capacity = PUBLIC_QUOTE_DRAFT_CAPACITY[design.id];
  return amount >= capacity.min && amount <= capacity.max;
}

export function publicQuoteDraftSupportsFill(
  designId: PublicQuoteDraftDesignId,
  fillAmount: string,
): boolean {
  if (!PUBLIC_QUOTE_DRAFT_FILL_PATTERN.test(fillAmount)) return false;
  const amount = Number(fillAmount);
  const capacity = PUBLIC_QUOTE_DRAFT_CAPACITY[designId];
  return amount >= capacity.min && amount <= capacity.max;
}

export const publicQuoteDraftDesignOptions = [
  {
    id: "rda",
    label: "ラウンドドーズ（RDA）",
    sizeKeys: [
      "round-50x60",
      "round-50x80",
      "round-60x80",
      "round-60x100",
      "round-60x120",
      "round-70x120",
      "round-60x80-2",
      "round-70x120-3",
    ],
  },
  {
    id: "tua",
    label: "チューブ（TUA）",
    sizeKeys: ["tube-35x60", "tube-35x80", "tube-50x90", "tube-70x120"],
  },
  {
    id: "bta",
    label: "ボトル型（BTA）",
    sizeKeys: [
      "bottle-35x60",
      "bottle-35x80",
      "bottle-50x90",
      "bottle-70x120",
    ],
  },
  { id: "cra", label: "丸形（CRA）", sizeKeys: ["circle-70x70"] },
  {
    id: "xra",
    label: "XRAラウンド（XRA）",
    sizeKeys: ["xra-38.5x90"],
  },
] as const satisfies readonly PublicQuoteDraftDesignOption[];

export function getPublicQuoteDraftDesign(
  designId: string,
): PublicQuoteDraftDesignOption | undefined {
  return publicQuoteDraftDesignOptions.find((design) => design.id === designId);
}

export function isPublicQuoteDraftLocale(
  value: string,
): value is PublicQuoteDraftLocale {
  return (publicQuoteDraftLocales as readonly string[]).includes(value);
}
