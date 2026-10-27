import type { SizeKey } from "./types";

export type PublicLabRequestType = "quotation" | "consultation" | "sample";
export type PublicLabFillingMethod = "hopper" | "pressure";
export type PublicLabPrintingMethod = "digital" | "gravure";

export interface PublicLabSizeOption {
  key: SizeKey;
  label: string;
}

export interface PublicLabEnumOption<TValue extends string> {
  value: TValue;
  label: string;
}

export const publicLabSizeOptions = [
  { key: "round-50x60", label: "ラウンド 50×60" },
  { key: "round-50x80", label: "ラウンド 50×80" },
  { key: "round-60x80", label: "ラウンド 60×80" },
  { key: "round-60x100", label: "ラウンド 60×100" },
  { key: "round-60x120", label: "ラウンド 60×120" },
  { key: "round-70x120", label: "ラウンド 70×120" },
  { key: "round-60x80-2", label: "ラウンド 60×80（2連）" },
  { key: "round-70x120-3", label: "ラウンド 70×120（3連）" },
  { key: "circle-70x70", label: "丸形 70×70" },
  { key: "tube-35x60", label: "チューブ 35×60" },
  { key: "tube-35x80", label: "チューブ 35×80" },
  { key: "tube-50x90", label: "チューブ 50×90" },
  { key: "tube-70x120", label: "チューブ 70×120" },
  { key: "bottle-35x60", label: "ボトル型 35×60" },
  { key: "bottle-35x80", label: "ボトル型 35×80" },
  { key: "bottle-50x90", label: "ボトル型 50×90" },
  { key: "bottle-70x120", label: "ボトル型 70×120" },
  { key: "spa-35x80", label: "スポイトボトル型 35×80" },
  { key: "xra-38.5x90", label: "スリムドーズ 38.5×90（XRA）" },
  { key: "mouthwash-45x145", label: "マウスウォッシュ用 45×145" },
] as const satisfies readonly PublicLabSizeOption[];

export type PublicLabSizeKey = (typeof publicLabSizeOptions)[number]["key"];

export const publicLabRequestTypeOptions = [
  { value: "quotation", label: "お見積もり" },
  { value: "consultation", label: "ご相談" },
  { value: "sample", label: "サンプル" },
] as const satisfies readonly PublicLabEnumOption<PublicLabRequestType>[];

export type PublicLabDevelopmentStage = "idea" | "development" | "mass_production" | "other";
export type PublicLabPlannedQuantity = "undetermined" | "under_5000" | "5000_10000" | "10001_50000" | "over_50000";
export type PublicLabDesiredTiming = "undetermined" | "within_1m" | "within_3m" | "within_6m" | "over_6m";

export const publicLabConsultationTopics = [
  { value: "shape_size", label: "形状・サイズ選定" },
  { value: "filling_spec", label: "充填量・内容物性状" },
  { value: "printing_design", label: "印刷・デザイン" },
  { value: "cost_lot", label: "コスト・ロット" },
  { value: "schedule_process", label: "納期・進行" },
  { value: "other", label: "その他" },
] as const satisfies readonly PublicLabEnumOption<string>[];

export const publicLabSampleShapes = [
  { value: "rda", label: "RDA ラウンド" },
  { value: "tua", label: "TUA チューブ" },
  { value: "bta", label: "BTA ボトル型" },
  { value: "cra", label: "CRA 丸形" },
  { value: "spa", label: "SPA スポイトボトル" },
  { value: "xra", label: "XRA スリムドーズ" },
] as const satisfies readonly PublicLabEnumOption<string>[];

export const publicLabSampleTypes = [
  { value: "blank_pouch", label: "ブランクパウチ" },
  { value: "filled_sample", label: "充填サンプル" },
  { value: "printed_mockup", label: "印刷イメージ確認用" },
  { value: "other", label: "その他" },
] as const satisfies readonly PublicLabEnumOption<string>[];

export const publicLabDevelopmentStageOptions = [
  { value: "idea", label: "アイデア段階" },
  { value: "development", label: "開発中" },
  { value: "mass_production", label: "量産移行検討" },
  { value: "other", label: "その他" },
] as const satisfies readonly PublicLabEnumOption<PublicLabDevelopmentStage>[];

export const publicLabPlannedQuantityOptions = [
  { value: "undetermined", label: "未定" },
  { value: "under_5000", label: "〜5,000枚" },
  { value: "5000_10000", label: "5,000〜10,000枚" },
  { value: "10001_50000", label: "10,001〜50,000枚" },
  { value: "over_50000", label: "50,001枚〜" },
] as const satisfies readonly PublicLabEnumOption<PublicLabPlannedQuantity>[];

export const publicLabDesiredTimingOptions = [
  { value: "undetermined", label: "未定" },
  { value: "within_1m", label: "1ヶ月以内" },
  { value: "within_3m", label: "3ヶ月以内" },
  { value: "within_6m", label: "6ヶ月以内" },
  { value: "over_6m", label: "6ヶ月以降" },
] as const satisfies readonly PublicLabEnumOption<PublicLabDesiredTiming>[];

export const publicLabFillingMethodOptions = [
  { value: "hopper", label: "ホッパ充填" },
  { value: "pressure", label: "加圧充填" },
] as const satisfies readonly PublicLabEnumOption<PublicLabFillingMethod>[];

export const publicLabPrintingMethodOptions = [
  { value: "digital", label: "デジタル印刷" },
  { value: "gravure", label: "グラビア印刷" },
] as const satisfies readonly PublicLabEnumOption<PublicLabPrintingMethod>[];
