import type { PublicLabSizeKey } from "./public-lab-options";
import { getPublicLabSizeRule } from "./public-lab-rules";

export type PublicQuoteDraftDesignId =
  | "rda"
  | "tua"
  | "bta"
  | "cra";

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

const DESIGN_FILL_OPTIONS = Object.freeze({
  rda: ["1", "2", "3", "5", "10"],
  tua: ["1", "3", "5", "10"],
  bta: ["1", "2", "5", "10"],
  cra: ["1", "2"],
} as const satisfies Record<PublicQuoteDraftDesignId, readonly string[]>);

export function acceptsPublicQuoteDraftFill(
  designId: string,
  sizeKey: PublicLabSizeKey | string,
  fillAmount: string,
): boolean {
  const design = getPublicQuoteDraftDesign(designId);
  if (!design || !design.sizeKeys.includes(sizeKey as PublicLabSizeKey)) return false;
  const shapeCode = getPublicLabSizeRule(sizeKey).shapeCode;
  if (shapeCode === "SPA" || shapeCode === "XRA") return fillAmount === "1";
  return (DESIGN_FILL_OPTIONS[design.id] as readonly string[]).includes(fillAmount);
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
