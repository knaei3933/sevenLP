"use client";

import { useState } from "react";

import { publicLabSizeOptions, type PublicLabSizeKey } from "@/lib/public-lab-options";
import { getPublicLabSizeRule } from "@/lib/public-lab-rules";
import {
  acceptsPublicQuoteDraftFill,
  publicQuoteDraftFillOptions,
  publicQuoteDraftDesignOptions,
  type PublicQuoteDraftDesignId,
} from "@/lib/public-quote-draft-options";

import styles from "./page.module.css";

const QUOTE_DRAFT_ROUTE = "/api/public/lab/quote-drafts";

export function EmbeddedQuoteDraftForm() {
  const firstDesign = publicQuoteDraftDesignOptions[0];
  const [fillAmount, setFillAmount] = useState("1");
  const [designId, setDesignId] = useState<PublicQuoteDraftDesignId>(firstDesign.id);
  const [sizeKey, setSizeKey] = useState<PublicLabSizeKey>(firstDesign.sizeKeys[0]);
  const [quantity, setQuantity] = useState(10_000);

  const selectedDesign = publicQuoteDraftDesignOptions.find((design) => design.id === designId)
    ?? firstDesign;
  const compatibleSizeKeys = selectedDesign.sizeKeys.filter((candidate) =>
    acceptsPublicQuoteDraftFill(selectedDesign.id, String(candidate), fillAmount),
  );
  const selectedSizeKey = compatibleSizeKeys.some((candidate) => candidate === (sizeKey as PublicLabSizeKey))
    ? sizeKey
    : compatibleSizeKeys[0];
  const rule = getPublicLabSizeRule(selectedSizeKey);

  function selectFill(nextFill: string) {
    const compatibleDesign = publicQuoteDraftDesignOptions.find((design) =>
      design.sizeKeys.some((candidate) => acceptsPublicQuoteDraftFill(design.id, candidate, nextFill)),
    );
    const nextDesign = compatibleDesign ?? firstDesign;
    const nextSizeKey = nextDesign.sizeKeys.find((candidate) =>
      acceptsPublicQuoteDraftFill(nextDesign.id, candidate, nextFill),
    ) ?? nextDesign.sizeKeys[0];
    setFillAmount(nextFill);
    setDesignId(nextDesign.id);
    setSizeKey(nextSizeKey);
  }

  return (
    <form
      action={QUOTE_DRAFT_ROUTE}
      aria-labelledby="lab-draft-form-heading"
      className={styles.formShell}
      data-testid="embedded-quote-draft-form"
      method="post"
    >
      <h3 className={styles.resultTitle} id="lab-draft-form-heading">下書き条件を発行</h3>
      <p className={styles.formNote}>
        5項目を入力して、署名付き下書きトークンを含む遷移URLを発行します。
      </p>

      <div className={styles.field}>
        <span id="quote-draft-fillAmount-label">1室充填量（g）</span>
        <div aria-labelledby="quote-draft-fillAmount-label" data-testid="quote-draft-fill-options" role="radiogroup">
          {publicQuoteDraftFillOptions.map((amount) => (
            <label key={amount}>
              <input
                checked={fillAmount === amount}
                data-testid="quote-draft-fill"
                name="fillAmount"
                onChange={() => selectFill(amount)}
                type="radio"
                value={amount}
              />
              {" "}
              {amount}g
            </label>
          ))}
        </div>
        <small data-testid="quote-draft-fill-help">
          充填量に対応しないデザイン・サイズは選択できません。
        </small>
      </div>

      <div className={styles.field}>
        <label htmlFor="quote-draft-designId">デザイン</label>
        <select
          data-testid="quote-draft-design"
          id="quote-draft-designId"
          name="designId"
          value={designId}
          onChange={(event) => {
            const nextDesignId = event.target.value as PublicQuoteDraftDesignId;
            const nextDesign = publicQuoteDraftDesignOptions.find((design) => design.id === nextDesignId);
            setDesignId(nextDesignId);
            if (nextDesign) {
              const nextSizeKey = nextDesign.sizeKeys.find((candidate) =>
                acceptsPublicQuoteDraftFill(nextDesignId, candidate, fillAmount),
              ) ?? nextDesign.sizeKeys[0];
              const nextRule = getPublicLabSizeRule(nextSizeKey);
              setSizeKey(nextSizeKey);
              setQuantity(nextRule.minimumQuantity);
            }
          }}
        >
          {publicQuoteDraftDesignOptions.map((design) => {
            const hasCompatibleSize = design.sizeKeys.some((candidate) =>
              acceptsPublicQuoteDraftFill(design.id, candidate, fillAmount),
            );
            return (
              <option
                disabled={!hasCompatibleSize}
                key={design.id}
                value={design.id}
              >
                {design.label}{hasCompatibleSize ? "" : `（${fillAmount}g非対応）`}
              </option>
            );
          })}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="quote-draft-sizeKey">サイズ</label>
        <select
          data-testid="quote-draft-size"
          id="quote-draft-sizeKey"
          name="sizeKey"
          value={selectedSizeKey}
          onChange={(event) => setSizeKey(event.target.value as PublicLabSizeKey)}
        >
          {selectedDesign.sizeKeys.map((size) => {
            const disabled = !acceptsPublicQuoteDraftFill(selectedDesign.id, size, fillAmount);
            const option = publicLabSizeOptions.find((candidate) => candidate.key === size);
            return (
              <option disabled={disabled} key={size} value={size}>
                {option?.label ?? size}{disabled ? `（${fillAmount}g非対応）` : ""}
              </option>
            );
          })}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="quote-draft-colorCount">色数</label>
        <input
          data-testid="quote-draft-color-count"
          defaultValue={1}
          id="quote-draft-colorCount"
          max={10}
          min={1}
          name="colorCount"
          required
          step={1}
          type="number"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="quote-draft-quantity">希望数量（枚）</label>
        <input
          data-testid="quote-draft-quantity"
          id="quote-draft-quantity"
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
          max={5_000_000}
          min={rule.minimumQuantity}
          name="quantity"
          required
          step={1}
          type="number"
        />
      </div>

      <input name="locale" type="hidden" value="ja" />
      <p className={styles.formNote} data-testid="quote-draft-limit-note">
        1時間あたり10回まで発行できます。下書きは60分後に失効します。
      </p>
      <button className={styles.submit} data-testid="quote-draft-submit" type="submit">
        下書きURLを発行する
      </button>
    </form>
  );
}
