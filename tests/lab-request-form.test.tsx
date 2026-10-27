import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LabRequestForm } from "@/app/lab/lab-request-form";

function renderForm() {
  const user = userEvent.setup();
  render(<LabRequestForm />);
  return user;
}

function mockFetchOnce(payload: unknown, status = 201) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
    new Response(JSON.stringify(payload), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function fillValidLead(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("会社名"), "テスト株式会社");
  await user.type(screen.getByLabelText("お名前"), "公開 太郎");
  await user.type(screen.getByLabelText("メールアドレス"), "lead@example.com");
  await user.type(screen.getByLabelText("電話番号"), "0300000000");
  await user.click(screen.getByTestId("lab-consent"));
}

describe("public lab request form", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps only consultation and sample request types", async () => {
    const user = renderForm();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["ご相談", "サンプル"]);
    expect(screen.queryByRole("tab", { name: "お見積もり" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("lab-size")).not.toBeInTheDocument();
    expect(screen.queryByTestId("lab-quantity")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "サンプル" }));
    expect(screen.getByRole("tab", { name: "サンプル" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "ご相談" })).toHaveAttribute("aria-selected", "true");
  });

  it("submits consultation leads without legacy quote fields", async () => {
    const user = renderForm();
    const fetchMock = mockFetchOnce({
      requestType: "consultation",
      reference: "PL-TEST-REFERENCE",
      message: "ご相談を受け付けました。",
    });

    await fillValidLead(user);
    await user.click(screen.getByTestId("lab-submit"));

    expect(fetchMock).toHaveBeenCalledWith("/api/public/lab/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: expect.stringContaining('"requestType":"consultation"'),
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body).not.toHaveProperty("sizeKey");
    expect(body).not.toHaveProperty("quantity");
    expect(body).not.toHaveProperty("printingMethod");
    expect(await screen.findByText("ご相談を受け付けました。")).toBeInTheDocument();
    expect(screen.getByTestId("request-reference")).toHaveTextContent("PL-TEST-REFERENCE");
  });

  it("shows Japanese validation errors without calling the API", async () => {
    const user = renderForm();
    const fetchMock = mockFetchOnce({ errors: [] });

    await user.click(screen.getByTestId("lab-submit"));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("lab-summary-error")).toHaveTextContent("入力内容をご確認ください。");
    expect(screen.getByTestId("lab-company")).toHaveAttribute("aria-invalid", "true");
  });
});
