import Image from "next/image";

import styles from "./page.module.css";
import { LabRequestForm } from "./lab-request-form";
import { EmbeddedQuoteDraftForm } from "./embedded-quote-draft-form";
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
  { href: "#lab-liquids", label: "対応液剤" },
  { href: "/lab#lab-quote", label: "見積もり" },
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
    usage: "美容液・化粧水などのボトルタイプに。",
    useCaseTags: ["美容液", "化粧水", "ボトルタイプ"],
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
    usage: "美容液などのポイント付与に。",
    useCaseTags: ["美容液", "ポイント付け"],
    size: "35×80",
    capacity: "1g",
    minimumQuantity: "50,000枚〜／上限なし",
    image: spaPouch,
    alt: "SPA スポイトボトル型パウチの単体製品写真",
  },
  {
    code: "XRA",
    name: "ラウンド型",
    usage: "単回使い切りのロット印字対応に。",
    useCaseTags: ["単回使い切り", "ロット印字"],
    size: "38.5×90",
    capacity: "1g",
    minimumQuantity: "10,000枚〜／上限なし",
    image: xraPouch,
    alt: "XRA ラウンド型パウチの単体製品写真",
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

const liquidCategories = [
  {
    title: "スキンケア・基礎化粧品",
    examples: ["化粧水", "美容液", "乳液", "液状クリーム"],
    note: "水系・乳化系のトライアルや単回サンプルに適した少量充填です。",
  },
  {
    title: "ヘア・ボディケア",
    examples: ["トリートメント", "ヘアオイル", "ボディローション"],
    note: "粘度・比重に合わせて充填口と計量条件を確認します。",
  },
  {
    title: "メイクアップ・UVケア",
    examples: ["化粧下地", "液状ファンデーション", "UVミルク"],
    note: "顔料分散や沈降の安定性は、見本充填で確認します。",
  },
  {
    title: "クレンジング・トイレタリー",
    examples: ["クレンジング", "洗顔料", "アフターシャンローション"],
    note: "低粘度から高粘度まで、内容物の性状ごとに可否を整理します。",
  },
];

const liquidChecks = [
  {
    label: "粘度・比重",
    value: "流動性から高粘度まで、充填方式と計量精度を確認します。",
  },
  {
    label: "分散・安定性",
    value: "分離・沈降・経時変化を支給バルクの見本で確認します。",
  },
  {
    label: "材料適合性",
    value: "液剤とフィルム、シール部の相容性を確認します。",
  },
  {
    label: "衛生・品質条件",
    value: "GMP準拠の品質管理とISO22716準拠システムで進行します。",
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
    title: "クレンジング・洗い流し",
    text: "クレンジングオイル、洗顔料、パック液などの使用感確認。",
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

type FaqItem = {
  question: string;
  answer: string;
};

type FaqGroup = {
  title: string;
  lead: string;
  items: FaqItem[];
};

const faqGroups: FaqGroup[] = [
  {
    title: "見積もり・会員登録",
    lead: "Web見積もりの入力範囲、価格確認、会員登録後の流れです。",
    items: [
      {
        question: "Web見積もりはどのように進みますか？",
        answer: "デザイン・充填量・サイズ・色数・数量を選んで下書き条件を送信すると、会員登録またはログイン後に印刷方法の候補を選択できます。選択した条件で正式見積もりを作成します。",
      },
      {
        question: "価格はいつ確認できますか？",
        answer: "仕様入力後に会社名・お名前・メールアドレス・電話番号と同意を送信いただくと、サーバー側で再計算した価格を表示します。",
      },
      {
        question: "下書き条件のURLはどれくらい使えますか？",
        answer: "発行から60分間です。期限を過ぎた場合は、同じ条件を入力し直して再度発行してください。",
      },
      {
        question: "お見積書の有効期限はどこで確認できますか？",
        answer: "お見積書に発行日と有効期限を表示します。期限を過ぎた条件は、原材料・印刷条件の見直し後にお見積もりを更新することがあります。",
      },
      {
        question: "作成した見積もりは後から確認できますか？",
        answer: "会員アカウントの見積もり履歴から、条件・金額・状態・PDFを確認できます。作成済みの条件をコピーして再見積もりも可能です。",
      },
    ],
  },
  {
    title: "充填内容物・支給バルク",
    lead: "化粧品・トイレタリーの液剤を中心に、支給バルクの条件を確認します。",
    items: [
      {
        question: "どのような内容物を充填できますか？",
        answer: "化粧水・美容液・乳液・液状クリームなどのスキンケア液剤を中心に、ヘアケア・ボディケア・メイクアップ・UVケア・クレンジング・トイレタリー向け液剤を想定しています。処方により可否が変わるため、支給バルクと見本充填で確認します。",
      },
      {
        question: "バルク（内容物）はどのように扱いますか？",
        answer: "本サービスのお見積もりは、お客様支給のバルクを前提としています。内容物・粘度・比重・充填温度などの性状や充填条件は、ご相談時に確認します。",
      },
      {
        question: "支給バルクの受け渡し形式は事前に教えてもらえますか？",
        answer: "ご発注確定後に、支給形式・受け渡し方法・確認事項を個別にご案内します。公開ページでは条件が確定していない内容を固定でお伝えしません。",
      },
      {
        question: "粘度が高い液剤やオイル系も相談できますか？",
        answer: "低粘度から高粘度まで相談可能です。ただし、成分とフィルム・シール部の相容性、分散・沈降の安定性、充填口詰まりの リスク等により可否が変わるため、見本確認を推奨します。",
      },
      {
        question: "医薬部外品や特殊用途の液剤も相談できますか？",
        answer: "処方・表示・法規制上の扱いにより確認が必要です。まずは内容物、用途、想定数量、希望時期をご相談ください。条件確認後に進行可否をご案内します。",
      },
    ],
  },
  {
    title: "サンプル依頼",
    lead: "現在ご用意しているサンプル構成と、ご依頼方法です。",
    items: [
      {
        question: "サンプルは有料ですか？",
        answer: "無料でご用意しています。現在は、あらかじめ決められた1セットのみのお渡しです。",
      },
      {
        question: "サンプルの内容は選べますか？",
        answer: "現在のご用意は1セット限定です。構成はRDA 50×80mm、TUA 35×80mm、BTA 35×80mmです。個別の形状や充填量での現物確認は、正式条件としてご相談ください。",
      },
      {
        question: "サンプルだけ依頼できますか？",
        answer: "「サンプル」タブから、会社情報とご連絡先、ご相談内容を送信できます。サンプル確認後に、量産条件の整理へ進めます。",
      },
    ],
  },
  {
    title: "製造・納期・お支払い",
    lead: "最小ロット、標準的な進行期間、お支払い条件の前提です。",
    items: [
      {
        question: "最小ロットはいくつですか？",
        answer: "基本は10,000枚からです。SPAは50,000枚からです。Web入力の上限数量の設定はありませんが、数量・サイズ・印刷条件により実施可否を確認します。",
      },
      {
        question: "納期はどのくらいかかりますか？",
        answer: "データ到着後、約2ヶ月を標準的な目安としています。デザイン確定、バルク到着、校正・見本確認、印刷方式、数量により前後するため、正式条件を確認後に個別にご案内します。",
      },
      {
        question: "お支払い条件を教えてください。",
        answer: "基本は後払いです。ただし新規お取引先様の場合は、前払いをお願いすることがあります。取引条件は事前審査のうえ確定します。",
      },
      {
        question: "スティック状や特殊形状も相談できますか？",
        answer: "現在の見積入力には連結サイズや用途別サイズを含みます。スティック状・特殊仕様は、入力条件とは別にご相談ください。",
      },
    ],
  },
  {
    title: "ご注文窓口・生産情報",
    lead: "品質責任と情報管理のため、生産情報とご発注はEpackage Lab窓口で一元管理します。",
    items: [
      {
        question: "生産工場の所在地を教えてください。",
        answer: "製造は日本国内の認証取得生産体制で管理しています。工場名・所在地・担当者などの生産情報は一般公開しておらず、NDA締結と発注条件確定後に必要な範囲のみご案内します。",
      },
      {
        question: "生産工場へ直接問い合わせや発注はできますか？",
        answer: "できません。ご相談、お見積もり、ご発注、仕様変更、品質対応は、すべてEpackage Labの専任窓口で一括管理します。品質責任と情報管理を明確にするため、直接のご依頼はお控えください。",
      },
      {
        question: "工場見学や監査は可能ですか？",
        answer: "NDA・ご契約後に、目的と範囲によって対応を調整します。ご見学の場合もEpackage Labが立会い、直接の交渉や発注は行いません。",
      },
      {
        question: "支給バルクの送付先はどこですか？",
        answer: "ご発注確定後、数量・納期・内容物条件に合わせて正式な送付先と受け渡し条件をご案内します。ご案内前の個別送付は避けてください。",
      },
      {
        question: "進行中の相談・変更・クレームはどこに連絡すればよいですか？",
        answer: "すべてEpackage Labの窓口にご連絡ください。フォーム・メールのどちらからでも日本語で対応できます。生産現場との直接調整が必要な場合はEpackage Labが間に入ります。",
      },
    ],
  },
  {
    title: "機密保持・その他のご相談",
    lead: "処方・デザイン情報の取り扱いと、進行前の確認方法です。",
    items: [
      {
        question: "処方やデザインデータの機密保持はできますか？",
        answer: "NDAを締結したうえで進行します。処方・アートワーク・見積条件は関係者以外が閲覧できないようアクセスを制限します。",
      },
      {
        question: "仕様が固まっていない場合はどうすればよいですか？",
        answer: "「ご相談」タブから、内容物・用途・想定数量だけをお知らせください。確定前の条件整理から進めます。",
      },
      {
        question: "デザインデータや印刷校正はどのように進みますか？",
        answer: "ご入稿いただいたデータをもとに、色再現・文字切れ・密封部への影響を確認します。必要に応じて校正・見本確認を行い、承認後に量産へ進めます。",
      },
      {
        question: "品質チェックはどのように行われますか？",
        answer: "GMP準拠の品質管理とISO22716準拠システムを前提に、充填量・外観・密封状態などの確認を行います。詳細な検査項目は条件確定時に取り決めます。",
      },
    ],
  },
];

type LabPageProps = {
  searchParams: Promise<{ requestType?: string }>;
};

type LabContactRequestType = "consultation" | "sample";

export default async function LabPage({ searchParams }: LabPageProps) {
  const params = await searchParams;
  const initialRequestType: LabContactRequestType = params.requestType === "sample"
    ? "sample"
    : "consultation";

  return (
    <>
      <a className={styles.skipLink} href="/lab#lab-quote">お見積もりフォームへ</a>

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
                <span aria-hidden="true">化粧品液剤の小ロット充填</span>
                COSMETIC LIQUID POUCH FILLING
              </p>
              <h1 id="lab-brand" className={styles.brand}>
                化粧品の液剤を、小容量パウチに1万枚から充填。
              </h1>
              <p className={styles.affiliation}>Epackage Labのパウチ充填専門サービス</p>
              <p className={styles.lead}>
                化粧水・美容液・乳液などの液剤を、ラウンド・チューブ・ボトルなど6形状へ充填。お客様支給バルクを前提に、充填量・チャンバー・印刷条件を日本語サポートで整理します。
              </p>
              <div className={styles.actions}>
                <a className={styles.primaryAction} href="/lab#lab-quote">
                  液剤と形状を選んで見積もりを確認
                </a>
                <a className={styles.secondaryAction} href="?requestType=consultation#lab-request">
                  条件が未確定なら相談から始める
                </a>
              </div>
              <ul className={styles.heroProof} aria-label="対応液剤とサービスの信頼性">
                <li>化粧水・美容液・乳液</li>
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

        <section id="lab-liquids" className={`${styles.section} ${styles.liquidSection}`} aria-labelledby="lab-liquids-heading">
          <div className={styles.sectionHead}>
            <p className={styles.sectionLabel}>対応液剤｜LIQUIDS</p>
            <h2 className={styles.sectionHeading} id="lab-liquids-heading">
              充填するのは、化粧品・トイレタリーの液剤です
            </h2>
            <p className={styles.sectionLead}>
              スキンケアを中心に、美容液・乳液・ヘアケア・UVケアなどの液剤を小容量パウチへ充填します。支給バルクの処方条件を確認しながら、サンプルから量産へ進められます。
            </p>
          </div>
          <ul className={styles.liquidGrid}>
            {liquidCategories.map((category) => (
              <li key={category.title} className={styles.liquidCard}>
                <h3>{category.title}</h3>
                <ul className={styles.liquidExamples} aria-label={`${category.title}の例`}>
                  {category.examples.map((example) => <li key={example}>{example}</li>)}
                </ul>
                <p>{category.note}</p>
              </li>
            ))}
          </ul>
          <div className={styles.liquidCheckPanel}>
            <div>
              <p className={styles.productionLabel}>充填適性確認｜CHECK</p>
              <p className={styles.liquidCheckLead}>
                同じ化粧品液剤でも処方によって条件が変わります。次の項目を支給バルクと見本充填で確認します。
              </p>
            </div>
            <dl className={styles.liquidCheckGrid}>
              {liquidChecks.map((check) => (
                <div key={check.label}>
                  <dt>{check.label}</dt>
                  <dd>{check.value}</dd>
                </div>
              ))}
            </dl>
            <p className={styles.sectionNote}>
              ※対応可否は処方・粘度・比重・材料適合性により変わります。支給バルクの見本確認後に確定します。
            </p>
          </div>
        </section>

        <section id="lab-products" className={`${styles.section} ${styles.productSection}`} aria-labelledby="lab-products-heading">
          <div className={styles.sectionHead}>
            <p className={styles.sectionLabel}>製品仕様｜PRODUCTS</p>
            <h2 className={styles.sectionHeading} id="lab-products-heading">
              化粧品液剤を、6形状で最短10,000枚から製造
            </h2>
            <p className={styles.sectionLead}>
              見本用の小ロットではなく、量産前提の小容量パウチとして条件を揃えます。化粧水・美容液・乳液などの液剤に合わせて形状・充填量・連結・印刷を選べます。SPAのみ50,000枚からです。上限数量の設定はありません。
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

        <section
          id="lab-quote"
          className={`${styles.section} ${styles.quoteSection}`}
          aria-labelledby="lab-quote-heading"
        >
          <div className={styles.sectionHead}>
            <p className={styles.sectionLabel}>見積もり｜ESTIMATE</p>
            <h2 className={styles.sectionHeading} id="lab-quote-heading">
              必要条件だけ入力して見積もりを開始
            </h2>
            <p className={styles.sectionLead}>
              形状・充填量・サイズ・色数・数量を選ぶと、会員登録後に印刷方法の候補を選んで正式見積もりへ進めます。
            </p>
          </div>
          <div className={styles.quoteForm}>
            <EmbeddedQuoteDraftForm />
          </div>
        </section>

        <section id="lab-request" className={`${styles.section} ${styles.requestSection}`} aria-labelledby="lab-request-heading">
          <div className={styles.sectionHead}>
            <p className={styles.sectionLabel}>サンプル・ご相談｜REQUEST</p>
            <h2 className={styles.sectionHeading} id="lab-request-heading">
              条件が未確定なら相談から進める
            </h2>
            <p className={styles.sectionLead}>
              正式見積もりの条件がまだ固まらない場合は、内容物・用途・希望時期をご相談ください。
            </p>
          </div>
          <div className={styles.requestShell}>
            <div id="lab-quote-consultation">
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
            <a className={styles.buttonPrimary} href="?requestType=consultation#lab-request">用途を相談する</a>
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

        <section id="lab-faq" className={`${styles.section} ${styles.faqSection}`} aria-labelledby="lab-faq-heading">
          <div className={styles.sectionHead}>
            <p className={styles.sectionLabel}>よくあるご質問｜FAQ</p>
            <h2 className={styles.sectionHeading} id="lab-faq-heading">お見積もりとサンプル依頼の前提</h2>
            <p className={styles.sectionLead}>
              条件入力から量産までによく確認される事項を、カテゴリー別に整理しています。個別条件はご相談後に確定します。
            </p>
          </div>
          <div className={styles.faqGroups}>
            {faqGroups.map((group) => (
              <section key={group.title} className={styles.faqGroup} aria-label={group.title}>
                <div className={styles.faqGroupHead}>
                  <h3 className={styles.faqGroupTitle}>{group.title}</h3>
                  <p>{group.lead}</p>
                </div>
                <div className={styles.faqList}>
                  {group.items.map((item) => (
                    <details key={item.question} className={styles.faqItem}>
                      <summary>{item.question}</summary>
                      <p>{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
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
              <a className={styles.buttonInverse} href="/lab#lab-quote">見積条件を入力する</a>
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
              <li><a href="/lab#lab-quote">見積もり</a></li>
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
