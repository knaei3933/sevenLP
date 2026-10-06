import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const publicApiPath = "/api/public/lab/requests";
const quoteDtoKeys = [
  "billedQuantity",
  "consultationCta",
  "createdAt",
  "currency",
  "deliveryNote",
  "exclusions",
  "grandTotal",
  "pricePerPiece",
  "reference",
  "requestSummary",
  "requestType",
  "requestedQuantity",
  "sampleCta",
  "serviceRouteLabel",
  "subtotal",
  "tax",
  "validUntil",
].sort();

async function fillLead(page: Page, email: string) {
  await page.getByTestId("lab-company").fill("G008株式会社");
  await page.getByTestId("lab-contact-name").fill("公開 太郎");
  await page.getByTestId("lab-email").fill(email);
  await page.getByTestId("lab-phone").fill("03-0000-0000");
}

test("keeps /lab and /lab/ anonymous and shows the Japanese public identity", async ({ page }) => {
  for (const path of ["/lab", "/lab/"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/lab\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "パウチ充填ラボ" })).toBeVisible();
    await expect(page.getByText("Epackage Labのパウチ充填専門サービス")).toBeVisible();
    await expect(page.getByRole("heading", { name: "ご検討の進め方" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "選ばれる理由" })).toBeVisible();
    const contact = page.getByRole("link", { name: "shapepouch@package-lab.com" });
    await expect(contact).toBeVisible();
    await expect(contact).toHaveAttribute("href", /mailto:shapepouch@package-lab\.com/);
    await expect(page.getByRole("tab", { name: "お見積もり" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "ご相談" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "サンプル" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quotation Suite" })).toHaveCount(0);
  }
});

test("releases a quotation only after a valid lead submission", async ({ page }, testInfo) => {
  const email = `g008-quote-${Date.now()}-${testInfo.project.name}@example.com`;
  await page.goto("/lab");

  await expect(page.getByLabel("サイズ")).toHaveValue("round-50x60");
  await expect(page.getByTestId("pre-gate-price-notice")).toContainText("最終価格は");
  await expect(page.getByTestId("released-grand-total")).toHaveCount(0);
  await expect(page.locator("#lab-quote")).not.toContainText("¥");

  await fillLead(page, email);
  await page.getByTestId("lab-submit").click();
  await expect(page.getByText("プライバシーポリシーへの同意は必須です。")).toBeVisible();
  await expect(page.getByTestId("lab-consent")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("released-grand-total")).toHaveCount(0);

  await page.getByTestId("lab-size").selectOption("round-60x100");
  await page.getByTestId("lab-quantity").fill("1000");
  await page.getByTestId("lab-fill").fill("2.5");
  await page.getByTestId("lab-chambers").selectOption("2");
  await page.getByTestId("lab-filling-method").selectOption("hopper");
  await page.getByTestId("lab-printing-method").selectOption("digital");
  await page.getByTestId("lab-color-count").fill("4");
  await page.getByTestId("lab-consent").check();

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes(publicApiPath) && response.status() === 201,
  );
  await page.getByTestId("lab-submit").click();
  const response = await responsePromise;
  const payload = await response.json();
  expect(Object.keys(payload)).toEqual(["quote"]);
  const quote = payload.quote;
  expect(Object.keys(quote).sort()).toEqual(quoteDtoKeys);
  expect(quote.requestType).toBe("quotation");
  expect(quote.grandTotal).toMatch(/^\d+(?:\.\d+)?$/);

  await expect(page.getByTestId("quote-reference")).toHaveText(quote.reference);
  await expect(page.getByTestId("released-grand-total")).toHaveText(`¥${quote.grandTotal}`);
  await expect(page.getByTestId("lab-submit")).toHaveCount(0);
});

