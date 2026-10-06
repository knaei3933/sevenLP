import styles from "./page.module.css";

import { LabRequestForm } from "./lab-request-form";

export default function LabPage() {
  return (
    <>
      <section className={`${styles.hero} ${styles.section}`} aria-labelledby="lab-brand">
        <div className={styles.inner}>
          <p className={styles.kicker}>Epackage Lab</p>
          <h1 id="lab-brand" className={styles.brand}>パウチ充填ラボ</h1>
          <p className={styles.affiliation}>Epackage Labのパウチ充填専門サービス</p>
          <p className={styles.lead}>
            充填条件や数量が固まる前でも、まず無料でご相談ください。パウチ充填に特化した体制で、サンプル確認から一緒に進めます。
          </p>
          <div className={styles.actions}>
            <a className={styles.primaryAction} href="#lab-quote">無料見積もり</a>
            <a className={styles.secondaryAction} href="#lab-contact">サンプル・相談</a>
          </div>
        </div>
      </section>

      <section id="lab-process" className={styles.section} aria-labelledby="lab-process-heading">
        <div className={styles.inner}>
          <h2 className={styles.sectionHeading} id="lab-process-heading">ご検討の進め方</h2>
          <ol className={styles.process}>
            <li>
              <h3 className={styles.itemTitle}>条件のヒアリング</h3>
              <p>サイズ、数量、充填量、印刷条件を日本語で確認します。</p>
            </li>
            <li>
              <h3 className={styles.itemTitle}>仕様の整理</h3>
              <p>充填方法と加工条件を整理し、実現可能な仕様に調整します。</p>
            </li>
            <li>
              <h3 className={styles.itemTitle}>サンプル確認</h3>
              <p>必要に応じてサンプルを通じて、仕上がりをご確認いただけます。</p>
            </li>
            <li>
              <h3 className={styles.itemTitle}>最終お見積り</h3>
              <p>確定条件に基づき、最終価格と進行条件をご提示します。</p>
            </li>
          </ol>
        </div>
      </section>

      <section id="lab-trust" className={styles.section} aria-labelledby="lab-trust-heading">
        <div className={styles.inner}>
          <h2 className={styles.sectionHeading} id="lab-trust-heading">選ばれる理由</h2>
          <dl className={styles.trust}>
            <div><dt>充填専門体制</dt><dd>パウチ充填に特化した条件設計と進行管理を提供します。</dd></div>
            <div><dt>小ロット対応</dt><dd>数量が確定していませんでも、条件整理から伴走します。</dd></div>
            <div><dt>品質への配慮</dt><dd>充填条件や印刷仕様の適合性を丁寧に確認します。</dd></div>
            <div><dt>日本語サポート</dt><dd>ご相談から納品条件まで、日本語で対応します。</dd></div>
          </dl>
        </div>
      </section>

      <section id="lab-quote" className={styles.section} aria-labelledby="lab-quote-heading">
        <div className={styles.inner}>
          <h2 className={styles.sectionHeading} id="lab-quote-heading">無料見積もり</h2>
          <LabRequestForm />
        </div>
      </section>

      <section id="lab-contact" className={styles.section} aria-labelledby="lab-contact-heading">
        <div className={styles.inner}>
          <h2 className={styles.sectionHeading} id="lab-contact-heading">サンプル・ご相談</h2>
          <p className={styles.body}>
            サンプル確認、充填方法、数量条件など、パウチ充填に関するご相談を受け付けています。
          </p>
          <address className={styles.contact}>
            <ul className={styles.contactList}>
              <li>
                <a className={styles.contactLink} href="mailto:shapepouch@package-lab.com?subject=サンプル・ご相談">
                  shapepouch@package-lab.com
                </a>
              </li>
            </ul>
          </address>
        </div>
      </section>
    </>
  );
}
