import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use · OLTC Selector",
  description: "Terms of use for the personal OLTC Selector project.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" titleZh="使用条款">
      <p className="text-[0.8125rem] text-[var(--color-muted)]">
        Last updated: 27 July 2026 · 更新日期：2026 年 7 月 27 日
      </p>

      <LegalSection title="1. Private project / 私人项目">
        <p>
          By using this site you acknowledge that it is a{" "}
          <strong>private project</strong> of the author. It is
          provided for educational and convenience purposes only. It is{" "}
          <strong>
            not an official tool, quotation system, order sheet (OS), or sales
            commitment
          </strong>{" "}
          of any company, including any on-load tap-changer manufacturer.
        </p>
        <p>
          使用本站即表示您知悉：本站为作者的<strong>私人项目</strong>
          ，仅供学习与便利参考。
          <strong>
            不是任何公司的官方工具、报价系统、OS 订单或销售承诺
          </strong>
          ，包括任何有载分接开关制造商。
        </p>
      </LegalSection>

      <LegalSection title="2. No professional advice / 非专业意见">
        <p>
          Outputs are <strong>indicative type-designation suggestions</strong>{" "}
          based on simplified rules and publicly described catalogue axes. They
          are <strong>not engineering design, not type-test approval, and not
          a substitute for manufacturer engineering confirmation</strong>.
        </p>
        <p>
          输出仅为基于简化规则与公开目录轴的
          <strong>示意性型号建议</strong>。
          <strong>
            不构成工程设计、型式试验认可，也不能替代制造商工程确认
          </strong>
          。正式 OS / 订货以工程与商务确认为准。
        </p>
      </LegalSection>

      <LegalSection title="3. No warranty / 不保证">
        <p>
          The site is provided <strong>“as is” and “as available”</strong>,
          without warranties of any kind, whether express or implied, including
          accuracy, completeness, fitness for a particular purpose, or
          non-infringement. Catalogue data may be incomplete, outdated, or
          misapplied to your transformer duty.
        </p>
        <p>
          本站按<strong>“现状”与“可用性”</strong>
          提供，不作任何明示或默示保证，包括但不限于准确性、完整性、特定用途适用性或不侵权。目录数据可能不完整、过时，或与您的实际工况不符。
        </p>
      </LegalSection>

      <LegalSection title="4. Limitation of liability / 责任限制">
        <p>
          To the maximum extent permitted by law, the author shall not be liable
          for any direct, indirect, incidental, special, consequential, or
          punitive damages, or any loss of profit, data, business, or goodwill,
          arising from your use of or inability to use this site or its
          suggestions — including commercial, contractual, or technical
          decisions made in reliance on the output.
        </p>
        <p>
          在法律允许的最大范围内，作者不对因使用或无法使用本站或其建议而产生的任何直接、间接、附带、特殊、后果性或惩罚性损害，或利润、数据、业务或商誉损失承担责任——包括基于输出所作的商务、合同或技术决策。
        </p>
      </LegalSection>

      <LegalSection title="5. Your responsibility / 您的责任">
        <p>
          You are solely responsible for verifying every selection with
          qualified engineering and the applicable manufacturer process before
          quoting, purchasing, manufacturing, or installing equipment.
        </p>
        <p>
          在报价、采购、制造或安装前，您须自行通过合格工程人员及适用的制造商流程核实每一项选型结果。
        </p>
      </LegalSection>

      <LegalSection title="6. Intellectual property / 知识产权">
        <p>
          The software implementation of this site is a personal work of the
          author unless otherwise stated in the repository license. Product
          names, type designations, and technical data of third-party
          manufacturers remain their respective property and are referenced only
          for identification and selection convenience.
        </p>
        <p>
          本站软件实现除仓库许可另有说明外为作者个人作品。第三方制造商的产品名称、型号与技术资料归其权利人所有，仅供识别与选型便利引用。
        </p>
      </LegalSection>

      <LegalSection title="7. No affiliation / 无隶属关系">
        <p>
          References to commercial type strings or product families do{" "}
          <strong>not</strong> imply partnership, agency, employment
          representation, or endorsement by those brands. Do not treat this site
          as corporate communication.
        </p>
        <p>
          提及商业型号或产品系列
          <strong>不表示</strong>
          与该品牌存在合伙、代理、职务代表或背书关系。请勿将本站视为公司对外正式文件。
        </p>
      </LegalSection>

      <LegalSection title="8. Acceptable use / 可接受使用">
        <p>
          Do not misuse the site (including attempts to disrupt hosting, scrape
          in a way that harms the service, or present outputs as certified
          manufacturer documents). The author may modify or discontinue the site
          at any time without notice.
        </p>
        <p>
          请勿滥用本站（包括破坏托管、有害抓取，或将输出伪称为经认证的制造商文件）。作者可随时修改或停止本站，恕不另行通知。
        </p>
      </LegalSection>

      <LegalSection title="9. Governing note / 适用说明">
        <p>
          These terms are intended as a clear statement of the project’s private
          nature and limited purpose. Local mandatory consumer or other laws
          that cannot be excluded still apply where relevant.
        </p>
        <p>
          本条款旨在明确项目的私人性质与有限用途。当地不可排除的强制性法律（如适用）仍优先适用。
        </p>
      </LegalSection>
    </LegalPage>
  );
}
