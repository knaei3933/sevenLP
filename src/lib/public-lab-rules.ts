import type { PublicLabSizeKey } from "./public-lab-options";

export interface PublicLabCapacityRule {
  readonly min: number;
  readonly max: number;
}

export interface PublicLabShapeRule {
  readonly shapeCode: "RDA" | "TUA" | "BTA" | "CRA" | "SPA" | "XRA" | "MOW";
  readonly capacity: PublicLabCapacityRule;
  readonly minimumQuantity: number;
  readonly unit: "g";
}

const DEFAULT_RULE: PublicLabShapeRule = {
  shapeCode: "RDA",
  capacity: { min: 1, max: 10 },
  minimumQuantity: 10_000,
  unit: "g",
};

/**
 * LPと公開見積フォームで使う形状別商務ルールの単一ソース。
 * 内部計算用フィールド名は既存互換のため fillMlPerChamber のまま維持する。
 */
export function getPublicLabSizeRule(sizeKey: PublicLabSizeKey | string): PublicLabShapeRule {
  if (sizeKey.startsWith("circle-")) {
    return {
      shapeCode: "CRA",
      capacity: { min: 1, max: 2 },
      minimumQuantity: 10_000,
      unit: "g",
    };
  }

  if (sizeKey.startsWith("tube-")) {
    return {
      shapeCode: "TUA",
      capacity: { min: 1, max: 10 },
      minimumQuantity: 10_000,
      unit: "g",
    };
  }

  if (sizeKey === "spa-35x80") {
    return {
      shapeCode: "SPA",
      capacity: { min: 1, max: 1 },
      minimumQuantity: 50_000,
      unit: "g",
    };
  }

  if (sizeKey.startsWith("bottle-")) {
    return {
      shapeCode: "BTA",
      capacity: { min: 1, max: 10 },
      minimumQuantity: 10_000,
      unit: "g",
    };
  }

  if (sizeKey === "xra-38.5x90") {
    return {
      shapeCode: "XRA",
      capacity: { min: 1, max: 1 },
      minimumQuantity: 10_000,
      unit: "g",
    };
  }

  if (sizeKey === "mouthwash-45x145") {
    return {
      shapeCode: "MOW",
      capacity: { min: 1, max: 10 },
      minimumQuantity: 10_000,
      unit: "g",
    };
  }

  return DEFAULT_RULE;
}

export function clampPublicLabCapacity(
  value: number,
  rule: PublicLabShapeRule,
): number {
  if (!Number.isFinite(value)) return rule.capacity.min;
  return Math.min(rule.capacity.max, Math.max(rule.capacity.min, value));
}
