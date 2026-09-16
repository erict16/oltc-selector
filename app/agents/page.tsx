import type { Metadata } from "next";
import { LegalPage, LegalPair } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Hand selection to an AI assistant · OLTC Selector",
  description:
    "Use the same OLTC engine from WorkBuddy, ChatGPT, or another agent via the oltc CLI.",
};

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function AgentsPage() {
  return (
    <LegalPage
      title="Try handing selection to AI assistants?"
      titleZh="试试把选型交给 AI 助手们？"
    >
      <p className="text-[0.8125rem] text-[var(--color-muted)]">
        Same engine as the form. Types that are not in the catalogue do not come
        out. · 与网页同一套引擎。目录中不存在的型号不会出现。
      </p>

      <LegalPair
        title="1. What this is / 这是干什么"
        en={
          <p>
            The form on the home page is for you. The same rules can be used by{" "}
            <strong>WorkBuddy, ChatGPT, Claude, Grok, Kimi, GLM</strong>, or
            another agent that can run a command. The agent must call{" "}
            <code>oltc</code> — it must not invent a type string.
          </p>
        }
        zh={
          <p>
            首页表格供人工填写。同一规则也可交由{" "}
            <strong>WorkBuddy、ChatGPT、Claude、Grok、Kimi、GLM</strong>{" "}
            等能运行命令的 Agent。Agent 必须调用 <code>oltc</code>
            ，不得自行编造型号。
          </p>
        }
      />

      <LegalPair
        title="2. Install / 安装"
        en={
          <>
            <p>Node.js 20 or newer, then:</p>
            <pre className="mt-2 overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-white p-3 font-[family-name:var(--font-mono)] text-[0.8125rem]">
              npm i -g oltc-selector
            </pre>
          </>
        }
        zh={
          <>
            <p>需要 Node.js 20 或更新，然后：</p>
            <pre className="mt-2 overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-white p-3 font-[family-name:var(--font-mono)] text-[0.8125rem]">
              npm i -g oltc-selector
            </pre>
          </>
        }
      />

      <LegalPair
        title="3. Run / 运行"
        en={
          <>
            <p>On-load example:</p>
            <pre className="mt-2 overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-white p-3 font-[family-name:var(--font-mono)] text-[0.8125rem]">
              {`oltc --iu 350 --um 40.5 --conn D --reg W --pm 8`}
            </pre>
            <p className="mt-2">
              Off-circuit: add <code>--octc</code>. Combined construction:{" "}
              <code>--structure combined</code>. Compound:{" "}
              <code>--structure compound</code>. <code>--iu</code> is Imax — do
              not apply a safety factor. <code>--k</code> is for{" "}
              <code>--mva</code> only.
            </p>
          </>
        }
        zh={
          <>
            <p>有载示例：</p>
            <pre className="mt-2 overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-white p-3 font-[family-name:var(--font-mono)] text-[0.8125rem]">
              {`oltc --iu 350 --um 40.5 --conn D --reg W --pm 8`}
            </pre>
            <p className="mt-2">
              无载加 <code>--octc</code>。组合式{" "}
              <code>--structure combined</code>，复合式{" "}
              <code>--structure compound</code>。<code>--iu</code> 是最大通过电流
              Imax，不要再乘安全系数。<code>--k</code> 只用于{" "}
              <code>--mva</code>。
            </p>
          </>
        }
      />

      <LegalPair
        title="4. What to tell the agent / 对 Agent 怎么说"
        en={
          <pre className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-white p-3 font-[family-name:var(--font-mono)] text-[0.8125rem] whitespace-pre-wrap">
            {`Select an OLTC with oltc. Do not invent a type.
Duty: 350 A max through-current, Um 40.5 kV, delta, reversing ±8.
Then check the type against the catalogue and say in one short paragraph why it is correct.`}
          </pre>
        }
        zh={
          <pre className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-white p-3 font-[family-name:var(--font-mono)] text-[0.8125rem] whitespace-pre-wrap">
            {`用 oltc 选有载开关，不要自己编型号。
工况：最大通过电流 350 A，Um 40.5 kV，角接，正反调 ±8。
选完对照目录检查，并用一小段说明为什么这个型号正确。`}
          </pre>
        }
      />

      <LegalPair
        title="5. Skill pack / 技能包"
        en={
          <p>
            Optional. Import this zip into WorkBuddy (Upload skill). It tells
            the agent to run <code>oltc</code>, refuse types the brochure does
            not have, and explain the pick. Selection only — no prices.{" "}
            <a href={`${BASE}/skills/oltc-selector.zip`}>
              Download oltc-selector.zip
            </a>
            .
          </p>
        }
        zh={
          <p>
            可选。在 WorkBuddy 里用「上传技能」导入此 zip。技能要求先跑{" "}
            <code>oltc</code>
            ，拒绝样本册没有的型号，并说明为何正确。只含选型，不含报价。
            <a href={`${BASE}/skills/oltc-selector.zip`}>
              下载 oltc-selector.zip
            </a>
            。
          </p>
        }
      />

      <LegalPair
        title="6. Common mistakes / 常见错误"
        en={
          <p>
            Inventing CV2-500; treating transformer Dyn11 as OLTC Y/D; treating
            off-circuit as on-load; writing three MDUs for three single-phase
            poles (default is one drive); putting 19 as transformer operating
            positions for 10193W (that is 17 voltage steps).
          </p>
        }
        zh={
          <p>
            编造 CV2-500；把变压器 Dyn11 当成开关 Y/D；把无载当成有载；一拖三写成三台机构（默认一台）；把
            10193W 的 19 当成变压器工作档位（电压档是 17）。
          </p>
        }
      />

      <LegalPair
        title="7. Limits / 界限"
        en={
          <p>
            Indicative only. Confirm every type with engineering before OS or
            purchase. This site is a private helper, not a manufacturer tool.
          </p>
        }
        zh={
          <p>
            仅为示意。出 OS 或采购前须工程确认。本站是私人辅助，不是制造商官方工具。
          </p>
        }
      />
    </LegalPage>
  );
}
