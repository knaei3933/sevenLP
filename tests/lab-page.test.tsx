import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import LabPage from "@/app/lab/page";

describe("public lab identity", () => {
  afterEach(cleanup);

  it("renders Japanese-first brand, affiliation, conversion actions, and contact", async () => {
    render(await LabPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { level: 1, name: "化粧品の液剤を、小容量パウチに1万枚から充填。" })).toBeInTheDocument();
    expect(screen.getAllByText("Epackage Labのパウチ充填専門サービス").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "液剤と形状を選んで見積もりを確認" })).toHaveAttribute("href", "/lab#lab-quote");
    expect(screen.getByRole("link", { name: "条件が未確定なら相談から始める" })).toHaveAttribute("href", "?requestType=consultation#lab-request");
    expect(screen.getByRole("link", { name: "対応液剤" })).toHaveAttribute("href", "#lab-liquids");
    expect(screen.getByRole("heading", { level: 2, name: "充填するのは、化粧品・トイレタリーの液剤です" })).toBeInTheDocument();
    expect(screen.getByText("スキンケア・基礎化粧品")).toBeInTheDocument();
    expect(screen.getAllByText("美容液").length).toBeGreaterThan(0);
    expect(screen.getAllByText("乳液").length).toBeGreaterThan(0);
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
    expect(within(navigation).getByRole("link", { name: "見積もり" })).toHaveAttribute("href", "/lab#lab-quote");
    expect(within(navigation).getByRole("link", { name: "品質体制" })).toHaveAttribute("href", "#lab-quality");
    expect(within(navigation).getByRole("link", { name: "進め方" })).toHaveAttribute("href", "#lab-process");
    expect(within(navigation).getByRole("link", { name: "お問い合わせ" })).toHaveAttribute("href", "#lab-contact");
    for (const internalLabel of ["Quotation Suite", "原価シミュレーター", "見積書発行", "見積履歴", "ユーザー管理"]) {
      expect(screen.queryByText(internalLabel)).not.toBeInTheDocument();
    }
  });

  it("uses the new quote draft form at #lab-quote and keeps the request form consultation-only", async () => {
    render(await LabPage({ searchParams: Promise.resolve({}) }));

    const quoteSection = document.querySelector("#lab-quote");
    expect(quoteSection).toContainElement(screen.getByTestId("embedded-quote-draft-form"));
    expect(quoteSection).toHaveTextContent("必要条件だけ入力して見積もりを開始");
    expect(screen.queryByRole("heading", { name: "仕様を入力して価格を確認" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "お見積もり" })).not.toBeInTheDocument();
    expect(document.querySelector("#lab-request-fields")).toBeInTheDocument();
  });

  it("explains quote, filling, sample, lead time, payment, and confidentiality FAQs", async () => {
    render(await LabPage({ searchParams: Promise.resolve({}) }));

    const faq = document.querySelector("#lab-faq") as HTMLElement;
    expect(faq).not.toBeNull();
    expect(within(faq).getAllByRole("heading", { level: 3 })).toHaveLength(6);
    expect(faq.querySelectorAll("details")).toHaveLength(26);
    expect(within(faq).getByText("サンプルは有料ですか？")).toBeInTheDocument();
    expect(within(faq).getByText("納期はどのくらいかかりますか？")).toBeInTheDocument();
    expect(within(faq).getByText("お支払い条件を教えてください。")).toBeInTheDocument();
    expect(within(faq).getByText("生産工場の所在地を教えてください。")).toBeInTheDocument();
    expect(within(faq).getByText("生産工場へ直接問い合わせや発注はできますか？")).toBeInTheDocument();
    expect(faq.textContent).not.toContain("セブン化学");
    expect(faq.textContent).not.toContain("7chemical.co.jp");
    expect(faq.textContent).not.toContain("柏原市");
    expect(within(faq).getByText("処方やデザインデータの機密保持はできますか？")).toBeInTheDocument();
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
