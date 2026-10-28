import { readFile } from "node:fs/promises";
import path from "node:path";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";

import LabPage from "@/app/lab/page";
import { EmbeddedQuoteDraftForm } from "@/app/lab/embedded-quote-draft-form";

const projectRoot = path.resolve(import.meta.dirname, "..");

afterEach(cleanup);

describe("embedded quote form", () => {
  it("exposes constrained customer fields and posts only to the draft route", async () => {
    render(await LabPage({ searchParams: Promise.resolve({}) }));
    const form = screen.getByTestId("embedded-quote-draft-form");

    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("action", "/api/public/lab/quote-drafts");
    const fields = form.querySelectorAll("input:not([type='hidden'])[name]");
    expect(fields).toHaveLength(23);
    expect(form.querySelectorAll("input[name='fillAmount']")).toHaveLength(1);
    expect([...fields].map((field) => field.getAttribute("name"))).toEqual([
      ...Array.from({ length: 4 }, () => "designId"),
      ...Array.from({ length: 8 }, () => "sizeKey"),
      ...Array.from({ length: 10 }, () => "colorCount"),
      "quantity",
    ]);
    expect(form.querySelector("input[name='locale']")).toHaveValue("ja");
    expect(screen.getByRole("heading", { name: "必要条件だけ入力して見積もりを開始" })).toBeInTheDocument();

    const source = await readFile(
      path.join(projectRoot, "src/app/lab/embedded-quote-draft-form.tsx"),
      "utf8",
    );
    expect(source).toContain("/api/public/lab/quote-drafts");
    expect(source).not.toMatch(/fetch\s*\(/);
    expect(source).not.toMatch(/printingMethod/);
    expect(source).not.toContain("署名付き下書きトークン");
    expect(source).not.toMatch(/\/api\/public\/lab\/requests|\/api\/calculate/);
    expect(source).not.toMatch(/POUCH_QUOTE_DRAFT_SIGNING_KEY|node:crypto/);
  });

  it("chooses fill first and disables incompatible designs and sizes with Japanese help", async () => {
    const user = userEvent.setup();
    render(<EmbeddedQuoteDraftForm />);
    const form = screen.getByTestId("embedded-quote-draft-form");
    const fillGroup = within(form).getByTestId("quote-draft-fill-options");
    expect(fillGroup).toHaveTextContent("1g");
    expect(fillGroup).toHaveTextContent("2g");
    expect(fillGroup).toHaveTextContent("3g");
    expect(fillGroup).toHaveTextContent("5g");
    expect(fillGroup).toHaveTextContent("10g");
    expect(within(form).getByTestId("quote-draft-fill-custom")).toBeInTheDocument();
    expect(within(form).getByTestId("quote-draft-fill-help"))
      .toHaveTextContent("0.1g単位で直接入力もできます。");

    await user.click(within(form).getByRole("radio", { name: "5g" }));
    const craCard = within(form).getByRole("radio", { name: /丸形（CRA）/ });
    expect(craCard).toBeDisabled();
    expect(craCard.closest("label")).toHaveTextContent("5g非対応");
    expect(within(form).getByRole("radio", { name: "ラウンド 50×60" })).toBeChecked();

    await user.click(within(form).getByRole("radio", { name: "2g" }));
    expect(within(form).getByRole("radio", { name: "ラウンド 50×60" })).toBeChecked();
  });

  it("accepts custom fill amounts within the selected design capacity", async () => {
    const user = userEvent.setup();
    render(<EmbeddedQuoteDraftForm />);
    const custom = screen.getByTestId("quote-draft-fill-custom");

    await user.clear(custom);
    await user.type(custom, "4.5");
    expect(within(screen.getByTestId("embedded-quote-draft-form")).getByRole("radio", { name: /チューブ（TUA）/ })).toBeEnabled();
    expect(within(screen.getByTestId("embedded-quote-draft-form")).getByRole("radio", { name: /丸形（CRA）/ })).toBeDisabled();

    await user.clear(custom);
    await user.type(custom, "1.5");
    await user.click(within(screen.getByTestId("embedded-quote-draft-form")).getByRole("radio", { name: /丸形（CRA）/ }));
    expect(within(screen.getByTestId("embedded-quote-draft-form")).getByRole("radio", { name: "丸形 70×70" })).toBeEnabled();
  });

  it("constrains size and quantity by the selected design", async () => {
    const user = userEvent.setup();
    render(<EmbeddedQuoteDraftForm />);
    const form = screen.getByTestId("embedded-quote-draft-form");
    const quantity = within(form).getByLabelText(/希望数量/);

    const designRadios = within(form).getAllByRole("radio", { name: /（(?:RDA|TUA|BTA|CRA)）/ });
    expect(designRadios.map((radio) => radio.getAttribute("value"))).toEqual([
      "rda", "tua", "bta", "cra",
    ]);
    expect(within(form).getByRole("radio", { name: "ラウンド 50×60" })).toBeChecked();
    expect(quantity).toHaveValue(10_000);

    await user.click(within(form).getByRole("radio", { name: /丸形（CRA）/ }));
    expect(within(form).getByRole("radio", { name: "丸形 70×70" })).toBeChecked();
    expect(quantity).toHaveValue(10_000);
    expect(quantity).toHaveAttribute("max", "5000000");
  });

  it("keeps the existing consultation and sample form route intact", async () => {
    render(await LabPage({ searchParams: Promise.resolve({ requestType: "consultation" }) }));
    const consultationForm = document.querySelector("#lab-request-fields");
    expect(consultationForm).not.toBeNull();
    expect(screen.getByRole("tablist", { name: "依頼種別" })).toBeInTheDocument();

    const source = await readFile(
      path.join(projectRoot, "src/app/lab/lab-request-form.tsx"),
      "utf8",
    );
    expect(source).toContain("/api/public/lab/requests");
  });
});
