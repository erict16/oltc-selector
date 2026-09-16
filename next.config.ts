import type { NextConfig } from "next";

/** GitHub project pages: https://erict16.github.io/oltc-selector/ */
const ghPages = process.env.GH_PAGES === "true";
const basePath = ghPages ? "/oltc-selector" : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
