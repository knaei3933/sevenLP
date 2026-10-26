import Image from "next/image";

import styles from "./page.module.css";
import { LabRequestForm } from "./lab-request-form";
import rdaPouch from "./images/generated/RDA-real-edited.png";
import tuaPouch from "./images/generated/TUA-real-edited.png";
import btaPouch from "./images/generated/BTA-real-premium.png";
import craPouch from "./images/generated/CRA-real-skincare.png";
import spaPouch from "./images/generated/SPA-real-beauty-drink.png";
import xraPouch from "./images/generated/XRA-real-rounded.png";
import qualityControl from "./images/quality-control.webp";

const heroSpecs = [
  { value: "6形状", label: "対応形状" },
  { value: "1〜10g", label: "主な充填量の目安" },
  { value: "1〜4室", label: "チャンバー設定" },
  { value: "10,000枚〜", label: "最小ロット" },
];

const headerNavItems = [
  { href: "#lab-products", label: "製品仕様" },
  { href: "#lab-quote", label: "見積もり" },
  { href: "#lab-quality", label: "品質体制" },
  { href: "#lab-process", label: "進め方" },
  { href: "#lab-contact", label: "お問い合わせ" },
];

const conversionBenefits = [
  {
    title: "条件整理を早くする",
    text: "サイズ・充填量・チャンバー・印刷・色数・数量を、画面上で数値として揃えられます。",
  },
  {
    title: "相談のハードルを下げる",
    text: "仕様が未確定でも、ご相談タブから内容物と用途だけを送れます。",
  },
  {
    title: "品質確認を先行させる",
    text: "GMP準拠の品質管理とISO22716準拠システムの前提で、確認項目を先に整理します。",
  },
  {
    title: "進行を見失わない",
    text: "送信後は参照番号付きで条件と結果を確認でき、日本語でそのまま進めます。",
  },
];

const pouchShapes = [
  {
    code: "RDA",
    name: "ラウンド型",
    usage: "化粧水・乳液などの定番サンプルに。",
    useCaseTags: ["化粧水", "乳液", "定番サンプル"],
    size: "50×60〜70×120",
    capacity: "1〜10g",
    minimumQuantity: "10,000枚〜／上限なし",
    image: rdaPouch,
    alt: "RDA ラウンド型パウチの単体製品写真",
  },
  {
    code: "TUA",
    name: "チューブ型",
    usage: "ヘアケア・トリートメントの細身サンプルに。",
    useCaseTags: ["トリートメント", "ヘアオイル"],
    size: "35×60〜70×120",
    capacity: "1〜10g",
    minimumQuantity: "10,000枚〜／上限なし",
    image: tuaPouch,
    alt: "TUA チューブ型パウチの単体製品写真",
  },
  {
    code: "BTA",
    name: "ボトル型",
    usage: "美容ドリンク・液体サンプルの配布に。",
    useCaseTags: ["美容ドリンク", "液体サンプル"],
    size: "35×60〜70×120",
    capacity: "1〜10g",
    minimumQuantity: "10,000枚〜／上限なし",
    image: btaPouch,
    alt: "BTA ボトル型パウチの単体製品写真",
  },
  {
    code: "CRA",
    name: "丸型",
    usage: "フェイスクリーム・単回使い切りに。",
    useCaseTags: ["フェイスクリーム", "単回使い切り"],
    size: "70×70",
    capacity: "2gまで",
    minimumQuantity: "10,000枚〜／上限なし",
    image: craPouch,
    alt: "CRA 丸型パウチの単体製品写真",
  },
  {
    code: "SPA",
    name: "スポイトボトル型",
    usage: "ポイント付け・少量液体の正確な配布に。",
    useCaseTags: ["ポイント付け", "少量液体"],
    size: "35×80",
    capacity: "1g",
    minimumQuantity: "50,000枚〜／上限なし",
    image: spaPouch,
    alt: "SPA スポイトボトル型パウチの単体製品写真",
  },
  {
    code: "XRA",
    name: "スリムドーズ型",
    usage: "単回使い切りのロット印字対応に。",
    useCaseTags: ["単回使い切り", "ロット印字"],
    size: "38.5×90",
    capacity: "1g",
    minimumQuantity: "10,000枚〜／上限なし",
    image: xraPouch,
    alt: "XRA スリムドーズ型パウチの単体製品写真",
  },
];

