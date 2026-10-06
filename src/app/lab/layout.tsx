import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "パウチ充填ラボ | Epackage Lab",
  description: "Epackage Labのパウチ充填専門サービス。小ロットのパウチ充填・サンプル・ご相談を受け付けています。",
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
