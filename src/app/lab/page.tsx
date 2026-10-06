import styles from "./page.module.css";

export default function LabPage() {
  return (
    <>
      <section className={`${styles.hero} ${styles.section}`} aria-labelledby="lab-brand">
        <div className={styles.inner}>
          <p className={styles.kicker}>Epackage Lab</p>
          <h1 id="lab-brand">パウチ充填ラボ</h1>
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

      <section id="lab-quote" className={styles.section} aria-labelledby="lab-quote-heading">
        <div className={styles.inner}>
          <h2 id="lab-quote-heading">無料見積もり</h2>
          <p className={styles.body}>
            オンライン見積もりの準備中です。仕様や数量のご相談は、下記の連絡先からお気軽にお問い合わせください。
          </p>
        </div>
      </section>

      <section id="lab-contact" className={styles.section} aria-labelledby="lab-contact-heading">
        <div className={styles.inner}>
          <h2 id="lab-contact-heading">サンプル・ご相談</h2>
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
