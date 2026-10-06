import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";

import * as publicLabRequests from "@/app/api/public/lab/requests/route";
import LabPage from "@/app/lab/page";

// This commit is the pre-public-LP baseline used by the G001-G006 branch history.
const G001_G006_BASELINE = "ac60eaea5e908c0076dd3fd2cb58ee96e1fa57e8";
const PUBLIC_CONTACT = "shapepouch@package-lab.com";

const FORBIDDEN_PACKAGE_PATTERN =
  /(smtp|nodemailer|resend|sendgrid|mailgun|postmark|hubspot|salesforce|crm|google-analytics|gtag|googletagmanager|gtm|analytics)/i;

const FORBIDDEN_SOURCE_PATTERN =
  /(smtp|nodemailer|resend|sendgrid|mailgun|postmark|hubspot|salesforce|crm|google-analytics|gtag|googletagmanager|gtm|analytics|sendmail\s*\(|createtransport|mailservice|smtpclient|@aws-sdk\/client-ses)/i;

const CREDENTIAL_SHAPED_PATTERN =
  /((?:smtp|mail|nodemailer|resend|sendgrid|mailgun|postmark|hubspot|salesforce)[_-][a-z0-9_-]*?(?:key|secret|token|password|credential)|(?:api[_-]?key|api[_-]?secret|client[_-]?secret|access[_-]?token|refresh[_-]?token|private[_-]?key|credentials\s*[=:]))/i;

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function changedAddedLines(): string[] {
  const diff = execFileSync(
    "git",
    ["diff", "--unified=0", G001_G006_BASELINE, "HEAD", "--", "src", "tests"],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  const addedLines: string[] = [];
  let path = "";
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) path = "";
    if (line.startsWith("+++ b/")) path = line.slice(6);
    if (
      path !== "tests/public-lab-boundaries.test.ts" &&
      line.startsWith("+") &&
      !line.startsWith("+++")
    ) {
      addedLines.push(line);
    }
  }
  return addedLines;
}

describe("public lab v1 negative boundaries", () => {
  afterEach(cleanup);

  it("keeps package scripts and dependencies free of mail, CRM, and analytics vendors", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };

    const dependencies = [
      ...Object.entries(manifest.dependencies ?? {}),
      ...Object.entries(manifest.devDependencies ?? {}),
      ...Object.entries(manifest.optionalDependencies ?? {}),
      ...Object.entries(manifest.peerDependencies ?? {}),
    ].map(([name, specifier]) => `${name}@${specifier}`);
    const scripts = Object.entries(manifest.scripts ?? {}).map(
      ([name, command]) => `${name}=${command}`,
    );

    for (const entry of [...dependencies, ...scripts]) {
      expect(entry).not.toMatch(FORBIDDEN_PACKAGE_PATTERN);
    }
    expect(dependencies.length).toBeGreaterThan(0);
    expect(scripts.length).toBeGreaterThan(0);
  });

  it("does not import or invoke mail, CRM, or analytics providers in public source", () => {
    const sourceFiles = [
      ...listFiles("src/lib"),
      ...listFiles("src/app/api"),
      ...listFiles("src/app/lab"),
    ];

    expect(sourceFiles.length).toBeGreaterThan(20);
    for (const path of sourceFiles) {
      expect(`${path}:${readFileSync(path, "utf8")}`).not.toMatch(
        FORBIDDEN_SOURCE_PATTERN,
      );
    }
  });

  it("exposes exactly one public lab API route and no public history, admin, or CRM route", () => {
    const apiRouteFiles = listFiles("src/app/api")
      .filter((path) => path.endsWith("route.ts"))
      .map((path) => path.replaceAll("\\", "/"));
    const publicRoutes = apiRouteFiles.filter((path) => path.includes("/public/"));

    expect(publicRoutes).toEqual(["src/app/api/public/lab/requests/route.ts"]);
    for (const path of publicRoutes) {
      expect(path.toLowerCase()).not.toMatch(/history|admin|crm/);
    }
  });

  it("makes every non-POST public method a safe 405 without a read or enumeration body", async () => {
    const methods = ["GET", "PATCH", "PUT", "DELETE"] as const;

    for (const method of methods) {
      const response = await publicLabRequests[method](
        new Request("https://localhost/api/public/lab/requests", { method }),
      );

      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("POST");
      expect(response.headers.get("cache-control")).toBe("no-store");
      await expect(response.json()).resolves.toEqual({ error: "method_not_allowed" });
    }

    const source = readFileSync(
      "src/app/api/public/lab/requests/route.ts",
      "utf8",
    );
    expect(source).not.toMatch(/listPublic(?:Lead|Quotation)/);
    expect(source).not.toMatch(/SELECT\s+.+\s+FROM\s+public_/i);
    expect(source).not.toMatch(/DELETE\s+FROM\s+public_/i);
  });

  it("does not expose public lead reads, enumeration, or deletion through any API route", () => {
    const routeFiles = listFiles("src/app/api").filter((path) =>
      path.endsWith("route.ts"),
    );
    const publicRoute = "src/app/api/public/lab/requests/route.ts";
    const publicRouteSource = readFileSync(publicRoute, "utf8");
    const storeImports = [
      ...publicRouteSource.matchAll(
        /import\s*\{([^}]+)\}\s*from\s*"@\/lib\/public-lead-store"/g,
      ),
    ].flatMap((match) => match[1].split(","));

    const importedNames = storeImports.map((name) => name.trim()).filter(Boolean);
    expect(importedNames).toEqual(["savePublicLead", "savePublicQuotation"]);
    expect(importedNames.every((name) => /^save/.test(name))).toBe(true);

    for (const path of routeFiles) {
      const source = readFileSync(path, "utf8");
      if (path.replaceAll("\\", "/") === publicRoute) continue;
      expect(`${path}:${source}`).not.toMatch(/public-lead-store|public_leads|public_quotations/);
    }
  });

  it("renders the approved public contact as a valid mailto link", () => {
    render(createElement(LabPage));

    const contact = screen.getByRole("link", { name: PUBLIC_CONTACT });
    expect(contact).toBeVisible();
    expect(contact).toHaveAttribute(
      "href",
      `mailto:${PUBLIC_CONTACT}?subject=サンプル・ご相談`,
    );

    const mailto = new URL(contact.getAttribute("href") ?? "");
    expect(mailto.protocol).toBe("mailto:");
    expect(decodeURIComponent(mailto.pathname)).toBe(PUBLIC_CONTACT);
  });

  it("contains no credential-shaped values in G001-G006 source or test additions", () => {
    const addedLines = changedAddedLines();

    expect(addedLines.length).toBeGreaterThan(100);
    for (const line of addedLines) {
      expect(line).not.toMatch(CREDENTIAL_SHAPED_PATTERN);
    }
  });
});
