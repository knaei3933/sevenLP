import type { PublicLabSizeKey } from "./public-lab-options";

export type PublicQuoteDraftDesignId =
  | "rda"
  | "tua"
  | "bta"
  | "cra"
  | "spa"
  | "xra"
  | "mow";

export type PublicQuoteDraftLocale = "ja";

export interface PublicQuoteDraftDesignOption {
  readonly id: PublicQuoteDraftDesignId;
  readonly label: string;
  readonly sizeKeys: readonly PublicLabSizeKey[];
}

export const publicQuoteDraftLocales = [
  "ja",
] as const satisfies readonly PublicQuoteDraftLocale[];

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
  { id: "spa", label: "スポイトボトル（SPA）", sizeKeys: ["spa-35x80"] },
  { id: "xra", label: "スリムドーズ（XRA）", sizeKeys: ["xra-38.5x90"] },
  { id: "mow", label: "マウスウォッシュ（MOW）", sizeKeys: ["mouthwash-45x145"] },
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
