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
  { key: "xra-38.5x90", label: "Xraラウンド 38.5×90" },
  { key: "mouthwash-45x145", label: "マウスウォッシュ用 45×145" },
] as const satisfies readonly PublicLabSizeOption[];

export type PublicLabSizeKey = (typeof publicLabSizeOptions)[number]["key"];

export const publicLabRequestTypeOptions = [
  { value: "quotation", label: "お見積もり" },
  { value: "consultation", label: "ご相談" },
  { value: "sample", label: "サンプル" },
] as const satisfies readonly PublicLabEnumOption<PublicLabRequestType>[];

export const publicLabFillingMethodOptions = [
  { value: "hopper", label: "ホッパ充填" },
  { value: "pressure", label: "加圧充填" },
] as const satisfies readonly PublicLabEnumOption<PublicLabFillingMethod>[];

export const publicLabPrintingMethodOptions = [
  { value: "digital", label: "デジタル印刷" },
  { value: "gravure", label: "グラビア印刷" },
] as const satisfies readonly PublicLabEnumOption<PublicLabPrintingMethod>[];
