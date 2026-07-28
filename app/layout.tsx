import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

/** Must match next.config basePath for GH Pages favicon URLs */
const basePath = process.env.GH_PAGES === "true" ? "/oltc-selector" : "";

export const metadata: Metadata = {
  title: "OLTC Selector · 有载开关选型",
  description:
    "Private OLTC type-designation helper. Indicative only — not an official manufacturer tool or OS.",
  metadataBase: new URL(
    basePath
      ? "https://erict16.github.io/oltc-selector"
      : "http://127.0.0.1:3000",
  ),
  icons: {
    icon: [
      { url: `${basePath}/favicon.svg`, type: "image/svg+xml" },
      { url: `${basePath}/icon.svg`, type: "image/svg+xml" },
    ],
    shortcut: `${basePath}/favicon.svg`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href={`${basePath}/favicon.svg`} type="image/svg+xml" />
        <link rel="shortcut icon" href={`${basePath}/favicon.svg`} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <div className="flex min-h-dvh flex-col">
          <main className="flex flex-1 flex-col justify-center">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
