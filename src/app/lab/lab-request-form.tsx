"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { PUBLIC_LAB_CONSENT_VERSION } from "@/lib/public-lab";
import {
  publicLabFillingMethodOptions,
  publicLabPrintingMethodOptions,
  publicLabRequestTypeOptions,
  publicLabSizeOptions,
  type PublicLabFillingMethod,
  type PublicLabPrintingMethod,
  type PublicLabRequestType,
} from "@/lib/public-lab-options";

import styles from "./page.module.css";

type ApiQuote = {
  reference: string;
  requestType: "quotation";
  createdAt: string;
  validUntil: string;
  requestSummary: string;
  serviceRouteLabel: string;
  requestedQuantity: string;
  billedQuantity: string;
  currency: "JPY";
  pricePerPiece: string;
  subtotal: string;
  tax: string;
  grandTotal: string;
  exclusions: string[];
  deliveryNote: string;
  consultationCta: string;
  sampleCta: string;
};

type ApiConfirmation = {
  reference: string;
  requestType: "consultation" | "sample";
  message: string;
};

type ApiErrors = {
  errors?: readonly { field?: string; code?: string }[];
  error?: string;
};

type TechnicalForm = {
  sizeKey: string;
  quantity: string;
  fillMlPerChamber: string;
  connectedChambers: string;
  fillingMethod: PublicLabFillingMethod;
  printingMethod: PublicLabPrintingMethod;
  colorCount: string;
};

const initialTechnical: TechnicalForm = {
  sizeKey: publicLabSizeOptions[0].key,
  quantity: "1000",
  fillMlPerChamber: "1",
  connectedChambers: "1",
  fillingMethod: publicLabFillingMethodOptions[0].value,
  printingMethod: publicLabPrintingMethodOptions[0].value,
  colorCount: "1",
};

const errorMessages: Record<string, string> = {
  invalidRequest: "送信内容を処理できません。",
  invalidType: "入力形式が正しくありません。",
  invalidValue: "選択した値が正しくありません。",
  tooShort: "文字数が不足しています。",
  tooLong: "文字数が上限を超えています。",
  controlCharacter: "使用できない文字が含まれています。",
  invalidEmail: "メールアドレスの形式を確認してください。",
  invalidPhone: "電話番号の形式を確認してください。",
  unknownField: "送信できない項目が含まれています。",
  notAllowedForRequestType: "この依頼種別では送信できない項目があります。",
  invalidInteger: "整数で入力してください。",
  tooManyDecimalPlaces: "小数点以下は2桁以内で入力してください。",
  outOfRange: "入力できる範囲をご確認ください。",
  mustBeAccepted: "プライバシーポリシーへの同意は必須です。",
  mustBeEmpty: "この項目は入力できません。",
  mustBeTrue: "必須条件をご確認ください。",
};

const statusMessages: Record<string, string> = {
  invalid_json: "送信データを処理できませんでした。",
  request_too_large: "送信データが大きすぎます。",
  unsupported_media_type: "送信方式が正しくありません。",
  invalid_origin: "画面を再読み込みして再度お試しください。",
  quotation_unavailable: "ただいま見積もりを発行できません。しばらくしてから再度お試しください。",
  submission_unavailable: "ただいま受け付けできません。しばらくしてから再度お試しください。",
};

function isApiQuote(value: unknown): value is ApiQuote {
  return typeof value === "object" && value !== null
    && (value as { requestType?: unknown }).requestType === "quotation"
    && typeof (value as { reference?: unknown }).reference === "string"
    && typeof (value as { grandTotal?: unknown }).grandTotal === "string";
}

function isApiConfirmation(value: unknown): value is ApiConfirmation {
  return typeof value === "object" && value !== null
    && ((value as { requestType?: unknown }).requestType === "consultation"
      || (value as { requestType?: unknown }).requestType === "sample")
    && typeof (value as { reference?: unknown }).reference === "string";
}

