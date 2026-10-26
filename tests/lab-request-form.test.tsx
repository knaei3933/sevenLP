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

    expect(screen.getByRole("group", { name: "現在の入力仕様" })).toHaveTextContent(
      "ラウンド 50×60",
    );
    expect(screen.getByTestId("pre-gate-price-notice")).toHaveTextContent(
      "単価・総額は、会社情報と連絡先、同意の確認後に表示します。",
    );
    expect(document.querySelector("#lab-quote-result-heading")).toBeNull();
    expect(screen.queryByText(/¥/)).not.toBeInTheDocument();
  });

  it("does not call the API or release a price when consent is missing", async () => {
    const user = renderForm();
    const fetchMock = mockFetchOnce({ quote: apiQuote });
    await fillValidLead(user);

    await user.click(screen.getByRole("button", { name: "仕様と連絡先を送信して価格を確認" }));

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
    await user.click(screen.getByRole("button", { name: "仕様と連絡先を送信して価格を確認" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/public/lab/requests", expect.any(Object));
    expect(screen.getByRole("heading", { name: "お見積り条件を確認しました" })).toBeInTheDocument();
    expect(screen.getByTestId("quote-reference")).toHaveTextContent("PL-TEST-REFERENCE");
    expect(screen.getByTestId("released-grand-total")).toHaveTextContent("¥33000");
    expect(screen.queryByText("lead@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("テスト株式会社")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "仕様と連絡先を送信して価格を確認" })).not.toBeInTheDocument();
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
    await user.click(screen.getByTestId("lab-submit"));

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
    await user.click(screen.getByRole("button", { name: "仕様と連絡先を送信して価格を確認" }));

    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("aria-describedby", "lab-email-error");
    expect(screen.getByText("メールアドレスの形式を確認してください。")).toBeInTheDocument();
  });

  it("applies XRA's one-gram capacity rule", async () => {
    const user = renderForm();

    await user.selectOptions(screen.getByTestId("lab-size"), "xra-38.5x90");

    expect(screen.getByTestId("lab-size-rule")).toHaveTextContent(
      "スリムドーズ 38.5×90（XRA）: 1g／10,000枚〜",
    );
    expect(screen.getByTestId("lab-fill")).toHaveAttribute("min", "1");
    expect(screen.getByTestId("lab-fill")).toHaveAttribute("max", "1");

    await fillValidLead(user);
    await user.clear(screen.getByTestId("lab-quantity"));
    await user.type(screen.getByTestId("lab-quantity"), "10000");
    await user.clear(screen.getByTestId("lab-fill"));
    await user.type(screen.getByTestId("lab-fill"), "2");
    await user.click(screen.getByLabelText(/プライバシーポリシーに同意し/));
    await user.click(screen.getByTestId("lab-submit"));

    expect(screen.getByText("充填量は1gで入力してください。")).toBeInTheDocument();
  });

  it("applies SPA's fifty-thousand minimum quantity rule", async () => {
    const user = renderForm();

    await user.selectOptions(screen.getByTestId("lab-size"), "spa-35x80");

    expect(screen.getByTestId("lab-size-rule")).toHaveTextContent(
      "スポイトボトル型 35×80: 1g／50,000枚〜",
    );
    expect(screen.getByTestId("lab-quantity")).toHaveAttribute("min", "50000");

    await fillValidLead(user);
    await user.clear(screen.getByTestId("lab-quantity"));
    await user.type(screen.getByTestId("lab-quantity"), "49999");
    await user.type(screen.getByTestId("lab-fill"), "1");
    await user.click(screen.getByLabelText(/プライバシーポリシーに同意し/));
    await user.click(screen.getByTestId("lab-submit"));

    expect(screen.getByText("数量は50,000枚以上の整数で入力してください。上限は設定していません。")).toBeInTheDocument();
  });
});
