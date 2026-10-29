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

async function fillSharedConditions(page: Page) {
  await page.getByTestId("lab-product-category").fill("スキンケア");
  await page.getByTestId("lab-use-case").fill("新製品サンプル");
}

async function fillSampleDelivery(page: Page) {
  await page.getByTestId("lab-product-name").fill("保湿美容液");
  await page.getByTestId("lab-recipient-name").fill("サンプル受取太郎");
  await page.getByTestId("lab-postal-code").fill("150-0001");
  await page.getByTestId("lab-prefecture").fill("東京都");
  await page.getByTestId("lab-address-line1").fill("渋谷区テスト1-2-3");
  await page.getByTestId("lab-delivery-phone").fill("03-0000-0000");
}

async function semanticAccessibilityEvidence(page: Page) {
  return page.evaluate(() => {
    const channels = (value: string) => {
      const match = value.match(/rgba?\(([^)]+)\)/)?.[1]?.split(",").map((part) => Number(part.trim())) ?? null;
      return match ? [...match.slice(0, 3), match[3] ?? 1] : null;
    };
    const luminance = ([red, green, blue]: number[]) => {
      const channel = (value: number) => {
        const normalized = value / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
    };
    const backgroundFor = (element: Element): HTMLElement => {
      let current = element as HTMLElement;
      while (current) {
        const background = channels(getComputedStyle(current).backgroundColor);
        if (background && background[3] > 0) return current;
        current = current.parentElement as HTMLElement;
      }
      return document.body;
    };
    const ratio = (element: Element) => {
      const style = getComputedStyle(element);
      const foreground = channels(style.color);
      const background = channels(getComputedStyle(backgroundFor(element)).backgroundColor);
      if (!foreground || !background) return 0;
      const first = luminance(foreground);
      const second = luminance(background);
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    };
    const headingLevels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
      .filter((element) => (element as HTMLElement).offsetParent !== null)
      .map((element) => Number(element.tagName.charAt(1)));
    const invalidHeadingJumps = headingLevels.filter((level, index) => index > 0 && level - headingLevels[index - 1] > 1);
    const sample = [
      ...document.querySelectorAll<HTMLElement>("[class*='sectionLead']"),
      ...document.querySelectorAll<HTMLElement>("[class*='featureList'] span"),
    ].slice(0, 3);
    const submit = document.querySelector<HTMLButtonElement>("button[type='submit']");
    if (submit) sample.push(submit);

    return {
      mainCount: document.querySelectorAll("main").length,
      bannerCount: document.querySelectorAll("header").length,
      contentInfoCount: document.querySelectorAll("footer").length,
      headingCount: headingLevels.length,
      invalidHeadingJumps,
      contrast: sample.map((element) => ({
        text: element.textContent?.trim().slice(0, 40) ?? "",
        ratio: Number(ratio(element).toFixed(2)),
      })),
    };
  });
}

