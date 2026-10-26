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

describe("embedded G004 quote draft form", () => {
  it("DRAFT-008A exposes five constrained customer fields and posts only to the draft route", async () => {
    render(await LabPage({ searchParams: Promise.resolve({}) }));
    const form = screen.getByTestId("embedded-quote-draft-form");

    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("action", "/api/public/lab/quote-drafts");
    const visibleFields = form.querySelectorAll("select, input:not([type='hidden'])");
    expect(visibleFields).toHaveLength(5);
    expect([...visibleFields].map((field) => field.getAttribute("name"))).toEqual([
      "designId",
      "sizeKey",
      "fillAmount",
      "colorCount",
      "quantity",
    ]);
    expect(form.querySelector("input[name='locale']")).toHaveValue("ja");
    expect(screen.getByRole("heading", { name: "条件だけ保存して後で再開" })).toBeInTheDocument();

    const source = await readFile(
      path.join(projectRoot, "src/app/lab/embedded-quote-draft-form.tsx"),
      "utf8",
    );
    expect(source).toContain("/api/public/lab/quote-drafts");
    expect(source).not.toMatch(/fetch\s*\(/);
    expect(source).not.toMatch(/\/api\/public\/lab\/requests|\/api\/calculate/);
    expect(source).not.toMatch(/POUCH_QUOTE_DRAFT_SIGNING_KEY|node:crypto/);
  });

  it("constrains size and quantity by the selected design", async () => {
    const user = userEvent.setup();
    render(<EmbeddedQuoteDraftForm />);
    const form = screen.getByTestId("embedded-quote-draft-form");

    const design = within(form).getByLabelText("デザイン");
    const size = within(form).getByLabelText("サイズ");
    const quantity = within(form).getByLabelText(/希望数量/);
    expect(size).toHaveValue("round-50x60");
    expect(quantity).toHaveValue(10_000);

    const designValues = [...(design as HTMLSelectElement).options].map((option) => option.value);
    expect(designValues).toEqual(["rda", "tua", "bta", "cra"]);
    expect(designValues).not.toContain("spa");
    expect(designValues).not.toContain("xra");
    expect(designValues).not.toContain("mow");
    await user.selectOptions(design, "cra");
    expect(size).toHaveValue("circle-70x70");
    expect(quantity).toHaveValue(10_000);
    expect(quantity).toHaveAttribute("max", "5000000");
  });

  it("keeps the existing consultation and sample form route intact", async () => {
    render(await LabPage({ searchParams: Promise.resolve({}) }));
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
