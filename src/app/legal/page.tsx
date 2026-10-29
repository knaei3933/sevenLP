import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "B2B取引条件・特定商取引法に基づく表記 | パウチ充填ラボ",
  description: "パウチ充填ラボ（運営：金井貿易株式会社）の販売業者情報、価格、支払条件、納期、キャンセル方針、個人情報保護方針。",
};

export default function LegalPage() {
  return (
    <div className={styles.page}>
      <main className={styles.inner}>
        <a className={styles.backLink} href="/lab">← パウチ充填ラボへ戻る</a>
        <p className={styles.label}>TRANSACTION POLICY</p>
        <h1 className={styles.title}>B2B取引条件・特定商取引法に基づく表記</h1>
        <p className={styles.updated}>運営：金井貿易株式会社</p>
        <p className={styles.lead}>
          本サービスは、事業者・法人・個人事業主を対象とした化粧品液剤の受託充填・製造相談サービスです。正式な条件は、仕様確認後のお見積書と契約書類により確定します。
        </p>

        <section className={styles.section}>
          <h2>販売業者・サービス運営者</h2>
          <table className={styles.table}>
            <tbody>
              <tr><th>販売業者</th><td>金井貿易株式会社</td></tr>
              <tr><th>サービス名</th><td>パウチ充填ラボ / Epackage Lab</td></tr>
              <tr><th>所在地</th><td>〒673-0892 兵庫県明石市本町2-1-29 みなとメゾン明石本町2F</td></tr>
              <tr><th>お問い合わせ</th><td>shapepouch@package-lab.com / 050-3613-9673</td></tr>
              <tr><th>対象</th><td>事業者・法人・個人事業主を想定</td></tr>
            </tbody>
          </table>
        </section>

        <section className={styles.section}>
          <h2>販売価格</h2>
          <p>
            価格は仕様（形状、サイズ、充填量、チャンバー数、印刷方法、色数、数量など）確定後にお見積書で提示します。Web入力段階の金額は仮条件に基づく参考価格であり、最終請求額を保証しません。
          </p>
        </section>

        <section className={styles.section}>
          <h2>支払条件</h2>
          <p>
            基本は後払いです。ただし、新規お取引開始時には事前審査のうえ前払いをお願いすることがあります。支払方法・支払期日はお見積書または契約書類で確定します。
          </p>
        </section>

        <section className={styles.section}>
          <h2>納期</h2>
          <p>
            デザイン確定、支給バルク到着、校正・見本承認、数量条件が確定した後、約2ヶ月を標準的な目安とします。印刷方式、生産計画、検品条件により前後する場合は、正式条件確認時に個別にご案内します。
          </p>
        </section>

        <section className={styles.section}>
          <h2>キャンセル・返品・交換</h2>
          <p>
            お客様仕様での受託製造のため、生産開始後のキャンセル・返品・交換は原則として承ることができません。ただし、当社責任による明らかな不良、仕様相違、数量過不足については、契約条件に従って協議のうえ対応します。
          </p>
        </section>

        <section className={styles.section}>
          <h2>支給バルクと品質確認</h2>
          <p>
            基本となる内容物（バルク）はお客様支給です。処方、粘度、比重、充填温度、材料適合性、安定性により対応可否が変わるため、支給バルクと見本充填で確認します。品質基準・検査項目は正式発注前に取り決めます。
          </p>
          <p className={styles.note}>
            工場名・所在地・担当者などの生産情報は一般公開していません。NDA締結および発注条件確定後に、必要な範囲のみご案内します。
          </p>
        </section>

        <section className={styles.section}>
          <h2>知的財産・機密保持</h2>
          <p>
            処方、アートワーク、見積条件、発注条件は機密情報として管理します。必要に応じてNDAを締結し、関係者以外のアクセスを制限します。お客様が第三者の権利を侵害しない責任を負うものとします。
          </p>
        </section>

        <section className={styles.section}>
          <h2>準拠法・協議</h2>
          <p>
            本サービスの取引には日本法を適用します。万一の紛争については、契約書類に定める管轄を除き、まず当社窓口と誠実に協議します。
          </p>
        </section>

        <section className={styles.section}>
          <h2>お問い合わせ</h2>
          <p>
            取引条件に関するご質問は、<a href="/lab#lab-contact">パウチ充填ラボのお問い合わせフォーム</a>または shapepouch@package-lab.com までご連絡ください。
          </p>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>運営：金井貿易株式会社 / パウチ充填ラボ</span>
          <a href="/privacy">プライバシーポリシー</a>
        </div>
      </footer>
    </div>
  );
}
