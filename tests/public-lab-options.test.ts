import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { publicLabSizeOptions } from "@/lib/public-lab-options";
import { sizeMaster } from "@/lib/constants";

describe("public lab options", () => {
  it("mirrors all existing standard size keys and labels without importing server data", () => {
    expect(publicLabSizeOptions.map((option) => option.key)).toEqual(Object.keys(sizeMaster));
    expect(publicLabSizeOptions.map((option) => option.label)).toEqual(
      Object.values(sizeMaster).map((size) => size.label),
    );

    const source = readFileSync("src/lib/public-lab-options.ts", "utf8");
    for (const forbidden of [
      "sizeMaster",
      "defaultParameters",
      "calculation",
      "pricing",
      "gravure",
      "candidate",
    ]) {
      expect(source).not.toContain(`from "./${forbidden}`);
    }
  });
});
