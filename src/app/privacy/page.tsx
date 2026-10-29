import type { Metadata } from "next";
import styles from "../legal/page.module.css";

export const metadata: Metadata = {
  title: "プライバシーポリシー | パウチ充填ラボ",
  description: "パウチ充填ラボ（運営：金井貿易株式会社）における個人情報の取得目的、利用範囲、管理方法、お問い合わせについて。",
};

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <main className={styles.inner}>
        <a className={styles.backLink} href="/lab">← パウチ充填ラボへ戻る</a>
        <p className={styles.label}>PRIVACY POLICY</p>
        <h1 className={styles.title}>プライバシーポリシー</h1>
        <p className={styles.updated}>運営：金井貿易株式会社</p>
        <p className={styles.lead}>
          パウチ充填ラボ（運営：金井貿易株式会社、以下「当社」）は、お客様から取得する個人情報を、下記の目的と範囲内で適切に取り扱います。
        </p>

        <section className={styles.section}>
          <h2>1. 取得する情報</h2>
          <ul>
            <li>会社名、担当者名、メールアドレス、電話番号</li>
            <li>郵便番号、都道府県、住所、建物名、受取人名、配送先電話番号</li>
            <li>ご相談内容、製品カテゴリ、用途、想定数量、希望時期</li>
            <li>お見積もり条件、見積もり履歴、発注・仕様確認に必要な情報</li>
            <li>アクセスログ、IPアドレス、送信時刻など技術情報</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. 利用目的</h2>
          <ul>
            <li>ご相談、サンプル依頼、お見積もり依頼への対応</li>
            <li>サンプル発送および到着確認</li>
            <li>仕様確認、見積書作成、発注・生産・検品・納品に関する連絡</li>
            <li>品質管理、トラブル対応、アフターフォロー</li>
            <li>不正アクセス・なりすまし・迷惑送信の防止</li>
            <li>法令や契約上の義務に対応するため</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. 第三者提供</h2>
          <p>
            当社は、法令に基づく場合を除き、ご本人の同意なく個人情報を第三者へ販売または提供しません。サンプル発送や契約執行に必要な最小限の情報は、配送業者・協力事業者へ適切に管理された状態で提供することがあります。
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. 情報管理とアクセス制限</h2>
          <p>
            お客様の処方情報、デザインデータ、見積条件、発注条件は関係者以外が閲覧できないようアクセスを制限します。機密性の高い案件では、NDA締結のうえ進行します。
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. 保存期間</h2>
          <p>
            個人情報は、お問い合わせ対応、契約履行、法令義務、取引記録管理に必要な期間のみ保存し、目的を超えて保持し続けません。不要となった情報は適切な方法で削除または匿名化します。
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. 開示・訂正・削除のご請求</h2>
          <p>
            ご本人からの開示、訂正、削除のご請求には、本人確認のうえ法令と契約に従って対応します。ご請求は下記のお問い合わせ窓口までご連絡ください。
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. お問い合わせ窓口</h2>
          <table className={styles.table}>
            <tbody>
              <tr><th>運営会社</th><td>金井貿易株式会社</td></tr>
              <tr><th>サービス名</th><td>パウチ充填ラボ / Epackage Lab</td></tr>
              <tr><th>所在地</th><td>〒673-0892 兵庫県明石市本町2-1-29 みなとメゾン明石本町2F</td></tr>
              <tr><th>メール</th><td>shapepouch@package-lab.com</td></tr>
              <tr><th>電話</th><td>050-3613-9673</td></tr>
            </tbody>
          </table>
        </section>

        <section className={styles.section}>
          <h2>8. ポリシーの変更</h2>
          <p>
            法令・運用状況の変更に応じて、本ポリシーを更新することがあります。重要な変更については、当サイト上でお知らせします。
          </p>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>運営：金井貿易株式会社 / パウチ充填ラボ</span>
          <a href="/legal">取引条件・特商法表記</a>
        </div>
      </footer>
    </div>
  );
}