const qualityStats = [
  {
    label: "製造経験",
    value: "1961年設立",
    note: "化粧品・医薬部外品の開発・製造経験",
  },
  {
    label: "品質規格",
    value: "ISO22716",
    note: "認証取得工場での製造体制",
  },
  {
    label: "製造スケール",
    value: "5〜350L",
    note: "乳化釜・真空連合装置を併用",
  },
  {
    label: "対応品目",
    value: "スキンケア／メイク／ヘア",
    note: "小ロット・多品種の条件確認",
  },
];

const qualityCapabilities = [
  {
    title: "小ロット・多品種",
    text: "さまざまな製造機器と充填設備を前提に、少量サイズでも内容物ごとに対応可否を確認します。",
  },
  {
    title: "研究・製造の近接体制",
    text: "本社・工場・研究機能が近い体制を活かし、処方・容器・充填条件の課題を関係部門連携で整理します。",
  },
  {
    title: "主要製造設備",
    text: "乳化釜、真空連合装置、化粧水製造装置、マイクロフルイダイザー、純水・ろ過装置などの設備条件を確認できます。",
  },
  {
    title: "充填・包装経験",
    text: "チューブ（超音波／ヒートシール）、化粧水、クリーム、加熱流し込み、フレキシコン、粉体などの充填方式を前提に仕様を調整します。",
  },
  {
    title: "条件確認",
    text: "内容物、粘度、比重、充填量、サイズ、数量、印刷方式を、見積もり前に揃えて確認します。",
  },
  {
    title: "見本確認と検査進行",
    text: "仕上がり、使用感、色再現、密封部への影響を見本で確認し、外観基準と参照番号で進行を管理します。",
  },
];

const useCases = [
  {
    title: "スキンケアサンプル",
    text: "化粧水・美容液・乳液・液状クリームなどのトライアル用途。",
  },
  {
    title: "ヘアケア・ボディケア",
    text: "オイル、トリートメント、ボディローションの少量配布。",
  },
  {
    title: "メイクアップ・UV",
    text: "下地、液状ファンデーション、UVケアの使用感確認。",
  },
  {
    title: "ホテル・サロン用",
    text: "アメニティ、施術後の携帯サンプル、セット販売の検討。",
  },
  {
    title: "健康食品・飲料関連",
    text: "液体・半固形の試供品条件を内容物ごとに確認。",
  },
  {
    title: "販促・イベント",
    text: "来場特典、会員特典、少量キャンペーン向けの条件整理。",
  },
];

const processItems = [
  {
    title: "条件ヒアリング",
    text: "サイズ、内容物、充填量、数量、印刷、納品条件を日本語で確認します。",
  },
  {
    title: "仕様案の整理",
    text: "形状、充填方法、印刷方式、前提条件を実現可能な範囲に調整します。",
  },
  {
    title: "見本・サンプル確認",
    text: "必要に応じて仕上がり、使用感、印刷再現性を確認します。",
  },
  {
    title: "正式お見積り",
    text: "確定条件に基づき、数量条件と進行条件を含めてご提示します。",
  },
  {
    title: "充填・納品調整",
    text: "支給バルク、検査、包装、納品条件を進行前に取り決めます。",
  },
];

const faqItems = [
  {
    question: "価格はいつ確認できますか？",
    answer: "仕様入力後に会社名・お名前・メールアドレス・電話番号と同意を送信いただくと、サーバー側で再計算した価格を表示します。",
  },
  {
    question: "バルク（内容物）はどのように扱いますか？",
    answer: "本サービスのお見積もりは、お客様支給のバルクを前提としています。内容物の性状や充填条件はご相談時に確認します。",
  },
  {
    question: "仕様が固まっていない場合はどうすればよいですか？",
    answer: "「ご相談」タブから、内容物・用途・想定数量だけをお知らせください。確定前の条件整理から進めます。",
  },
  {
    question: "スティック状や特殊形状も相談できますか？",
    answer: "現在の見積入力には連結サイズや用途別サイズを含みます。スティック状・特殊仕様は、入力条件とは別にご相談ください。",
  },
  {
    question: "サンプルだけ依頼できますか？",
    answer: "「サンプル」タブから、会社情報とご連絡先、ご相談内容を送信できます。",
  },
  {
    question: "お見積りの有効期限はどこで確認できますか？",
    answer: "価格表示後のお見積り結果に、発行日時と有効期限を表示します。",
  },
];

