import type { Metadata } from "next";
import styles from "./page.module.css";

const title = "セブン化学 パウチ充填ラボ | 金井貿易株式会社";
const description = "株式会社セブン化学の製造設備で、化粧水・美容液・乳液などの化粧品液剤を小容量パウチへ充填します。最短10,000枚から無料見積もり・サンプル依頼を日本語で進められます。";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    type: "website",
    title,
    description,
    siteName: "セブン化学 パウチ充填ラボ",
    images: [
      {
        url: "/lab/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "パウチ充填ラボのサービス紹介画像",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/lab/opengraph-image.png"],
  },
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
