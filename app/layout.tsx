import type { Metadata, Viewport } from "next";
import { LangProvider, SkipLink } from "@/components/LangProvider";
import { LANG_OPTIONS, LANG_STORAGE_KEY } from "@/lib/i18n";
// IBM Plex from npm files, bundled at build: the build never fetches
// Google Fonts (it failed CI on 2026-11-07 and is blocked in mainland
// China). Chinese uses the system face (PingFang / YaHei).
// Latin, Latin Extended (tr) and Vietnamese only: no Cyrillic or Greek text here.
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-ext-400.css";
import "@fontsource/ibm-plex-sans/vietnamese-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-ext-500.css";
import "@fontsource/ibm-plex-sans/vietnamese-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-sans/latin-ext-600.css";
import "@fontsource/ibm-plex-sans/vietnamese-600.css";
import "@fontsource/ibm-plex-sans/latin-700.css";
import "@fontsource/ibm-plex-sans/latin-ext-700.css";
import "@fontsource/ibm-plex-sans/vietnamese-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-ext-400.css";
import "@fontsource/ibm-plex-mono/vietnamese-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-ext-500.css";
import "@fontsource/ibm-plex-mono/vietnamese-500.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-ext-600.css";
import "@fontsource/ibm-plex-mono/vietnamese-600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "OLTC Selector · 有载开关选型",
  description:
    "Private OLTC type-designation helper. Indicative only — not an official manufacturer tool or OS.",
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://127.0.0.1:3000",
  ),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

/**
 * The static page is Chinese; a browser on another language switched only
 * after hydration, so English readers saw Chinese flash first. This runs
 * before paint, picks the language as lib/i18n firstLang does, and hides
 * the page until React has drawn it in that language (LangProvider lifts
 * it; 2.5 s at most, so a failed script never leaves it blank).
 */
const LANG_WAIT = `(function(){try{var ids=${JSON.stringify(LANG_OPTIONS.map((o) => o.id))},k=${JSON.stringify(LANG_STORAGE_KEY)},v=null;try{v=localStorage.getItem(k)}catch(e){}if(ids.indexOf(v)<0){var c=("; "+document.cookie).split("; "+k+"=")[1];v=c?decodeURIComponent(c.split(";")[0]):null}if(ids.indexOf(v)<0){v="en";var L=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language];for(var i=0;i<L.length;i++){var t=String(L[i]).toLowerCase().split(/[-_]/)[0];if(t==="in")t="id";if(ids.indexOf(t)>=0){v=t;break}}}if(v!=="zh"){var d=document.documentElement;d.classList.add("lang-wait");setTimeout(function(){d.classList.remove("lang-wait")},2500)}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANG_WAIT }} />
      </head>
      <body className="antialiased">
        {/* Document scrolls. main is a column so the selector can fill the viewport. */}
        <LangProvider initial="zh">
          <SkipLink />
          <div className="flex min-h-dvh flex-col">
            <main id="main" className="flex min-w-0 flex-1 flex-col">
              {children}
            </main>
          </div>
        </LangProvider>
      </body>
    </html>
  );
}