type LabPageProps = {
  searchParams: Promise<{ requestType?: string }>;
};

export default async function LabPage({ searchParams }: LabPageProps) {
  const params = await searchParams;
  const initialRequestType = params.requestType === "consultation"
    ? "consultation"
    : params.requestType === "sample"
      ? "sample"
      : "quotation";

  return (
    <>
      <a className={styles.skipLink} href="#lab-quote">お見積もりフォームへ</a>

      <header className={styles.siteHeader}>
        <div className={styles.headerInner}>
          <p className={styles.headerBrand}>パウチ充填ラボ</p>
          <nav className={styles.headerNav} aria-label="メインナビゲーション">
            <ul>
              {headerNavItems.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className={styles.labMain}>
        <section className={styles.hero} aria-labelledby="lab-brand">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>
                <span aria-hidden="true">化粧品・トイレタリー向け</span>
                SMALL-LOT POUCH FILLING
              </p>
              <h1 id="lab-brand" className={styles.brand}>
                小容量パウチを、1万枚から仕様入力だけで進める。
              </h1>
              <p className={styles.affiliation}>Epackage Labのパウチ充填専門サービス</p>
              <p className={styles.lead}>
                ラウンド・ボトル・チューブなど6形状を比較しながら、充填量・チャンバー・印刷条件を整理。お客様支給バルクを、日本語サポートで見積もり・サンプル依頼まで進められます。
              </p>
              <div className={styles.actions}>
                <a className={styles.primaryAction} href="#lab-quote">
                  形状と数量を選んで見積もりを確認
                </a>
                <a className={styles.secondaryAction} href="?requestType=consultation#lab-quote-consultation">
                  条件が未確定なら相談から始める
                </a>
              </div>
              <ul className={styles.heroProof} aria-label="サービスの信頼性">
                <li>GMP準拠の品質管理</li>
                <li>ISO22716準拠システム</li>
                <li>見本確認・検品</li>
                <li>見積もり・相談無料</li>
              </ul>
              <a className={styles.quietLink} href="#lab-products">製品仕様を見る</a>
            </div>
            <div className={styles.heroMedia}>
              <ul className={styles.heroShapeGrid} aria-label="対応パウチ形状の製品イメージ">
                {pouchShapes.map((shape, index) => (
                  <li key={shape.code}>
                    <figure className={styles.heroShapeTile}>
                      <Image
                        src={shape.image}
                        alt={shape.alt}
                        fill
                        priority={index < 2}
                        sizes="(min-width: 1024px) 22vw, 46vw"
                        className={styles.heroShapeImage}
                      />
                    </figure>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className={styles.specStrip}>
            <dl className={styles.heroStats}>
              {heroSpecs.map((spec) => (
                <div key={spec.label}>
                  <dt>{spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
            <p className={styles.specNote}>
              ※充填量と最小ロットは形状により異なります。SPAは50,000枚〜です。
            </p>
          </div>
        </section>

        <section className={`${styles.section} ${styles.valueSection}`} aria-labelledby="lab-value-heading">
          <div className={styles.sectionHead}>
            <p className={styles.sectionLabel}>価値｜BENEFITS</p>
            <h2 className={styles.sectionHeading} id="lab-value-heading">
              仕様が未確定でも、小容量パウチの検討を前に進められる
            </h2>
            <p className={styles.sectionLead}>
              条件が固まっていないと依頼しにくいという課題に対して、入力できる項目から整理し、未確定項目はご相談として切り替えられる進め方を用意しています。
            </p>
          </div>
          <ul className={styles.valueGrid}>
            {conversionBenefits.map((benefit) => (
              <li key={benefit.title} className={styles.valueCard}>
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="lab-products" className={`${styles.section} ${styles.productSection}`} aria-labelledby="lab-products-heading">
          <div className={styles.sectionHead}>
            <p className={styles.sectionLabel}>製品仕様｜PRODUCTS</p>
            <h2 className={styles.sectionHeading} id="lab-products-heading">
              6形状を、最短10,000枚から製造
            </h2>
            <p className={styles.sectionLead}>
              見本用の小ロットではなく、量産前提の小容量パウチとして条件を揃えます。形状・充填量・連結・印刷を選び、最短10,000枚から製造に進められます。SPAのみ50,000枚からです。上限数量の設定はありません。
            </p>
          </div>
          <ul className={styles.shapeCardGrid}>
            {pouchShapes.map((shape) => (
              <li key={shape.code} className={styles.shapeCard}>
                <figure className={styles.shapeFigure}>
                  <Image
                    src={shape.image}
                    alt={shape.alt}
                    fill
                    sizes="(min-width: 1024px) 360px, (min-width: 560px) 45vw, 92vw"
                    className={styles.shapeImage}
                  />
                </figure>
                <div className={styles.shapeBody}>
                  <p className={styles.shapeCode}>{shape.code}</p>
                  <h3 className={styles.shapeName}>{shape.name}</h3>
                  <p className={styles.shapeUsage}>{shape.usage}</p>
                  <ul className={styles.shapeTags} aria-label={`${shape.code}の用途`}>
                    {shape.useCaseTags.map((tag) => <li key={tag}>{tag}</li>)}
                  </ul>
                  <dl className={styles.shapeMeta}>
                    <div>
                      <dt>サイズ例</dt>
                      <dd>{shape.size}</dd>
                    </div>
                    <div>
                      <dt>充填量</dt>
                      <dd>{shape.capacity}</dd>
                    </div>
                    <div>
                      <dt>数量</dt>
                      <dd>{shape.minimumQuantity}</dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ul>
          <div className={styles.productionPanel}>
            <p className={styles.productionLabel}>量産条件｜PRODUCTION</p>
            <dl className={styles.productionGrid}>
              <div>
                <dt>充填量</dt>
                <dd>形状別条件</dd>
              </div>
              <div>
                <dt>チャンバー</dt>
                <dd>1〜4室</dd>
              </div>
              <div>
                <dt>印刷</dt>
                <dd>デジタル／グラビア<small>1〜10色</small></dd>
              </div>
              <div>
                <dt>最小ロット</dt>
                <dd>10,000枚〜<small>SPAは50,000枚〜</small></dd>
              </div>
              <div>
                <dt>バルク</dt>
                <dd>お客様支給</dd>
              </div>
            </dl>
          </div>
          <p className={styles.sectionNote}>
            ※仕上げ・表面仕様は、見本確認と仕様確定時に承ります。掲載画像はイメージです。
          </p>
        </section>

        <section id="lab-quote" className={`${styles.section} ${styles.quoteSection}`} aria-labelledby="lab-quote-heading">
          <div className={styles.quoteLayout}>
            <div className={styles.quoteIntro}>
              <p className={styles.sectionLabel}>見積もり｜ESTIMATE</p>
              <h2 className={styles.sectionHeading} id="lab-quote-heading">仕様を入力して価格を確認</h2>
              <p className={styles.sectionLead}>
                サイズ・充填量・数量などの条件は、リード情報の送信前でも自由に組み合わせて確認できます。単価と総額は、会社情報とご連絡先、同意の確認後に表示します。
              </p>
              <ol className={styles.quoteGuide}>
                <li>
                  <strong>仕様の入力</strong>
                  <span>形状・充填量・チャンバー・印刷・数量を整理します。</span>
                </li>
                <li>
                  <strong>価格表示の条件</strong>
                  <span>会社名・お名前・連絡先・同意を送信します。</span>
                </li>
                <li>
                  <strong>相談のみでも可</strong>
                  <span>ご相談・サンプル依頼も同じフォームから送れます。</span>
                </li>
              </ol>
            </div>
            <div id="lab-quote-consultation" className={styles.quoteForm}>
              <LabRequestForm initialRequestType={initialRequestType} />
            </div>
          </div>
        </section>

        <section id="lab-quality" className={styles.section} aria-labelledby="lab-quality-heading">
          <div className={styles.qualityGrid}>
            <figure className={styles.qualityMedia}>
              <Image
                src={qualityControl}
                alt="充填後のパウチを検品している作業イメージ"
                width={1024}
                height={1024}
                sizes="(min-width: 1024px) 40vw, 100vw"
                className={styles.roundedImage}
              />
            </figure>
            <div className={styles.qualityBody}>
              <div className={styles.sectionHead}>
                <p className={styles.sectionLabel}>充填・品質体制｜QUALITY</p>
                <h2 className={styles.sectionHeading} id="lab-quality-heading">充填条件を確定しやすくする体制</h2>
                <p className={styles.sectionLead}>
                  1961年設立以来の化粧品・医薬部外品製造経験と、ISO22716認証取得工場の品質体制を条件整理に活かします。処方・設備・充填・検査の確認項目を見積もり前に揃え、小ロット・多品種でも進行条件を見失わないようにします。
                </p>
              </div>
              <dl className={styles.qualityStats} aria-label="品質体制の指標">
                {qualityStats.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                    <p>{item.note}</p>
                  </div>
                ))}
              </dl>
              <dl className={styles.assuranceGrid}>
                {qualityCapabilities.map((item) => (
                  <div key={item.title}>
                    <dt>{item.title}</dt>
                    <dd>{item.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.usecaseSection}`} aria-labelledby="lab-usecase-heading">
          <div className={styles.sectionHead}>
            <p className={styles.sectionLabel}>相談しやすい用途｜USE CASES</p>
            <h2 className={styles.sectionHeading} id="lab-usecase-heading">化粧品・トイレタリーの小容量パウチ</h2>
            <p className={styles.sectionLead}>
              用途から必要な容量・形状・数量を考えやすくするための相談例です。内容物の性状により、対応可否を確認します。
            </p>
          </div>
          <ul className={styles.usecaseGrid}>
            {useCases.map((useCase) => (
              <li key={useCase.title} className={styles.usecaseCard}>
                <h3>{useCase.title}</h3>
                <p>{useCase.text}</p>
              </li>
            ))}
          </ul>
          <div className={styles.sectionActions}>
            <a className={styles.buttonPrimary} href="#lab-quote">用途を相談する</a>
          </div>
        </section>

        <section id="lab-process" className={styles.section} aria-labelledby="lab-process-heading">
          <div className={styles.sectionHead}>
            <p className={styles.sectionLabel}>進め方｜PROCESS</p>
            <h2 className={styles.sectionHeading} id="lab-process-heading">仕様の見極めから納品条件まで</h2>
          </div>
          <ol className={styles.process}>
            {processItems.map((item, index) => (
              <li key={item.title}>
                <span className={styles.processNumber} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className={styles.itemTitle}>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={`${styles.section} ${styles.faqSection}`} aria-labelledby="lab-faq-heading">
          <div className={styles.sectionHead}>
            <p className={styles.sectionLabel}>よくあるご質問｜FAQ</p>
            <h2 className={styles.sectionHeading} id="lab-faq-heading">お見積もりとサンプル依頼の前提</h2>
          </div>
          <div className={styles.faqList}>
            {faqItems.map((item) => (
              <details key={item.question} className={styles.faqItem}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="lab-contact" className={styles.contactBand} aria-labelledby="lab-contact-heading">
          <div className={styles.contactInner}>
            <div>
              <p className={styles.contactLabel}>サンプル・ご相談｜CONTACT</p>
              <h2 className={styles.contactHeading} id="lab-contact-heading">まずは条件だけでも送ってください</h2>
              <p className={styles.contactLead}>
                仕様が固まっていない場合は、まず内容物と用途をお知らせください。日本語での条件整理から進めます。
              </p>
            </div>
            <div className={styles.contactActions}>
              <a className={styles.buttonInverse} href="#lab-quote">見積条件を入力する</a>
              <a className={styles.contactLink} href="mailto:shapepouch@package-lab.com?subject=サンプル・ご相談">
                shapepouch@package-lab.com
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <p className={styles.footerBrand}>パウチ充填ラボ</p>
            <p className={styles.footerAffiliation}>Epackage Labのパウチ充填専門サービス</p>
            <p className={styles.footerNote}>
              掲載画像はイメージです。仕様・対応範囲はお見積もり時に確認します。
            </p>
          </div>
          <nav aria-label="フッターナビゲーション">
            <ul className={styles.footerNav}>
              <li><a href="#lab-products">製品仕様</a></li>
              <li><a href="#lab-quote">見積もり</a></li>
              <li><a href="#lab-quality">品質体制</a></li>
              <li><a href="#lab-process">進め方</a></li>
              <li><a href="#lab-contact">お問い合わせ</a></li>
            </ul>
          </nav>
        </div>
        <p className={styles.copyright}>&copy; パウチ充填ラボ</p>
      </footer>
    </>
  );
}