function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime())
    ? isoDate
    : date.toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" });
}

export function LabRequestForm() {
  const [requestType, setRequestType] = useState<PublicLabRequestType>("quotation");
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [technical, setTechnical] = useState<TechnicalForm>(initialTechnical);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [summaryError, setSummaryError] = useState("");
  const [result, setResult] = useState<ApiQuote | ApiConfirmation | null>(null);
  const quoteResultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const tabRefs = useRef<Record<PublicLabRequestType, HTMLButtonElement | null>>({
    quotation: null,
    consultation: null,
    sample: null,
  });

  const quantity = Number(technical.quantity);
  const fillMl = Number(technical.fillMlPerChamber);
  const chambers = Number(technical.connectedChambers);
  const colorCount = Number(technical.colorCount);
  const sizeLabel = publicLabSizeOptions.find((option) => option.key === technical.sizeKey)?.label ?? "";
  const fillingLabel = publicLabFillingMethodOptions.find((option) => option.value === technical.fillingMethod)?.label ?? "";
  const printingLabel = publicLabPrintingMethodOptions.find((option) => option.value === technical.printingMethod)?.label ?? "";

  useEffect(() => {
    if (result?.requestType === "quotation") quoteResultHeadingRef.current?.focus();
  }, [result]);

  function changeRequestType(nextType: PublicLabRequestType) {
    setRequestType(nextType);
    setResult(null);
    setFieldErrors({});
    setSummaryError("");
    tabRefs.current[nextType]?.focus();
  }

  function handleTabKeys(event: KeyboardEvent<HTMLButtonElement>) {
    const values = publicLabRequestTypeOptions.map((option) => option.value);
    const currentIndex = values.indexOf(requestType);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % values.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + values.length) % values.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = values.length - 1;
    if (nextIndex !== currentIndex) {
      event.preventDefault();
      changeRequestType(values[nextIndex]);
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    for (const [field, value, label] of [
      ["company", company, "会社名"],
      ["contactName", contactName, "お名前"],
      ["email", email, "メールアドレス"],
      ["phone", phone, "電話番号"],
    ] as const) {
      if (value.trim() === "") errors[field] = `${label}を入力してください。`;
    }
    if (email.trim() !== "" && !email.includes("@")) {
      errors.email = "メールアドレスの形式を確認してください。";
    }
    if (requestType === "quotation") {
      if (!Number.isInteger(quantity) || quantity < 500 || quantity > 1_000_000) {
        errors.quantity = "数量は500〜1,000,000枚の整数で入力してください。";
      }
      if (!Number.isFinite(fillMl) || fillMl < 0.5 || fillMl > 20) {
        errors.fillMlPerChamber = "充填量は0.5〜20mLで入力してください。";
      }
      if (!Number.isInteger(chambers) || chambers < 1 || chambers > 4) {
        errors.connectedChambers = "チャンバー数は1〜4で選択してください。";
      }
      if (!Number.isInteger(colorCount) || colorCount < 1 || colorCount > 10) {
        errors.colorCount = "色数は1〜10の整数で入力してください。";
      }
    }
    if (!consentAccepted) errors.consentAccepted = "プライバシーポリシーへの同意は必須です。";

    setFieldErrors(errors);
    setSummaryError(Object.keys(errors).length === 0 ? "" : "入力内容をご確認ください。");
    return Object.keys(errors).length === 0;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (honeypot !== "") return;
    if (!validate()) return;

    const trimmedMessage = message.trim();
    const base = {
      requestType,
      company: company.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      ...(trimmedMessage === "" ? {} : { message: trimmedMessage }),
      consentVersion: PUBLIC_LAB_CONSENT_VERSION,
      consentAccepted: true,
      honeypot,
    };
    const body = requestType === "quotation"
      ? {
        ...base,
        sizeKey: technical.sizeKey,
        quantity,
        fillMlPerChamber: fillMl,
        connectedChambers: chambers,
        fillingMethod: technical.fillingMethod,
        printingMethod: technical.printingMethod,
        colorCount,
        bulkSupplied: true,
      }
      : base;

    setPending(true);
    setFieldErrors({});
    setSummaryError("");
    try {
      const response = await fetch("/api/public/lab/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const rawPayload: unknown = await response.json().catch(() => null);
      const payload = typeof rawPayload === "object" && rawPayload !== null && "quote" in rawPayload
        ? (rawPayload as { quote: unknown }).quote
        : rawPayload;

      if (response.ok && isApiQuote(payload)) {
        setResult(payload);
        return;
      }
      if (response.ok && isApiConfirmation(payload)) {
        setResult(payload);
        return;
      }

      const apiPayload = typeof payload === "object" && payload !== null ? payload as ApiErrors : {};
      const nextFieldErrors: Record<string, string> = {};
      for (const item of apiPayload.errors ?? []) {
        if (item.field && item.code) nextFieldErrors[item.field] = errorMessages[item.code] ?? "入力内容をご確認ください。";
      }
      setFieldErrors(nextFieldErrors);
      setSummaryError(
        Object.keys(nextFieldErrors).length > 0
          ? "入力内容をご確認ください。"
          : statusMessages[apiPayload.error ?? ""] ?? "送信できませんでした。しばらくしてから再度お試しください。",
      );
    } catch {
      setSummaryError("通信できませんでした。ネットワーク状況をご確認ください。");
    } finally {
      setPending(false);
    }
  }

  const fieldErrorProps = (field: string) => ({
    id: `lab-${field}`,
    "aria-invalid": fieldErrors[field] === undefined ? undefined : true,
    "aria-describedby": fieldErrors[field] === undefined ? undefined : `lab-${field}-error`,
  });

  const errorText = (field: string) => fieldErrors[field]
    ? <p id={`lab-${field}-error`} className={styles.fieldError}>{fieldErrors[field]}</p>
    : null;

  if (result) {
    return isApiQuote(result) ? (
      <section className={styles.result} aria-labelledby="lab-quote-result-heading" role="status">
        <h3
          className={styles.resultTitle}
          id="lab-quote-result-heading"
          ref={quoteResultHeadingRef}
          tabIndex={-1}
        >お見積りが発行されました</h3>
        <dl className={styles.resultGrid}>
          <div><dt>参照番号</dt><dd data-testid="quote-reference">{result.reference}</dd></div>
          <div><dt>発行日時</dt><dd>{formatDateTime(result.createdAt)}</dd></div>
          <div><dt>有効期限</dt><dd>{formatDateTime(result.validUntil)}</dd></div>
          <div><dt>お見積内容</dt><dd>{result.requestSummary}</dd></div>
          <div><dt>サービス</dt><dd>{result.serviceRouteLabel}</dd></div>
          <div><dt>希望数量</dt><dd>{result.requestedQuantity}枚</dd></div>
          <div><dt>請求数量</dt><dd>{result.billedQuantity}枚</dd></div>
          <div><dt>通貨</dt><dd>{result.currency}</dd></div>
          <div><dt>単価</dt><dd data-testid="released-price-per-piece">&yen;{result.pricePerPiece}</dd></div>
          <div><dt>小計</dt><dd data-testid="released-subtotal">&yen;{result.subtotal}</dd></div>
          <div><dt>消費税</dt><dd data-testid="released-tax">&yen;{result.tax}</dd></div>
          <div><dt>税込合計</dt><dd data-testid="released-grand-total">&yen;{result.grandTotal}</dd></div>
        </dl>
        <ul>
          {result.exclusions.map((exclusion) => <li key={exclusion}>{exclusion}</li>)}
        </ul>
        <p>{result.deliveryNote}</p>
        <p>{result.consultationCta}</p>
        <p>{result.sampleCta}</p>
      </section>
    ) : (
      <section className={styles.result} aria-labelledby="lab-request-result-heading" role="status">
        <h3 className={styles.resultTitle} id="lab-request-result-heading">{result.message}</h3>
        <p data-testid="request-reference">参照番号: {result.reference}</p>
      </section>
    );
  }

  const selectedTypeLabel = publicLabRequestTypeOptions.find((option) => option.value === requestType)?.label;

  return (
    <div className={styles.formShell}>
      <div className={styles.tabs} role="tablist" aria-label="依頼種別">
        {publicLabRequestTypeOptions.map((option) => {
          const selected = option.value === requestType;
          return (
            <button
              key={option.value}
              ref={(element) => { tabRefs.current[option.value] = element; }}
              id={`lab-tab-${option.value}`}
              className={selected ? styles.selectedTab : styles.tab}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="lab-request-fields"
              tabIndex={selected ? 0 : -1}
              onClick={() => changeRequestType(option.value)}
              onKeyDown={handleTabKeys}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <form
        id="lab-request-fields"
        className={styles.form}
        role="tabpanel"
        aria-labelledby={`lab-tab-${requestType}`}
        noValidate
        onSubmit={submit}
      >
        {summaryError && (
          <p className={styles.summaryError} data-testid="lab-summary-error" role="alert">{summaryError}</p>
        )}

        {requestType === "quotation" && (
          <>
            <div className={styles.configuration} role="group" aria-label="現在のご依頼条件">
              <h3 className={styles.configTitle}>現在のご依頼条件</h3>
              <dl className={styles.configurationGrid}>
                <div><dt>サイズ</dt><dd>{sizeLabel}</dd></div>
                <div><dt>数量</dt><dd>{quantity.toLocaleString("ja-JP")}枚</dd></div>
                <div><dt>充填量</dt><dd>{fillMl}mL</dd></div>
                <div><dt>チャンバー数</dt><dd>{chambers}室</dd></div>
                <div><dt>充填方法</dt><dd>{fillingLabel}</dd></div>
                <div><dt>印刷方法</dt><dd>{printingLabel}</dd></div>
                <div><dt>色数</dt><dd>{colorCount}色</dd></div>
              </dl>
              <p className={styles.priceNotice} data-testid="pre-gate-price-notice">
                最終価格は、リード情報の送信完了後に表示します。
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="lab-sizeKey">サイズ</label>
              <select
                {...fieldErrorProps("sizeKey")}
                data-testid="lab-size"
                value={technical.sizeKey}
                onChange={(event) => setTechnical((current) => ({ ...current, sizeKey: event.target.value }))}
              >
                {publicLabSizeOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
              </select>
              {errorText("sizeKey")}
            </div>

            <div className={styles.field}>
              <label htmlFor="lab-quantity">数量（枚）</label>
              <input
                {...fieldErrorProps("quantity")}
                data-testid="lab-quantity"
                type="number"
                inputMode="numeric"
                min={500}
                max={1_000_000}
                step={1}
                value={technical.quantity}
                onChange={(event) => setTechnical((current) => ({ ...current, quantity: event.target.value }))}
              />
              {errorText("quantity")}
            </div>

            <div className={styles.field}>
              <label htmlFor="lab-fillMlPerChamber">充填量（1室あたり/mL）</label>
              <input
                {...fieldErrorProps("fillMlPerChamber")}
                data-testid="lab-fill"
                type="number"
                inputMode="decimal"
                min={0.5}
                max={20}
                step={0.01}
                value={technical.fillMlPerChamber}
                onChange={(event) => setTechnical((current) => ({ ...current, fillMlPerChamber: event.target.value }))}
              />
              {errorText("fillMlPerChamber")}
            </div>

            <div className={styles.field}>
              <label htmlFor="lab-connectedChambers">チャンバー数</label>
              <select
                {...fieldErrorProps("connectedChambers")}
                data-testid="lab-chambers"
                value={technical.connectedChambers}
                onChange={(event) => setTechnical((current) => ({ ...current, connectedChambers: event.target.value }))}
              >
                {[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              {errorText("connectedChambers")}
            </div>

            <div className={styles.field}>
              <label htmlFor="lab-fillingMethod">充填方法</label>
              <select
                {...fieldErrorProps("fillingMethod")}
                data-testid="lab-filling-method"
                value={technical.fillingMethod}
                onChange={(event) => setTechnical((current) => ({
                  ...current,
                  fillingMethod: event.target.value as PublicLabFillingMethod,
                }))}
              >
                {publicLabFillingMethodOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errorText("fillingMethod")}
            </div>

            <div className={styles.field}>
              <label htmlFor="lab-printingMethod">印刷方法</label>
              <select
                {...fieldErrorProps("printingMethod")}
                data-testid="lab-printing-method"
                value={technical.printingMethod}
                onChange={(event) => setTechnical((current) => ({
                  ...current,
                  printingMethod: event.target.value as PublicLabPrintingMethod,
                }))}
              >
                {publicLabPrintingMethodOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errorText("printingMethod")}
            </div>

            <div className={styles.field}>
              <label htmlFor="lab-colorCount">色数</label>
              <input
                {...fieldErrorProps("colorCount")}
                data-testid="lab-color-count"
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                step={1}
                value={technical.colorCount}
                onChange={(event) => setTechnical((current) => ({ ...current, colorCount: event.target.value }))}
              />
              {errorText("colorCount")}
            </div>

            <p className={styles.bulkNote}>バルク（中身）: お客様支給</p>
          </>
        )}

        <div className={styles.field}>
          <label htmlFor="lab-company">会社名</label>
          <input
            {...fieldErrorProps("company")}
            data-testid="lab-company"
            type="text"
            name="company"
            autoComplete="organization"
            required
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
          {errorText("company")}
        </div>

        <div className={styles.field}>
          <label htmlFor="lab-contactName">お名前</label>
          <input
            {...fieldErrorProps("contactName")}
            data-testid="lab-contact-name"
            type="text"
            name="contactName"
            autoComplete="name"
            required
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
          />
          {errorText("contactName")}
        </div>

        <div className={styles.field}>
          <label htmlFor="lab-email">メールアドレス</label>
          <input
            {...fieldErrorProps("email")}
            data-testid="lab-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {errorText("email")}
        </div>

        <div className={styles.field}>
          <label htmlFor="lab-phone">電話番号</label>
          <input
            {...fieldErrorProps("phone")}
            data-testid="lab-phone"
            type="tel"
            name="phone"
            autoComplete="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          {errorText("phone")}
        </div>

        <div className={styles.field}>
          <label htmlFor="lab-message">ご相談内容（任意）</label>
          <textarea
            id="lab-message"
            data-testid="lab-message"
            name="message"
            rows={4}
            maxLength={2_000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>

        <div className={styles.consent}>
          <input
            {...fieldErrorProps("consentAccepted")}
            data-testid="lab-consent"
            id="lab-consentAccepted"
            type="checkbox"
            required
            checked={consentAccepted}
            onChange={(event) => setConsentAccepted(event.target.checked)}
          />
          <label htmlFor="lab-consentAccepted">
            プライバシーポリシーに同意し、お客様情報をお問い合わせ対応に利用することに同意します（必須）。
          </label>
          {errorText("consentAccepted")}
        </div>

        <div hidden aria-hidden="true">
          <label htmlFor="lab-honeypot">入力しないでください</label>
          <input
            id="lab-honeypot"
            data-testid="lab-honeypot"
            type="text"
            name="honeypot"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </div>

        <button className={styles.submit} data-testid="lab-submit" type="submit" disabled={pending}>
          {pending ? "送信中です" : requestType === "quotation" ? "リード情報を送信して価格を確認する" : "送信する"}
        </button>
        <p className={styles.formNote}>依頼種別: {selectedTypeLabel}</p>
      </form>
    </div>
  );
}
