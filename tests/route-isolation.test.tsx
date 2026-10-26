import { readFile } from "node:fs/promises";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy, config } from "@/proxy";

const projectRoot = path.resolve(import.meta.dirname, "..");
const requestAt = (pathWithQuery: string) => new NextRequest(`https://package-lab.test${pathWithQuery}`);

describe("public lab proxy access", () => {
  it("renders the public LP at the canonical root", () => {
    const response = proxy(requestAt("/?from=email"));

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-rewrite")).toContain("/lab");
  });

  it("allows /lab and /lab/ anonymously with any query variant", () => {
    for (const pathWithQuery of ["/lab", "/lab/", "/lab?from=email", "/lab/?plan=sample"]) {
      const response = proxy(requestAt(pathWithQuery));

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("redirects anonymous visitors from protected internal page routes to login", () => {
    for (const pathname of ["/quote", "/history", "/checklists/current", "/admin/users"]) {
      const response = proxy(requestAt(pathname));
      const login = new URL(response.headers.get("location") ?? "");

      expect(response.status).toBe(307);
      expect(login.pathname).toBe("/login");
      expect(login.searchParams.get("next")).toBe(pathname);
    }
  });

  it("keeps APIs outside proxy matching", () => {
    expect(config.matcher).toHaveLength(1);
    expect(config.matcher[0]).toContain("(?!api|");
  });
});

describe("route group isolation", () => {
  afterEach(cleanup);

  it("renders the internal GlobalHeader around the quotation suite", async () => {
    vi.doMock("@/components/global-header", () => ({
      GlobalHeader: () => <header data-testid="internal-header">Quotation Suite</header>,
    }));
    vi.resetModules();
    const QuotationSuiteLayout = (await import("@/app/(quotation-suite)/layout")).default;
    render(await QuotationSuiteLayout({ children: <main>internal children</main> }));

    expect(screen.getByTestId("internal-header")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("internal children");
  });

  it("keeps the root layout free of internal chrome while the internal group owns it", async () => {
    const rootLayout = await readFile(path.join(projectRoot, "src/app/layout.tsx"), "utf8");
    const groupLayout = await readFile(path.join(projectRoot, "src/app/(quotation-suite)/layout.tsx"), "utf8");

    expect(rootLayout).not.toMatch(/GlobalHeader/);
    expect(rootLayout).toMatch(/suppressHydrationWarning/);
    expect(groupLayout).toMatch(/import \{ GlobalHeader \} from "@\/components\/global-header"/);
    expect(groupLayout).toMatch(/<GlobalHeader \/>/);
    expect(groupLayout).toMatch(/パウチ参考原価・販売価格シミュレーター/);
  });
});