test("accepts an anonymous consultation without releasing a quote", async ({ page }, testInfo) => {
  const email = `g008-consultation-${Date.now()}-${testInfo.project.name}@example.com`;
  await page.goto("/lab");
  await page.getByRole("tab", { name: "ご相談" }).click();
  await fillLead(page, email);
  await page.getByTestId("lab-message").fill("小ロットの充填条件を相談したいです。");
  await page.getByTestId("lab-consent").check();
  await page.getByTestId("lab-submit").click();

  await expect(page.getByRole("heading", { name: "受け付けました。担当からご連絡いたします。" })).toBeVisible();
  await expect(page.getByTestId("request-reference")).toContainText("参照番号:");
  await expect(page.getByTestId("released-grand-total")).toHaveCount(0);
});

test("accepts an anonymous sample request without releasing a quote", async ({ page }, testInfo) => {
  const email = `g008-sample-${Date.now()}-${testInfo.project.name}@example.com`;
  await page.goto("/lab");
  await page.getByRole("tab", { name: "サンプル" }).click();
  await fillLead(page, email);
  await page.getByTestId("lab-message").fill("サンプルを確認したいです。");
  await page.getByTestId("lab-consent").check();
  await page.getByTestId("lab-submit").click();

  await expect(page.getByRole("heading", { name: "受け付けました。担当からご連絡いたします。" })).toBeVisible();
  await expect(page.getByTestId("request-reference")).toContainText("参照番号:");
  await expect(page.getByTestId("released-grand-total")).toHaveCount(0);
});

test("redirects protected internal pages to login", async ({ page }) => {
  for (const pathname of ["/", "/quote", "/history", "/checklists/current", "/admin/users"]) {
    await page.goto(pathname);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(pathname).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("passes basic keyboard, label, and mobile accessibility checks", async ({ page }, testInfo) => {
  await page.goto("/lab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("tab", { name: "お見積もり" })).toBeFocused();

  const focusStyle = await page.getByRole("tab", { name: "お見積もり" }).evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
      outlineColor: style.outlineColor,
    };
  });
  expect(parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(3);
  expect(focusStyle.outlineStyle).toBe("solid");

  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "ご相談" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "ご相談" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "お見積もり" })).toHaveAttribute("aria-selected", "true");

  const unlabeledControls = await page
    .locator("input:not([type=hidden]), select, textarea")
    .evaluateAll((elements) => (elements as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[])
      .filter((element) => !element.closest("[aria-hidden='true']"))
      .filter((element) => {
        const accessibleName = element.getAttribute("aria-label") ?? element.getAttribute("aria-labelledby");
        return (element.labels?.length ?? 0) === 0 && !accessibleName;
      })
      .map((element) => element.id || element.name));
  expect(unlabeledControls).toEqual([]);

  await page.getByTestId("lab-submit").click();
  await expect(page.getByTestId("lab-summary-error")).toBeVisible();
  await expect(page.getByTestId("lab-company")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("lab-company")).toHaveAttribute("aria-describedby", "lab-company-error");

  if (testInfo.project.name === "public-anonymous-mobile") {
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      submitHeight: document.querySelector<HTMLElement>("button[type='submit']")?.getBoundingClientRect().height ?? 0,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
    expect(overflow.submitHeight).toBeGreaterThanOrEqual(48);
  }

  const ariaSnapshot = await page.locator("body").ariaSnapshot();
  expect(ariaSnapshot.length).toBeGreaterThan(100);
  const artifactDir = process.env.G008_ARTIFACT_DIR ?? join(process.cwd(), ".verification", "g008-e2e");
  await mkdir(artifactDir, { recursive: true });
  await writeFile(
    join(artifactDir, `public-lab-accessibility-${testInfo.project.name}.json`),
    JSON.stringify({
      url: page.url(),
      title: await page.title(),
      focus: focusStyle,
      labeledControls: true,
      keyboardTabs: true,
      errorAssociation: true,
      mobile: testInfo.project.name === "public-anonymous-mobile",
      ariaSnapshotBytes: ariaSnapshot.length,
      ariaSnapshot,
    }, null, 2),
  );
});
