import type { Metadata } from "next";
import { GlobalHeader } from "@/components/global-header";

export const metadata: Metadata = {
  title: "パウチ参考原価・販売価格シミュレーター",
  description: "パウチの参考原価・参考販売価格をDecimal計算で検証します",
};

export default function QuotationSuiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalHeader />
      {children}
    </>
  );
}
