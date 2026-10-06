import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import LabPage from "@/app/lab/page";

describe("public lab identity", () => {
  afterEach(cleanup);

  it("renders Japanese-first brand, affiliation, conversion actions, and contact", () => {
    render(<LabPage />);

    expect(screen.getByRole("heading", { level: 1, name: "パウチ充填ラボ" })).toBeInTheDocument();
    expect(screen.getByText("Epackage Labのパウチ充填専門サービス")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "無料見積もり" })).toHaveAttribute("href", "#lab-quote");
    expect(screen.getByRole("link", { name: "サンプル・相談" })).toHaveAttribute("href", "#lab-contact");
    const contact = screen.getByRole("link", { name: "shapepouch@package-lab.com" });
    expect(contact).toBeVisible();
    expect(contact).toHaveAttribute("href", "mailto:shapepouch@package-lab.com?subject=サンプル・ご相談");
  });

  it("does not expose internal Quotation Suite labels or header", () => {
    render(<LabPage />);

    expect(screen.queryByRole("header")).not.toBeInTheDocument();
    for (const internalLabel of ["Quotation Suite", "原価シミュレーター", "見積書発行", "見積履歴", "ユーザー管理"]) {
      expect(screen.queryByText(internalLabel)).not.toBeInTheDocument();
    }
  });
});
