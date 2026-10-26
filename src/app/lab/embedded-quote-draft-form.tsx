"use client";

import { useState } from "react";

import { publicLabSizeOptions, type PublicLabSizeKey } from "@/lib/public-lab-options";
import { getPublicLabSizeRule } from "@/lib/public-lab-rules";
import {
  publicQuoteDraftDesignOptions,
  type PublicQuoteDraftDesignId,
} from "@/lib/public-quote-draft-options";

import styles from "./page.module.css";

const QUOTE_DRAFT_ROUTE = "/api/public/lab/quote-drafts";

export function EmbeddedQuoteDraftForm() {
  const firstDesign = publicQuoteDraftDesignOptions[0];
  const [designId, setDesignId] = useState<PublicQuoteDraftDesignId>(firstDesign.id);
  const [sizeKey, setSizeKey] = useState<PublicLabSizeKey>(firstDesign.sizeKeys[0]);
  const [fillAmount, setFillAmount] = useState("1");
  const [quantity, setQuantity] = useState(10_000);

  const selectedDesign = publicQuoteDraftDesignOptions.find((design) => design.id === designId)
    ?? firstDesign;
  const selectedSizeKey = selectedDesign.sizeKeys.some((candidate) => candidate === sizeKey) ? sizeKey : selectedDesign.sizeKeys[0];
  const rule = getPublicLabSizeRule(selectedSizeKey);

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
              const nextSizeKey = nextDesign.sizeKeys[0];
              const nextRule = getPublicLabSizeRule(nextSizeKey);
              setSizeKey(nextSizeKey);
              setFillAmount(String(nextRule.capacity.min));
              setQuantity(nextRule.minimumQuantity);
            }
          }}
        >
          {publicQuoteDraftDesignOptions.map((design) => (
            <option key={design.id} value={design.id}>{design.label}</option>
          ))}
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
            const option = publicLabSizeOptions.find((candidate) => candidate.key === size);
            return <option key={size} value={size}>{option?.label ?? size}</option>;
          })}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="quote-draft-fillAmount">1室充填量（g）</label>
        <input
          data-testid="quote-draft-fill"
          id="quote-draft-fillAmount"
          value={fillAmount}
          onChange={(event) => setFillAmount(event.target.value)}
          max={rule.capacity.max}
          min={rule.capacity.min}
          name="fillAmount"
          required
          step="0.01"
          type="number"
        />
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
