import { notoSansJP, notoSansMono, notoSerifJP } from "./fonts";
import "../design-system/design-tokens.v1.css";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 번역 확장 프로그램(Trancy 등)이 <html>에 속성을 주입해도 하이드레이션 경고가 발생하지 않도록 억제
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${notoSerifJP.variable} ${notoSansMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
