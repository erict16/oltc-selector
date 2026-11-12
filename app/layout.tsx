import type { Metadata, Viewport } from "next";
import { LangProvider, SkipLink } from "@/components/LangProvider";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
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
