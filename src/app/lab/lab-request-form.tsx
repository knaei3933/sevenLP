"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import { PUBLIC_LAB_CONSENT_VERSION } from "@/lib/public-lab";
import {
  publicLabConsultationTopics,
  publicLabDevelopmentStageOptions,
  publicLabDesiredTimingOptions,
  publicLabPlannedQuantityOptions,
  publicLabRequestTypeOptions,
  publicLabSampleShapes,
  publicLabSampleTypes,
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
const consultationTopicValues = publicLabConsultationTopics.map((option) => option.value);
const sampleShapeValues = publicLabSampleShapes.map((option) => option.value);
const sampleTypeValues = publicLabSampleTypes.map((option) => option.value);
const developmentStageValues = publicLabDevelopmentStageOptions.map((option) => option.value);
const plannedQuantityValues = publicLabPlannedQuantityOptions.map((option) => option.value);
const desiredTimingValues = publicLabDesiredTimingOptions.map((option) => option.value);
const POSTAL_CODE_PATTERN = /^\d{3}-?\d{4}$/;

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
  requiredField: "入力してください。",
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

function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label className={styles.requiredLabel} htmlFor={htmlFor}>
      {children}
      <span aria-hidden="true" className={styles.requiredMark}>必須</span>
    </label>
  );
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
  const [inquiryTopic, setInquiryTopic] = useState("shape_size");
  const [productCategory, setProductCategory] = useState("");
  const [useCase, setUseCase] = useState("");
  const [developmentStage, setDevelopmentStage] = useState("idea");
  const [plannedQuantity, setPlannedQuantity] = useState("undetermined");
  const [desiredTiming, setDesiredTiming] = useState("undetermined");
  const [sampleShapes, setSampleShapes] = useState<string[]>(["rda"]);
  const [sampleType, setSampleType] = useState("blank_pouch");
  const [sampleQuantity, setSampleQuantity] = useState(1);
  const [productName, setProductName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
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

  function toggleSampleShape(value: string) {
    setSampleShapes((current) => (
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    ));
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
    const required: Array<[string, string, string]> = [
      ["company", company, "会社名"],
      ["contactName", contactName, "お名前"],
      ["email", email, "メールアドレス"],
      ["phone", phone, "電話番号"],
      ["productCategory", productCategory, "製品カテゴリ"],
      ["useCase", useCase, "用途"],
    ];
    for (const [field, value, label] of required) {
      if (value.trim() === "") errors[field] = `${label}を入力してください。`;
    }
    if (email.trim() !== "" && !email.includes("@")) {
      errors.email = "メールアドレスの形式を確認してください。";
    }
    if (requestType === "sample") {
      if (sampleShapes.length === 0) errors.sampleShapes = "希望サンプル形状を選択してください。";
      if (productName.trim() === "") errors.productName = "製品・内容物名を入力してください。";
      if (!Number.isInteger(sampleQuantity) || sampleQuantity < 1 || sampleQuantity > 20) {
        errors.sampleQuantity = "サンプル点数は1〜20点で入力してください。";
      }
      if (recipientName.trim() === "") errors.recipientName = "受取人名を入力してください。";
      if (postalCode.trim() === "") errors.postalCode = "郵便番号を入力してください。";
      else if (!POSTAL_CODE_PATTERN.test(postalCode.trim())) errors.postalCode = "郵便番号は7桁で入力してください。";
      if (prefecture.trim() === "") errors.prefecture = "都道府県を入力してください。";
      if (addressLine1.trim() === "") errors.addressLine1 = "市区町村・番地を入力してください。";
      if (deliveryPhone.trim() === "") errors.deliveryPhone = "配送先電話番号を入力してください。";
      else if (!/^[0-9+(). -]+$/.test(deliveryPhone.trim()) || !/\d/.test(deliveryPhone)) {
        errors.deliveryPhone = "配送先電話番号の形式を確認してください。";
      }
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
          productCategory: productCategory.trim(),
          useCase: useCase.trim(),
          plannedQuantity,
          desiredTiming,
          ...(trimmedMessage === "" ? {} : { message: trimmedMessage }),
          ...(requestType === "consultation" ? {
            inquiryTopic,
            developmentStage,
          } : {
            sampleShapes,
            sampleType,
            sampleQuantity,
            productName: productName.trim(),
            recipientName: recipientName.trim(),
            postalCode: postalCode.trim(),
            prefecture: prefecture.trim(),
            addressLine1: addressLine1.trim(),
            ...(addressLine2.trim() === "" ? {} : { addressLine2: addressLine2.trim() }),
            deliveryPhone: deliveryPhone.trim(),
            ...(deliveryNotes.trim() === "" ? {} : { deliveryNotes: deliveryNotes.trim() }),
          }),
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
      <section className={styles.requestResult} aria-labelledby="lab-request-result-heading" role="status">
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

  return (
    <div className={styles.requestBody}>
      <div className={styles.requestTabs} role="tablist" aria-label="依頼種別">
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
        className={styles.requestForm}
        role="tabpanel"
        aria-labelledby={`lab-tab-${requestType}`}
        noValidate
        onSubmit={submit}
      >
        {summaryError && (
          <p className={styles.summaryError} data-testid="lab-summary-error" role="alert">{summaryError}</p>
        )}

        <fieldset className={styles.detailField}>
          <legend className={styles.detailLegend}>01 会社・ご担当者</legend>
          <div className={styles.contactGrid}>
            <div className={styles.field}>
              <RequiredLabel htmlFor="lab-company">会社名</RequiredLabel>
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
              <RequiredLabel htmlFor="lab-contactName">お名前</RequiredLabel>
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
              <RequiredLabel htmlFor="lab-email">メールアドレス</RequiredLabel>
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
              <RequiredLabel htmlFor="lab-phone">電話番号</RequiredLabel>
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
          </div>
        </fieldset>

        {requestType === "consultation" ? (
          <fieldset className={styles.detailField}>
            <legend className={styles.detailLegend}>02 ご相談条件</legend>
            <div className={styles.detailGrid}>
              <div className={styles.field}>
                <RequiredLabel htmlFor="lab-inquiryTopic">ご相談テーマ</RequiredLabel>
                <select
                  {...fieldErrorProps("inquiryTopic")}
                  data-testid="lab-inquiry-topic"
                  id="lab-inquiryTopic"
                  name="inquiryTopic"
                  required
                  value={inquiryTopic}
                  onChange={(event) => setInquiryTopic(event.target.value)}
                >
                  {publicLabConsultationTopics.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errorText("inquiryTopic")}
              </div>
              <div className={styles.field}>
                <RequiredLabel htmlFor="lab-developmentStage">段階</RequiredLabel>
                <select
                  {...fieldErrorProps("developmentStage")}
                  data-testid="lab-development-stage"
                  id="lab-developmentStage"
                  name="developmentStage"
                  required
                  value={developmentStage}
                  onChange={(event) => setDevelopmentStage(event.target.value)}
                >
                  {publicLabDevelopmentStageOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errorText("developmentStage")}
              </div>
              <div className={styles.field}>
                <RequiredLabel htmlFor="lab-productCategory">製品カテゴリ</RequiredLabel>
                <input
                  {...fieldErrorProps("productCategory")}
                  data-testid="lab-product-category"
                  id="lab-productCategory"
                  name="productCategory"
                  placeholder="例: スキンケア、ヘアケア"
                  required
                  value={productCategory}
                  onChange={(event) => setProductCategory(event.target.value)}
                />
                {errorText("productCategory")}
              </div>
              <div className={styles.field}>
                <RequiredLabel htmlFor="lab-useCase">用途</RequiredLabel>
                <input
                  {...fieldErrorProps("useCase")}
                  data-testid="lab-use-case"
                  id="lab-useCase"
                  name="useCase"
                  placeholder="例: 新製品の美容液サンプル"
                  required
                  value={useCase}
                  onChange={(event) => setUseCase(event.target.value)}
                />
                {errorText("useCase")}
              </div>
              <div className={styles.field}>
                <RequiredLabel htmlFor="lab-plannedQuantity">想定数量</RequiredLabel>
                <select
                  {...fieldErrorProps("plannedQuantity")}
                  data-testid="lab-planned-quantity"
                  id="lab-plannedQuantity"
                  name="plannedQuantity"
                  required
                  value={plannedQuantity}
                  onChange={(event) => setPlannedQuantity(event.target.value)}
                >
                  {publicLabPlannedQuantityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errorText("plannedQuantity")}
              </div>
              <div className={styles.field}>
                <RequiredLabel htmlFor="lab-desiredTiming">希望時期</RequiredLabel>
                <select
                  {...fieldErrorProps("desiredTiming")}
                  data-testid="lab-desired-timing"
                  id="lab-desiredTiming"
                  name="desiredTiming"
                  required
                  value={desiredTiming}
                  onChange={(event) => setDesiredTiming(event.target.value)}
                >
                  {publicLabDesiredTimingOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errorText("desiredTiming")}
              </div>
            </div>
          </fieldset>
        ) : (
          <>
            <fieldset className={styles.detailField}>
              <legend className={styles.detailLegend}>02 サンプル条件</legend>
              <div className={styles.detailGrid}>
                <div className={styles.fieldWide}>
                  <span className={styles.requiredLabel} id="lab-sample-shapes-label">
                    希望サンプル形状
                    <span aria-hidden="true" className={styles.requiredMark}>必須</span>
                  </span>
                  <div
                    aria-labelledby="lab-sample-shapes-label"
                    className={styles.choiceChips}
                    data-testid="lab-sample-shapes"
                    role="group"
                  >
                    {publicLabSampleShapes.map((option) => {
                      const selected = sampleShapes.includes(option.value);
                      return (
                        <label
                          className={[
                            styles.choiceChip,
                            selected ? styles.chipSelected : "",
                          ].filter(Boolean).join(" ")}
                          key={option.value}
                        >
                          <input
                            checked={selected}
                            data-testid="lab-sample-shape"
                            name="sampleShapeOption"
                            onChange={() => toggleSampleShape(option.value)}
                            type="checkbox"
                            value={option.value}
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                  {errorText("sampleShapes")}
                </div>
                <div className={styles.field}>
                  <RequiredLabel htmlFor="lab-sampleType">サンプル種類</RequiredLabel>
                  <select
                    {...fieldErrorProps("sampleType")}
                    data-testid="lab-sample-type"
                    id="lab-sampleType"
                    name="sampleType"
                    required
                    value={sampleType}
                    onChange={(event) => setSampleType(event.target.value)}
                  >
                    {publicLabSampleTypes.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {errorText("sampleType")}
                </div>
                <div className={styles.field}>
                  <RequiredLabel htmlFor="lab-sampleQuantity">サンプル点数</RequiredLabel>
                  <input
                    {...fieldErrorProps("sampleQuantity")}
                    data-testid="lab-sample-quantity"
                    id="lab-sampleQuantity"
                    max={20}
                    min={1}
                    name="sampleQuantity"
                    required
                    step={1}
                    type="number"
                    value={sampleQuantity}
                    onChange={(event) => setSampleQuantity(Number(event.target.value))}
                  />
                  {errorText("sampleQuantity")}
                </div>
                <div className={styles.field}>
                  <RequiredLabel htmlFor="lab-desiredTiming">希望時期</RequiredLabel>
                  <select
                    {...fieldErrorProps("desiredTiming")}
                    data-testid="lab-desired-timing"
                    id="lab-desiredTiming"
                    name="desiredTiming"
                    required
                    value={desiredTiming}
                    onChange={(event) => setDesiredTiming(event.target.value)}
                  >
                    {publicLabDesiredTimingOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {errorText("desiredTiming")}
                </div>
              </div>
            </fieldset>

            <fieldset className={styles.detailField}>
              <legend className={styles.detailLegend}>03 製品・用途</legend>
              <div className={styles.detailGrid}>
                <div className={styles.field}>
                  <RequiredLabel htmlFor="lab-productName">製品・内容物名</RequiredLabel>
                  <input
                    {...fieldErrorProps("productName")}
                    data-testid="lab-product-name"
                    id="lab-productName"
                    name="productName"
                    placeholder="例:保湿美容液 5g"
                    required
                    value={productName}
                    onChange={(event) => setProductName(event.target.value)}
                  />
                  {errorText("productName")}
                </div>
                <div className={styles.field}>
                  <RequiredLabel htmlFor="lab-productCategory">製品カテゴリ</RequiredLabel>
                  <input
                    {...fieldErrorProps("productCategory")}
                    data-testid="lab-product-category"
                    id="lab-productCategory"
                    name="productCategory"
                    placeholder="例: スキンケア、ヘアケア"
                    required
                    value={productCategory}
                    onChange={(event) => setProductCategory(event.target.value)}
                  />
                  {errorText("productCategory")}
                </div>
                <div className={styles.fieldWide}>
                  <RequiredLabel htmlFor="lab-useCase">用途</RequiredLabel>
                  <input
                    {...fieldErrorProps("useCase")}
                    data-testid="lab-use-case"
                    id="lab-useCase"
                    name="useCase"
                    placeholder="例: 展示会サンプル、新製品開発確認"
                    required
                    value={useCase}
                    onChange={(event) => setUseCase(event.target.value)}
                  />
                  {errorText("useCase")}
                </div>
                <div className={styles.field}>
                  <RequiredLabel htmlFor="lab-plannedQuantity">量産想定数量</RequiredLabel>
                  <select
                    {...fieldErrorProps("plannedQuantity")}
                    data-testid="lab-planned-quantity"
                    id="lab-plannedQuantity"
                    name="plannedQuantity"
                    required
                    value={plannedQuantity}
                    onChange={(event) => setPlannedQuantity(event.target.value)}
                  >
                    {publicLabPlannedQuantityOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {errorText("plannedQuantity")}
                </div>
              </div>
            </fieldset>

            <fieldset className={styles.detailField}>
              <legend className={styles.detailLegend}>04 配送先</legend>
              <div className={styles.detailGrid}>
                <div className={styles.field}>
                  <RequiredLabel htmlFor="lab-recipientName">受取人名</RequiredLabel>
                  <input
                    {...fieldErrorProps("recipientName")}
                    data-testid="lab-recipient-name"
                    id="lab-recipientName"
                    name="recipientName"
                    required
                    value={recipientName}
                    onChange={(event) => setRecipientName(event.target.value)}
                  />
                  {errorText("recipientName")}
                </div>
                <div className={styles.field}>
                  <RequiredLabel htmlFor="lab-postalCode">郵便番号</RequiredLabel>
                  <input
                    {...fieldErrorProps("postalCode")}
                    data-testid="lab-postal-code"
                    id="lab-postalCode"
                    inputMode="numeric"
                    name="postalCode"
                    placeholder="例: 150-0001"
                    required
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                  />
                  {errorText("postalCode")}
                </div>
                <div className={styles.field}>
                  <RequiredLabel htmlFor="lab-prefecture">都道府県</RequiredLabel>
                  <input
                    {...fieldErrorProps("prefecture")}
                    data-testid="lab-prefecture"
                    id="lab-prefecture"
                    name="prefecture"
                    required
                    value={prefecture}
                    onChange={(event) => setPrefecture(event.target.value)}
                  />
                  {errorText("prefecture")}
                </div>
                <div className={styles.field}>
                  <RequiredLabel htmlFor="lab-deliveryPhone">配送先電話番号</RequiredLabel>
                  <input
                    {...fieldErrorProps("deliveryPhone")}
                    data-testid="lab-delivery-phone"
                    id="lab-deliveryPhone"
                    inputMode="tel"
                    name="deliveryPhone"
                    required
                    value={deliveryPhone}
                    onChange={(event) => setDeliveryPhone(event.target.value)}
                  />
                  {errorText("deliveryPhone")}
                </div>
                <div className={styles.fieldWide}>
                  <RequiredLabel htmlFor="lab-addressLine1">市区町村・番地</RequiredLabel>
                  <input
                    {...fieldErrorProps("addressLine1")}
                    data-testid="lab-address-line1"
                    id="lab-addressLine1"
                    name="addressLine1"
                    required
                    value={addressLine1}
                    onChange={(event) => setAddressLine1(event.target.value)}
                  />
                  {errorText("addressLine1")}
                </div>
                <div className={styles.fieldWide}>
                  <label className={styles.plainLabel} htmlFor="lab-addressLine2">建物・部屋番号（任意）</label>
                  <input
                    {...fieldErrorProps("addressLine2")}
                    data-testid="lab-address-line2"
                    id="lab-addressLine2"
                    name="addressLine2"
                    value={addressLine2}
                    onChange={(event) => setAddressLine2(event.target.value)}
                  />
                  {errorText("addressLine2")}
                </div>
                <div className={styles.fieldWide}>
                  <label className={styles.plainLabel} htmlFor="lab-deliveryNotes">配送備考（任意）</label>
                  <textarea
                    id="lab-deliveryNotes"
                    data-testid="lab-delivery-notes"
                    name="deliveryNotes"
                    rows={3}
                    value={deliveryNotes}
                    onChange={(event) => setDeliveryNotes(event.target.value)}
                  />
                  {errorText("deliveryNotes")}
                </div>
              </div>
            </fieldset>
          </>
        )}

        <fieldset className={styles.detailField}>
          <legend className={styles.detailLegend}>{requestType === "consultation" ? "03" : "05"} 詳細</legend>
          <div className={styles.field}>
            <label className={styles.plainLabel} htmlFor="lab-message">
              {requestType === "consultation" ? "ご相談内容（任意）" : "サンプルに関する詳細（任意）"}
            </label>
            <textarea
              id="lab-message"
              data-testid="lab-message"
              name="message"
              rows={4}
              maxLength={2_000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <span className={styles.fieldHint}>
              {requestType === "consultation"
                ? "内容物・粘度・容器イメージ・課題など、わかる範囲でご記入ください。"
                : "印刷有無・内容物の有無・提出先や確認目的などを補足いただけます。"}
            </span>
          </div>
        </fieldset>

        <div className={styles.requestConsent}>
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
      </form>
    </div>
  );
}
