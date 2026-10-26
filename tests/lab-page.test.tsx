import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import LabPage from "@/app/lab/page";

describe("public lab identity", () => {
  afterEach(cleanup);

  it("renders Japanese-first brand, affiliation, conversion actions, and contact", async () => {
    render(await LabPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { level: 1, name: "小容量パウチを、1万枚から仕様入力だけで進める。" })).toBeInTheDocument();
    expect(screen.getAllByText("Epackage Labのパウチ充填専門サービス").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "形状と数量を選んで見積もりを確認" })).toHaveAttribute("href", "#lab-quote");
    expect(screen.getByRole("link", { name: "条件が未確定なら相談から始める" })).toHaveAttribute("href", "?requestType=consultation#lab-quote-consultation");
    expect(screen.getAllByText("化粧水").length).toBeGreaterThan(0);
    expect(screen.getAllByText("単回使い切り").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "サンプル・仕様を相談" })).not.toBeInTheDocument();
    const contact = screen.getByRole("link", { name: "shapepouch@package-lab.com" });
    expect(contact).toBeVisible();
    expect(contact).toHaveAttribute("href", "mailto:shapepouch@package-lab.com?subject=サンプル・ご相談");
  });

  it("does not expose internal Quotation Suite labels or header", async () => {
    render(await LabPage({ searchParams: Promise.resolve({}) }));

    const header = screen.getByRole("banner");
    const navigation = within(header).getByRole("navigation", { name: "メインナビゲーション" });
    expect(within(navigation).getByRole("link", { name: "製品仕様" })).toHaveAttribute("href", "#lab-products");
    expect(within(navigation).getByRole("link", { name: "見積もり" })).toHaveAttribute("href", "#lab-quote");
    expect(within(navigation).getByRole("link", { name: "品質体制" })).toHaveAttribute("href", "#lab-quality");
    expect(within(navigation).getByRole("link", { name: "進め方" })).toHaveAttribute("href", "#lab-process");
    expect(within(navigation).getByRole("link", { name: "お問い合わせ" })).toHaveAttribute("href", "#lab-contact");
    for (const internalLabel of ["Quotation Suite", "原価シミュレーター", "見積書発行", "見積履歴", "ユーザー管理"]) {
      expect(screen.queryByText(internalLabel)).not.toBeInTheDocument();
    }
  });

  it("explains production and quality conditions without hiding SPA's minimum", async () => {
    render(await LabPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("量産条件｜PRODUCTION")).toBeInTheDocument();
    expect(screen.getByText("SPAは50,000枚〜")).toBeInTheDocument();
    expect(screen.getByText("1961年設立")).toBeInTheDocument();
    expect(screen.getByText("ISO22716")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "充填条件を確定しやすくする体制" })).toBeInTheDocument();
  });
});
