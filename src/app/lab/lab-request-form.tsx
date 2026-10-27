"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import { PUBLIC_LAB_CONSENT_VERSION } from "@/lib/public-lab";
import {
  publicLabRequestTypeOptions,
  type PublicLabRequestType,
} from "@/lib/public-lab-options";

import styles from "./page.module.css";

type ContactRequestType = Exclude<PublicLabRequestType, "quotation">;
type ApiConfirmation = {
  reference: string;
  requestType: ContactRequestType;
  message: string;
};
type ApiErrors = {
  errors?: readonly { field?: string; code?: string }[];
  error?: string;
};

const contactTypeOptions = publicLabRequestTypeOptions.filter(
  (option): option is typeof option & { value: ContactRequestType } => option.value !== "quotation",
);

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
  mustBeAccepted: "プライバシーポリシーへの同意は必須です。",
  mustBeEmpty: "この項目は入力できません。",
  mustBeTrue: "必須条件をご確認ください。",
};

const statusMessages: Record<string, string> = {
  invalid_json: "送信データを処理できませんでした。",
  request_too_large: "送信データが大きすぎます。",
  unsupported_media_type: "送信方式が正しくありません。",
  invalid_origin: "画面を再読み込みして再度お試しください。",
  submission_unavailable: "ただいま受け付けできません。しばらくしてから再度お試しください。",
};

function isApiConfirmation(value: unknown): value is ApiConfirmation {
  return typeof value === "object" && value !== null
    && ((value as { requestType?: unknown }).requestType === "consultation"
      || (value as { requestType?: unknown }).requestType === "sample")
    && typeof (value as { reference?: unknown }).reference === "string"
    && typeof (value as { message?: unknown }).message === "string";
}

export function LabRequestForm({
  initialRequestType = "consultation",
}: {
  initialRequestType?: ContactRequestType;
} = {}) {
  const [requestType, setRequestType] = useState<ContactRequestType>(initialRequestType);
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [summaryError, setSummaryError] = useState("");
  const [result, setResult] = useState<ApiConfirmation | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const tabRefs = useRef<Record<ContactRequestType, HTMLButtonElement | null>>({
    consultation: null,
    sample: null,
  });

  function changeRequestType(nextType: ContactRequestType) {
    setRequestType(nextType);
    setResult(null);
    setFieldErrors({});
    setSummaryError("");
    tabRefs.current[nextType]?.focus();
  }

  function handleTabKeys(event: KeyboardEvent<HTMLButtonElement>) {
    const values = contactTypeOptions.map((option) => option.value);
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
    if (!consentAccepted) errors.consentAccepted = "プライバシーポリシーへの同意は必須です。";
    setFieldErrors(errors);
    setSummaryError(Object.keys(errors).length > 0 ? "入力内容をご確認ください。" : "");
    return Object.keys(errors).length === 0;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (honeypot !== "") return;
    if (!validate()) return;

    const trimmedMessage = message.trim();
    setPending(true);
    setFieldErrors({});
    setSummaryError("");
    try {
      const response = await fetch("/api/public/lab/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestType,
          company: company.trim(),
          contactName: contactName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          ...(trimmedMessage === "" ? {} : { message: trimmedMessage }),
          consentVersion: PUBLIC_LAB_CONSENT_VERSION,
          consentAccepted: true,
          honeypot,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (response.ok && isApiConfirmation(payload)) {
        setResult(payload);
        resultHeadingRef.current?.focus();
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
    return (
      <section className={styles.result} aria-labelledby="lab-request-result-heading" role="status">
        <h3
          className={styles.resultTitle}
          id="lab-request-result-heading"
          ref={resultHeadingRef}
          tabIndex={-1}
        >{result.message}</h3>
        <p data-testid="request-reference">参照番号: {result.reference}</p>
      </section>
    );
  }

  const selectedTypeLabel = contactTypeOptions.find((option) => option.value === requestType)?.label;

  return (
    <div className={styles.formShell}>
      <div className={styles.tabs} role="tablist" aria-label="依頼種別">
        {contactTypeOptions.map((option) => {
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
          {pending ? "送信中です" : requestType === "consultation" ? "相談内容を送信する" : "サンプル依頼を送信する"}
        </button>
        <p className={styles.formNote}>依頼種別: {selectedTypeLabel}</p>
      </form>
    </div>
  );
}
