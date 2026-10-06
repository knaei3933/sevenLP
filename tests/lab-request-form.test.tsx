import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LabRequestForm } from "@/app/lab/lab-request-form";

const apiQuote = {
  reference: "PL-TEST-REFERENCE",
  requestType: "quotation",
  createdAt: "2026-01-01T00:00:00.000Z",
  validUntil: "2026-01-31T00:00:00.000Z",
  requestSummary: "希望サイズ: ラウンド 50×60／希望数量: 1,000枚",
  serviceRouteLabel: "デジタル印刷",
  requestedQuantity: "1000",
  billedQuantity: "1000",
  currency: "JPY",
  pricePerPiece: "30",
  subtotal: "30000",
  tax: "3000",
  grandTotal: "33000",
  exclusions: ["テスト除外条件"],
  deliveryNote: "テスト納期注記",
  consultationCta: "相談はこちら",
  sampleCta: "サンプルはこちら",
};

function renderForm() {
  const user = userEvent.setup();
  render(<LabRequestForm />);
  return user;
}

function mockFetchOnce(payload: unknown, status = 201) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function fillValidLead(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("会社名"), "テスト株式会社");
  await user.type(screen.getByLabelText("お名前"), "公開 太郎");
  await user.type(screen.getByLabelText("メールアドレス"), "lead@example.com");
  await user.type(screen.getByLabelText("電話番号"), "0300000000");
}

describe("public lab request form", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uses an operable ARIA tab list and keeps all three request types", async () => {
    const user = renderForm();

    expect(screen.getByRole("tablist", { name: "依頼種別" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "お見積もり" })).toHaveAttribute("aria-selected", "true");
    screen.getByRole("tab", { name: "お見積もり" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "ご相談" })).toHaveFocus();
    expect(screen.getByRole("tabpanel", { name: /ご相談/ })).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "お見積もり" })).toHaveFocus();
  });

  it("shows the configured specification without a pre-gate price", () => {
    renderForm();

    expect(screen.getByRole("group", { name: "現在のご依頼条件" })).toHaveTextContent(
      "ラウンド 50×60",
    );
    expect(screen.getByTestId("pre-gate-price-notice")).toHaveTextContent(
      "最終価格は、リード情報の送信完了後に表示します。",
    );
    expect(document.querySelector("#lab-quote-result-heading")).toBeNull();
    expect(screen.queryByText(/¥/)).not.toBeInTheDocument();
  });

  it("does not call the API or release a price when consent is missing", async () => {
    const user = renderForm();
    const fetchMock = mockFetchOnce({ quote: apiQuote });
    await fillValidLead(user);

    await user.click(screen.getByRole("button", { name: "リード情報を送信して価格を確認する" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("入力内容をご確認ください。");
    expect(screen.getByLabelText(/プライバシーポリシーに同意し/)).toBeInvalid();
    expect(screen.queryByTestId("released-grand-total")).not.toBeInTheDocument();
  });

  it("renders only the API quote DTO after a successful release", async () => {
    const user = renderForm();
    const fetchMock = mockFetchOnce(apiQuote);
    await fillValidLead(user);
    await user.click(screen.getByLabelText(/プライバシーポリシーに同意し/));
    await user.click(screen.getByRole("button", { name: "リード情報を送信して価格を確認する" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/public/lab/requests", expect.any(Object));
    expect(screen.getByRole("heading", { name: "お見積りが発行されました" })).toBeInTheDocument();
    expect(screen.getByTestId("quote-reference")).toHaveTextContent("PL-TEST-REFERENCE");
    expect(screen.getByTestId("released-grand-total")).toHaveTextContent("¥33000");
    expect(screen.queryByText("lead@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("テスト株式会社")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "リード情報を送信して価格を確認する" })).not.toBeInTheDocument();
  });

  it("renders only the safe confirmation for consultation and sample requests", async () => {
    const user = renderForm();
    const fetchMock = mockFetchOnce({
      reference: "PL-C-TEST",
      requestType: "consultation",
      message: "受け付けました。担当からご連絡いたします。",
    });
    await user.click(screen.getByRole("tab", { name: "ご相談" }));
    await fillValidLead(user);
    await user.click(screen.getByLabelText(/プライバシーポリシーに同意し/));
    await user.click(screen.getByRole("button", { name: "送信する" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "受け付けました。担当からご連絡いたします。" })).toBeInTheDocument();
    expect(screen.getByTestId("request-reference")).toHaveTextContent("参照番号: PL-C-TEST");
    expect(screen.queryByText("税込合計")).not.toBeInTheDocument();
  });

  it("maps server validation errors to Japanese field messages", async () => {
    const user = renderForm();
    mockFetchOnce(
      { errors: [{ field: "email", code: "invalidEmail" }] },
      400,
    );
    await fillValidLead(user);
    await user.type(screen.getByLabelText("メールアドレス"), "invalid");
    await user.click(screen.getByLabelText(/プライバシーポリシーに同意し/));
    await user.click(screen.getByRole("button", { name: "リード情報を送信して価格を確認する" }));

    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("aria-describedby", "lab-email-error");
    expect(screen.getByText("メールアドレスの形式を確認してください。")).toBeInTheDocument();
  });
});
