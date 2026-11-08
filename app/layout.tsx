import type { Metadata, Viewport } from "next";
import { LangProvider } from "@/components/LangProvider";
// IBM Plex from npm files, bundled at build: the build never fetches
// Google Fonts (it failed CI on 2026-11-07 and is blocked in mainland
// China). Chinese uses the system face (PingFang / YaHei).
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
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
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
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
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-[var(--radius-sm)] focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
        >
          Skip to content
        </a>
        {/* Document scrolls. main is a column so the selector can fill the viewport. */}
        <LangProvider initial="zh">
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
