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

async function fillContact(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByTestId("lab-company"), "テスト株式会社");
  await user.type(screen.getByTestId("lab-contact-name"), "公開 太郎");
  await user.type(screen.getByTestId("lab-email"), "lead@example.com");
  await user.type(screen.getByTestId("lab-phone"), "0300000000");
}

async function fillSharedConditions(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByTestId("lab-product-category"), "スキンケア");
  await user.type(screen.getByTestId("lab-use-case"), "新製品サンプル");
}

async function consent(user: ReturnType<typeof userEvent.setup>) {
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

  it("submits detailed consultation conditions", async () => {
    const user = renderForm();
    const fetchMock = mockFetchOnce({
      requestType: "consultation",
      reference: "PL-TEST-REFERENCE",
      message: "ご相談を受け付けました。",
    });

    await fillContact(user);
    await user.selectOptions(screen.getByTestId("lab-inquiry-topic"), "filling_spec");
    await user.selectOptions(screen.getByTestId("lab-development-stage"), "development");
    await fillSharedConditions(user);
    await user.selectOptions(screen.getByTestId("lab-planned-quantity"), "5000_10000");
    await user.selectOptions(screen.getByTestId("lab-desired-timing"), "within_3m");
    await consent(user);
    await user.click(screen.getByTestId("lab-submit"));

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body).toMatchObject({
      requestType: "consultation",
      inquiryTopic: "filling_spec",
      developmentStage: "development",
      productCategory: "スキンケア",
      useCase: "新製品サンプル",
      plannedQuantity: "5000_10000",
      desiredTiming: "within_3m",
    });
    expect(body).not.toHaveProperty("sizeKey");
    expect(body).not.toHaveProperty("printingMethod");
    expect(await screen.findByText("ご相談を受け付けました。")).toBeInTheDocument();
  });

  it("submits detailed sample delivery information", async () => {
    const user = renderForm();
    const fetchMock = mockFetchOnce({
      requestType: "sample",
      reference: "PL-TEST-SAMPLE",
      message: "サンプル依頼を受け付けました。",
    });

    await user.click(screen.getByRole("tab", { name: "サンプル" }));
    await fillContact(user);
    await user.click(screen.getByRole("checkbox", { name: "TUA チューブ" }));
    await user.selectOptions(screen.getByTestId("lab-sample-type"), "filled_sample");
    await user.clear(screen.getByTestId("lab-sample-quantity"));
    await user.type(screen.getByTestId("lab-sample-quantity"), "2");
    await user.type(screen.getByTestId("lab-product-name"), "保湿美容液");
    await fillSharedConditions(user);
    await user.selectOptions(screen.getByTestId("lab-planned-quantity"), "10001_50000");
    await user.selectOptions(screen.getByTestId("lab-desired-timing"), "within_1m");
    await user.type(screen.getByTestId("lab-recipient-name"), "サンプル受取太郎");
    await user.type(screen.getByTestId("lab-postal-code"), "150-0001");
    await user.type(screen.getByTestId("lab-prefecture"), "東京都");
    await user.type(screen.getByTestId("lab-address-line1"), "渋谷区テスト1-2-3");
    await user.type(screen.getByTestId("lab-delivery-phone"), "0300000000");
    await consent(user);
    await user.click(screen.getByTestId("lab-submit"));

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body).toMatchObject({
      requestType: "sample",
      sampleShapes: ["rda", "tua"],
      sampleQuantity: 2,
      productName: "保湿美容液",
      postalCode: "150-0001",
      prefecture: "東京都",
      addressLine1: "渋谷区テスト1-2-3",
      deliveryPhone: "0300000000",
    });
    expect(await screen.findByText("サンプル依頼を受け付けました。")).toBeInTheDocument();
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
