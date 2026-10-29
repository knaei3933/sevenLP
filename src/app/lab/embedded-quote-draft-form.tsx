"use client";

import Image from "next/image";
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
import craPouch from "./images/generated/CRA-real-skincare.png";
import btaPouch from "./images/generated/BTA-real-premium.png";
import rdaPouch from "./images/generated/RDA-real-edited.png";
import tuaPouch from "./images/generated/TUA-real-edited.png";

const QUOTE_DRAFT_ROUTE = "/api/public/lab/quote-drafts";
const COLOR_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);
const QUICK_QUANTITIES = [10_000, 20_000, 50_000, 100_000] as const;

const designMedia: Record<PublicQuoteDraftDesignId, Parameters<typeof Image>[0]["src"]> = {
  rda: rdaPouch,
  tua: tuaPouch,
  bta: btaPouch,
  cra: craPouch,
};

const sizeLabel = (key: PublicLabSizeKey) =>
  publicLabSizeOptions.find((option) => option.key === key)?.label ?? key;

export function EmbeddedQuoteDraftForm() {
  const firstDesign = publicQuoteDraftDesignOptions[0];
  const [fillAmount, setFillAmount] = useState("1");
  const [designId, setDesignId] = useState<PublicQuoteDraftDesignId>(firstDesign.id);
  const [sizeKey, setSizeKey] = useState<PublicLabSizeKey>(firstDesign.sizeKeys[0]);
  const [colorCount, setColorCount] = useState(1);
  const [quantity, setQuantity] = useState(10_000);

  const selectedDesign = publicQuoteDraftDesignOptions.find((design) => design.id === designId)
    ?? firstDesign;
  const compatibleSizeKeys = selectedDesign.sizeKeys.filter((candidate) =>
    acceptsPublicQuoteDraftFill(selectedDesign.id, String(candidate), fillAmount),
  );
  const selectedSizeKey = compatibleSizeKeys.some((candidate) => candidate === (sizeKey as PublicLabSizeKey))
    ? sizeKey
    : compatibleSizeKeys[0] ?? selectedDesign.sizeKeys[0];
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
    setQuantity(getPublicLabSizeRule(nextSizeKey).minimumQuantity);
  }

  function changeFillAmount(nextFill: string) {
    setFillAmount(nextFill);
  }

  function normalizeFillSelection() {
    if (acceptsPublicQuoteDraftFill(selectedDesign.id, selectedSizeKey, fillAmount)) return;
    selectFill(fillAmount);
  }

  function selectDesign(nextDesignId: PublicQuoteDraftDesignId) {
    const nextDesign = publicQuoteDraftDesignOptions.find((design) => design.id === nextDesignId);
    if (!nextDesign) return;
    const nextSizeKey = nextDesign.sizeKeys.find((candidate) =>
      acceptsPublicQuoteDraftFill(nextDesignId, candidate, fillAmount),
    ) ?? nextDesign.sizeKeys[0];
    setDesignId(nextDesignId);
    setSizeKey(nextSizeKey);
    setQuantity(getPublicLabSizeRule(nextSizeKey).minimumQuantity);
  }

  return (
    <form
      action={QUOTE_DRAFT_ROUTE}
      aria-label="見積もり条件"
      className={styles.quoteFormShell}
      data-testid="embedded-quote-draft-form"
      method="post"
    >
      <div aria-live="polite" className={styles.selectionSummary}>
        <span className={styles.summaryValue}>{fillAmount}g</span>
        <span className={styles.summaryValue}>{selectedDesign.id.toUpperCase()}</span>
        <span className={styles.summaryValue}>{sizeLabel(selectedSizeKey)}</span>
        <span className={styles.summaryValue}>{colorCount}色</span>
        <span className={styles.summaryValue}>{quantity.toLocaleString("ja-JP")}枚</span>
      </div>

      <fieldset className={styles.stepField}>
        <legend className={styles.stepLabel}>
          <span aria-hidden="true" className={styles.stepNumber}>01</span>
          1室充填量
        </legend>
        <div
          aria-labelledby="quote-draft-fillAmount-label"
          className={styles.chipGroup}
          data-testid="quote-draft-fill-options"
          id="quote-draft-fillAmount-label"
          role="radiogroup"
        >
          {publicQuoteDraftFillOptions.map((amount) => {
            const disabled = !publicQuoteDraftDesignOptions.some((design) =>
              design.sizeKeys.some((candidate) =>
                acceptsPublicQuoteDraftFill(design.id, candidate, amount),
              ),
            );
            const selected = fillAmount === amount;
            return (
              <label
                className={[
                  styles.chip,
                  selected ? styles.chipSelected : "",
                  disabled ? styles.chipDisabled : "",
                ].filter(Boolean).join(" ")}
                key={amount}
              >
                <input
                  checked={selected}
                  className={styles.visualHiddenInput}
                  data-testid="quote-draft-fill"
                  disabled={disabled}
                  onChange={() => selectFill(amount)}
                  type="radio"
                  value={amount}
                />
                {amount}g
              </label>
            );
          })}
        </div>
        <input name="fillAmount" type="hidden" value={fillAmount} />
        <div className={styles.customFillField}>
          <label className={styles.plainLabel} htmlFor="quote-draft-fillAmount-custom">
            上記以外の充填量を直接入力
          </label>
          <input
            className={styles.quantityInput}
            data-testid="quote-draft-fill-custom"
            id="quote-draft-fillAmount-custom"
            inputMode="decimal"
            max={10}
            min={1}
            onBlur={normalizeFillSelection}
            onChange={(event) => changeFillAmount(event.target.value)}
            step={0.1}
            type="number"
            value={fillAmount}
          />
        </div>
        <p className={styles.stepHelp} data-testid="quote-draft-fill-help">
          一般形状は1〜10g、丸形は1〜2g。0.1g単位で直接入力もできます。対応しないデザイン・サイズは自動的に選択できなくなります。
        </p>
      </fieldset>

      <fieldset className={styles.stepField}>
        <legend className={styles.stepLabel}>
          <span aria-hidden="true" className={styles.stepNumber}>02</span>
          デザイン
        </legend>
        <div className={styles.designGrid} role="radiogroup" aria-label="デザイン">
          {publicQuoteDraftDesignOptions.map((design) => {
            const disabled = !design.sizeKeys.some((candidate) =>
              acceptsPublicQuoteDraftFill(design.id, candidate, fillAmount),
            );
            const selected = designId === design.id;
            return (
              <label
                className={[
                  styles.designCard,
                  selected ? styles.designCardSelected : "",
                  disabled ? styles.chipDisabled : "",
                ].filter(Boolean).join(" ")}
                key={design.id}
              >
                <input
                  checked={selected}
                  className={styles.visualHiddenInput}
                  data-testid="quote-draft-design-radio"
                  disabled={disabled}
                  name="designId"
                  onChange={() => selectDesign(design.id)}
                  type="radio"
                  value={design.id}
                />
                <span aria-hidden="true" className={styles.designMedia}>
                  <Image
                    alt=""
                    fill
                    sizes="(max-width: 640px) 42vw, 120px"
                    src={designMedia[design.id]}
                  />
                </span>
                <span className={styles.designCode}>{design.id.toUpperCase()}</span>
                <span className={styles.designName}>{design.label}</span>
                {disabled ? <span className={styles.designDisabledNote}>{fillAmount}g非対応</span> : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.stepField}>
        <legend className={styles.stepLabel}>
          <span aria-hidden="true" className={styles.stepNumber}>03</span>
          サイズ
        </legend>
        <div className={styles.chipGroup} role="radiogroup" aria-label="サイズ">
          {selectedDesign.sizeKeys.map((candidate) => {
            const disabled = !acceptsPublicQuoteDraftFill(selectedDesign.id, candidate, fillAmount);
            const selected = candidate === selectedSizeKey;
            return (
              <label
                className={[
                  styles.chip,
                  selected ? styles.chipSelected : "",
                  disabled ? styles.chipDisabled : "",
                ].filter(Boolean).join(" ")}
                key={candidate}
              >
                <input
                  checked={selected}
                  className={styles.visualHiddenInput}
                  data-testid="quote-draft-size-radio"
                  disabled={disabled}
                  name="sizeKey"
                  onChange={() => {
                    setSizeKey(candidate);
                    setQuantity(getPublicLabSizeRule(candidate).minimumQuantity);
                  }}
                  type="radio"
                  value={candidate}
                />
                {sizeLabel(candidate)}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className={styles.conditionColumns}>
        <fieldset className={styles.stepField}>
          <legend className={styles.stepLabel}>
            <span aria-hidden="true" className={styles.stepNumber}>04</span>
            色数
          </legend>
          <div className={styles.smallChipGroup} role="radiogroup" aria-label="色数">
            {COLOR_OPTIONS.map((count) => {
              const selected = colorCount === count;
              return (
                <label
                  className={[
                    styles.smallChip,
                    selected ? styles.chipSelected : "",
                  ].filter(Boolean).join(" ")}
                  key={count}
                >
                  <input
                    checked={selected}
                    className={styles.visualHiddenInput}
                    data-testid="quote-draft-color-radio"
                    name="colorCount"
                    onChange={() => setColorCount(count)}
                    type="radio"
                    value={count}
                  />
                  {count}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className={styles.stepField}>
          <label className={styles.stepLabel} htmlFor="quote-draft-quantity">
            <span aria-hidden="true" className={styles.stepNumber}>05</span>
            希望数量（枚）
          </label>
          <input
            className={styles.quantityInput}
            data-testid="quote-draft-quantity"
            id="quote-draft-quantity"
            inputMode="numeric"
            min={rule.minimumQuantity}
            name="quantity"
            onChange={(event) => setQuantity(Number(event.target.value))}
            required
            step={1}
            type="number"
            value={quantity}
          />
          <div aria-label="数量クイック入力" className={styles.quickQuantity}>
            {QUICK_QUANTITIES.map((count) => (
              <button
                className={styles.quickButton}
                key={count}
                onClick={() => setQuantity(count)}
                type="button"
              >
                {count.toLocaleString("ja-JP")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <input name="locale" type="hidden" value="ja" />
      <p className={styles.stepHelp} data-testid="quote-draft-limit-note">
        送信後、会員登録またはログインして印刷方法の候補を選択できます。条件URLの有効期限は60分です。
      </p>
      <button className={styles.submit} data-testid="quote-draft-submit" type="submit">
        見積もり条件を送信する
      </button>
    </form>
  );
}
