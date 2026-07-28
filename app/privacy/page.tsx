import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · OLTC Selector",
  description: "Privacy policy for the personal OLTC Selector project.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" titleZh="隐私政策">
      <p className="text-[0.8125rem] text-[var(--color-muted)]">
        Last updated: 27 July 2026 · 更新日期：2026 年 7 月 27 日
      </p>

      <LegalSection title="1. What this site is / 本站性质">
        <p>
          This website (“OLTC Selector”) is a{" "}
          <strong>private, non-commercial project</strong> built for learning
          and convenience. It is{" "}
          <strong>
            not an official product of any manufacturer, employer, or brand
          </strong>
          , and is not endorsed by them.
        </p>
        <p>
          本站为<strong>私人、非商业项目</strong>
          ，仅供学习与自用便利。
          <strong>并非任何制造商、雇主或品牌的官方产品</strong>
          ，亦不代表其立场或背书。
        </p>
      </LegalSection>

      <LegalSection title="2. Data we collect / 我们收集的数据">
        <p>
          <strong>We do not operate user accounts.</strong> Selection runs in
          your browser. Duty parameters you enter are processed locally and are
          not intentionally sent to a backend server of this project.
        </p>
        <p>
          <strong>本站不设用户账号。</strong>
          选型在浏览器本地完成；您输入的工况参数不会被本项目故意上传至自有后端服务器。
        </p>
        <p>
          Hosting (e.g. GitHub Pages) may automatically log standard technical
          data such as IP address, user agent, and request time. That data is
          controlled by the host’s policies, not by a separate analytics product
          of this project.
        </p>
        <p>
          托管方（如 GitHub Pages）可能自动记录 IP、浏览器类型、访问时间等常规技术日志，适用托管方政策。
        </p>
      </LegalSection>

      <LegalSection title="3. Cookies & local storage / Cookie 与本地存储">
        <p>
          This site does not use advertising or tracking cookies. The browser
          may store temporary state needed for the page to work. You can clear
          site data in your browser settings at any time.
        </p>
        <p>
          本站不使用广告或追踪 Cookie。浏览器可能保存页面运行所需的临时状态；您可随时在浏览器中清除本站数据。
        </p>
      </LegalSection>

      <LegalSection title="4. Third parties / 第三方">
        <p>
          Fonts or scripts may load from third-party CDNs (for example Google
          Fonts). Those providers process requests under their own privacy
          policies. Source code may be hosted on GitHub.
        </p>
        <p>
          字体或脚本可能来自第三方 CDN（如 Google Fonts），适用其隐私政策。源码可能托管于 GitHub。
        </p>
      </LegalSection>

      <LegalSection title="5. Contact / 联系">
        <p>
          For privacy questions about this personal project, open an issue on
          the public repository:{" "}
          <a
            className="text-[var(--color-accent)] hover:underline"
            href="https://github.com/erict16/oltc-selector"
          >
            github.com/erict16/oltc-selector
          </a>
          .
        </p>
        <p>
          隐私相关问题请在公开仓库提交 Issue（链接同上）。
        </p>
      </LegalSection>
    </LegalPage>
  );
}
