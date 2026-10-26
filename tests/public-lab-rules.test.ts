import { describe, expect, it } from "vitest";

import { publicLabSizeOptions } from "@/lib/public-lab-options";
import { clampPublicLabCapacity, getPublicLabSizeRule } from "@/lib/public-lab-rules";

describe("public lab size rules", () => {
  it("uses the commercial rules requested on the LP", () => {
    expect(getPublicLabSizeRule("round-50x60")).toEqual({
      shapeCode: "RDA",
      capacity: { min: 1, max: 10 },
      minimumQuantity: 10_000,
      unit: "g",
    });
    expect(getPublicLabSizeRule("tube-35x80")).toEqual({
      shapeCode: "TUA",
      capacity: { min: 1, max: 10 },
      minimumQuantity: 10_000,
      unit: "g",
    });
    expect(getPublicLabSizeRule("bottle-50x90")).toEqual({
      shapeCode: "BTA",
      capacity: { min: 1, max: 10 },
      minimumQuantity: 10_000,
      unit: "g",
    });
    expect(getPublicLabSizeRule("circle-70x70")).toEqual({
      shapeCode: "CRA",
      capacity: { min: 1, max: 2 },
      minimumQuantity: 10_000,
      unit: "g",
    });
    expect(getPublicLabSizeRule("spa-35x80")).toEqual({
      shapeCode: "SPA",
      capacity: { min: 1, max: 1 },
      minimumQuantity: 50_000,
      unit: "g",
    });
    expect(getPublicLabSizeRule("xra-38.5x90")).toEqual({
      shapeCode: "XRA",
      capacity: { min: 1, max: 1 },
      minimumQuantity: 10_000,
      unit: "g",
    });
  });

  it("has a deterministic rule for every public size option", () => {
    for (const option of publicLabSizeOptions) {
      const rule = getPublicLabSizeRule(option.key);
      expect(rule.capacity.min).toBeGreaterThan(0);
      expect(rule.capacity.max).toBeGreaterThanOrEqual(rule.capacity.min);
      expect(rule.minimumQuantity).toBeGreaterThanOrEqual(10_000);
    }
  });

  it("clamps capacity values into the selected shape range", () => {
    const rule = getPublicLabSizeRule("xra-38.5x90");
    expect(clampPublicLabCapacity(0, rule)).toBe(1);
    expect(clampPublicLabCapacity(1, rule)).toBe(1);
    expect(clampPublicLabCapacity(2, rule)).toBe(1);
  });
});
