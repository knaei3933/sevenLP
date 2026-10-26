import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import tokenContract from "../contracts/design-tokens.v1.json";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tokenJsonPath = join(repositoryRoot, "contracts", "design-tokens.v1.json");
const tokenCssPath = join(repositoryRoot, "src", "design-system", "design-tokens.v1.css");
const checksumPath = join(repositoryRoot, "contracts", "design-tokens.v1.sha256");
const tokenJson = readFileSync(tokenJsonPath);
const tokenCss = readFileSync(tokenCssPath, "utf8");
const checksum = readFileSync(checksumPath, "utf8");

const sha256 = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");

function existsSafe(path: string): boolean {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}

const peerRoot = [
  process.env.DESIGN_TOKEN_PEER_ROOT,
  resolve(repositoryRoot, "..", "ShapePouch-LP"),
]
  .filter((candidate): candidate is string => Boolean(candidate))
  .find((candidate) => existsSafe(join(candidate, "contracts", "design-tokens.v1.json")));

describe("G006 shared design token contract", () => {
  it("keeps the JSON contract, CSS variables, and checksum sidecar in sync", () => {
    expect(sha256(tokenJson)).toBe("cb4e46b6c9ad4e94cdb5eede9bfc8b2b93e7bb6b8295b0e1bc3a1c07da821691");
    expect(sha256(tokenCss)).toBe("166c6243e707e9a2a026811865fdf76e76c7a5ee2fc6b1e5f8375b1b2e24f57c");
    expect(checksum).toBe(
      `${sha256(tokenJson)}  contracts/design-tokens.v1.json\n` +
      `${sha256(tokenCss)}  src/design-system/design-tokens.v1.css\n`,
    );

    for (const [key, value] of Object.entries(tokenContract.color)) {
      expect(tokenCss).toContain(`--sp-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}: ${value};`);
    }
    expect(tokenCss).toContain(`--sp-font-japanese: ${tokenContract.typography.familyJapanese};`);
    expect(tokenCss).toContain(`--sp-target-min: ${tokenContract.interaction.targetMin};`);
    expect(tokenCss).toContain(`--sp-focus-width: ${tokenContract.interaction.focusWidth};`);
    expect(tokenCss).toContain(`--sp-motion-ease: ${tokenContract.motion.easeStandard};`);
  });

  (peerRoot ? it : it.skip)("mirrors exact token bytes with the customer portal repository", () => {
    expect(readFileSync(join(peerRoot!, "contracts", "design-tokens.v1.json"))).toEqual(tokenJson);
    expect(readFileSync(join(peerRoot!, "src", "design-system", "design-tokens.v1.css"), "utf8")).toBe(tokenCss);
    expect(readFileSync(join(peerRoot!, "contracts", "design-tokens.v1.sha256"), "utf8")).toBe(checksum);
  });

  it("imports and aliases shared tokens across global and LP styles", () => {
    expect(readFileSync(join(repositoryRoot, "src", "app", "layout.tsx"), "utf8"))
      .toContain('import "../design-system/design-tokens.v1.css";');

    const globalCss = readFileSync(join(repositoryRoot, "src", "app", "globals.css"), "utf8");
    const lpCss = readFileSync(join(repositoryRoot, "src", "app", "lab", "page.module.css"), "utf8");
    expect(globalCss).toContain("--primary: var(--sp-brand);");
    expect(globalCss).toContain("--focus: var(--sp-focus);");
    expect(globalCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(lpCss).toContain("--lp-brand: var(--sp-brand);");
    expect(lpCss).toContain("--lp-focus: var(--sp-focus);");
    expect(lpCss).toContain("min-height: 48px");
    expect(lpCss).toContain(":focus-visible");
    expect(lpCss).toContain(":user-invalid");
  });
});
