import type { Metadata } from "next";
import styles from "./page.module.css";

const title = "パウチ充填ラボ | Epackage Lab";
const description = "化粧水・美容液・乳液などの化粧品液剤を小容量パウチへ充填するサービス。スキンケア・ヘアケア・UVケアなど6形状を最短10,000枚から製造し、無料見積もりやサンプル依頼を日本語で進められます。";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    type: "website",
    title,
    description,
    siteName: "パウチ充填ラボ",
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