test("keeps /, /lab, and /lab/ anonymous and shows the Japanese public identity", async ({ page }) => {
  for (const path of ["/", "/lab", "/lab/"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/^(?:.*\/|.*\/lab\/?)$/);
    await expect(page.getByRole("heading", { level: 1, name: "化粧品の液剤を、小容量パウチに1万枚から充填。" })).toBeVisible();
    await expect(page.getByText("Epackage Labのパウチ充填専門サービス").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "仕様の見極めから納品条件まで" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "充填条件を確定しやすくする体制" })).toBeVisible();
    const contact = page.getByRole("link", { name: "shapepouch@package-lab.com" });
    await expect(contact).toBeVisible();
    await expect(contact).toHaveAttribute("href", /mailto:shapepouch@package-lab\.com/);
    await expect(page.getByRole("tab", { name: "ご相談" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "サンプル" })).toBeVisible();
    await expect(page.getByTestId("embedded-quote-draft-form")).toBeVisible();
    await expect(page.getByRole("heading", { name: "必要条件だけ入力して見積もりを開始" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "お見積もり" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Quotation Suite" })).toHaveCount(0);
  }
});

test("accepts an anonymous consultation without releasing a quote", async ({ page }, testInfo) => {
  const email = `g008-consultation-${Date.now()}-${testInfo.project.name}@example.com`;
  await page.goto("/lab?requestType=consultation#lab-request");
  await expect(page.getByRole("tab", { name: "ご相談" })).toHaveAttribute("aria-selected", "true");
  await fillLead(page, email);
  await fillSharedConditions(page);
  await page.getByTestId("lab-message").fill("小ロットの充填条件を相談したいです。");
  await page.getByTestId("lab-consent").check();
  await page.getByTestId("lab-submit").click();

  await expect(page.getByRole("heading", { name: "受け付けました。担当からご連絡いたします。" })).toBeVisible();
  await expect(page.getByTestId("request-reference")).toContainText("参照番号:");
  await expect(page.getByTestId("released-grand-total")).toHaveCount(0);
});

test("accepts an anonymous sample request without releasing a quote", async ({ page }, testInfo) => {
  const email = `g008-sample-${Date.now()}-${testInfo.project.name}@example.com`;
  await page.goto("/lab?requestType=sample#lab-request");
  await expect(page.getByRole("tab", { name: "サンプル" })).toHaveAttribute("aria-selected", "true");
  await fillLead(page, email);
  await fillSharedConditions(page);
  await fillSampleDelivery(page);
  await page.getByTestId("lab-message").fill("サンプルを確認したいです。");
  await page.getByTestId("lab-consent").check();
  await page.getByTestId("lab-submit").click();

  await expect(page.getByRole("heading", { name: "受け付けました。担当からご連絡いたします。" })).toBeVisible();
  await expect(page.getByTestId("request-reference")).toContainText("参照番号:");
  await expect(page.getByTestId("released-grand-total")).toHaveCount(0);
});

test("issues a guest quote draft transport redirect in a URL fragment", async ({ page }) => {
  await page.goto("/lab");
  const form = page.getByTestId("embedded-quote-draft-form");
  await expect(form).toHaveAttribute("action", "/api/public/lab/quote-drafts");
  await expect(form.locator("input:not([type=hidden])")).toHaveCount(28);

  const response = await page.request.post("http://127.0.0.1:3100/api/public/lab/quote-drafts", {
    maxRedirects: 0,
    headers: { origin: "http://127.0.0.1:3100" },
    form: {
      colorCount: "2",
      designId: "rda",
      fillAmount: "1",
      locale: "ja",
      quantity: "10000",
      sizeKey: "round-60x80",
    },
  });
  expect(response.status()).toBe(303);
  const location = response.headersArray().find((header) => header.name.toLowerCase() === "location")?.value;
  expect(location).toMatch(/^http:\/\/(?:localhost|127\.0\.0\.1):4400\/portal\/quotes\/new#quoteDraft=/);

  const destination = new URL(location!);
  expect(destination.pathname).toBe("/portal/quotes/new");
  expect(destination.search).toBe("");
  expect(destination.searchParams.size).toBe(0);
  expect(destination.hash.length).toBeGreaterThan("#quoteDraft=".length);
});

test("redirects protected internal pages to login", async ({ page }) => {
  for (const pathname of ["/quote", "/history", "/checklists/current", "/admin/users"]) {
    await page.goto(pathname);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(pathname).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("passes basic keyboard, label, and mobile accessibility checks", async ({ page }, testInfo) => {
  await page.goto("/lab?requestType=sample#lab-request");
  const sampleTab = page.getByRole("tab", { name: "サンプル" });
  await sampleTab.focus();
  await expect(sampleTab).toBeFocused();

  const focusStyle = await sampleTab.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
      outlineColor: style.outlineColor,
    };
  });
  expect(parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(3);
  expect(focusStyle.outlineStyle).toBe("solid");

  await page.keyboard.press("ArrowLeft");
  const consultationTab = page.getByRole("tab", { name: "ご相談" });
  await expect(consultationTab).toBeFocused();
  await expect(consultationTab).toHaveAttribute("aria-selected", "true");

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

  const semanticAccessibility = await semanticAccessibilityEvidence(page);
  expect(semanticAccessibility.mainCount).toBe(1);
  expect(semanticAccessibility.bannerCount).toBe(1);
  expect(semanticAccessibility.contentInfoCount).toBe(1);
  expect(semanticAccessibility.headingCount).toBeGreaterThan(4);
  expect(semanticAccessibility.invalidHeadingJumps).toEqual([]);
  for (const item of semanticAccessibility.contrast.slice(0, 3)) {
    expect(item.ratio).toBeGreaterThanOrEqual(4.5);
  }
  if (semanticAccessibility.contrast.length > 3) {
    expect(semanticAccessibility.contrast.at(-1)?.ratio).toBeGreaterThanOrEqual(3);
  }

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
  const artifactDir = process.env.G009_ARTIFACT_DIR ?? join(process.cwd(), ".verification", "g009-e2e");
  await mkdir(artifactDir, { recursive: true });
  await writeFile(
    join(artifactDir, `public-lab-accessibility-${testInfo.project.name}.json`),
    JSON.stringify({
      url: page.url(),
      title: await page.title(),
      focus: focusStyle,
      semanticAccessibility,
      labeledControls: true,
      keyboardTabs: true,
      errorAssociation: true,
      mobile: testInfo.project.name === "public-anonymous-mobile",
      ariaSnapshotBytes: ariaSnapshot.length,
      ariaSnapshot,
    }, null, 2),
  );
});

test("captures shared LP design evidence at 390, 768, and 1440 pixels", async ({ page }) => {
  test.skip(test.info().project.name !== "public-anonymous", "Evidence loop controls all viewports explicitly.");
  const widths = [390, 768, 1440] as const;
  const evidence: Record<string, unknown>[] = [];
  const artifactDir = join(process.cwd(), ".verification", "g006-evidence");
  await mkdir(artifactDir, { recursive: true });

  for (const width of widths) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : width === 768 ? 1024 : 900 });
    await page.goto("/lab");
    await page.locator("#lab-quote").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("embedded-quote-draft-form")).toBeVisible();

    const metrics = await page.evaluate(() => ({
      path: location.pathname,
      viewport: { width: innerWidth, height: innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      smallControls: [...document.querySelectorAll("a[href], button:not([disabled]), input:not([type=hidden]), select, textarea, summary")]
        .map((element) => {
          const target = element instanceof HTMLInputElement && (element.type === "radio" || element.type === "checkbox")
            ? element.closest("label") ?? element
            : element;
          return {
            tag: element.tagName.toLowerCase(),
            text: element.textContent?.trim().slice(0, 80) ?? "",
            height: target.getBoundingClientRect().height,
          };
        })
        .filter((item) => item.height > 0 && item.height < 44),
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.smallControls).toEqual([]);
    evidence.push(metrics);
    await page.screenshot({
      path: join(artifactDir, `public-lp-${width}.png`),
      fullPage: true,
    });
  }

  await writeFile(join(artifactDir, "public-lp-metrics.json"), `${JSON.stringify(evidence, null, 2)}\n`);
});
