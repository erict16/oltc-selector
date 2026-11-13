import type { Lang } from "./i18n";

export type NoteKind = "fix" | "new" | "imp";
export type NoteGroup = { kind: NoteKind; items: string[] };
export type Release = {
  version: string;
  /** YYYY-MM */
  date: string;
  groups: NoteGroup[];
};

/**
 * Version history, newest first. The result-pane popover shows the first two
 * releases; /changelog shows all of them, with the sidebar collapsed to
 * minor lines (v1.2, v1.1, …). Versions, dates, group kinds, and item
 * counts must stay identical across languages — only the item text is
 * translated. Keep sentences complete, concrete, and public-facing.
 */
export const RELEASES: Record<Lang, Release[]> = {
  zh: [
    {
      version: "2.4.1",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["命令行：输出更短。「假定」一行只列可能改变型号的项（完整清单仍在 --json 里），对地绝缘不再重复说三遍，「其他」改为「其他可选」。", "命令行：报错先给中文再给英文（--lang en 只给英文）；--json 出错时只输出 JSON，--version --json 也输出 JSON。"] }, { kind: "fix", items: ["命令行：--line 能读小写联结组（如 ynd11）；只写 off-circuit 的行按无载选，不再选成有载；--mva 或 --line 旁边的 --conn 现在报错（以前会悄悄把电流公式换成 S/(3U)），请改用 --tap line 或 --winding delta。"] }],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["命令行：删除 --market 参数。它只认意大利和土耳其，多数情况下不起作用；开关对地绝缘请直接用 --earth-um，跨调压绕组的耐压用 --across-li / --across-ac。", "页面：结果卡高度重做，滚到底时和表单底部对齐，中间不再留空白，窗口矮时型号始终可见；去掉总是接近 100% 的对地绝缘进度条；页头不再放图标；下拉框边线调淡。"] }],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      groups: [{ kind: "fix", items: ["命令行：互相矛盾或不起作用的参数现在会报错，不再悄悄选一个：--oil 和 --vacuum 同时给、--octc 和 --duty oltc、--conn Y 配 --tap line、双绕组却给了 --hv / --mv、--iu 路径上的 --minus、--um 和 --earth-um 数值不同、--step-pct 小于 0.1。"] }, { kind: "imp", items: ["页面：结果栏和表单一样高，滚到底两边对齐；页头加了版本号、选型助手和更新记录；换了新图标；对地工频/雷电耐压写在 Um 下面；提示里的「订货规范」不再带（OS）。"] }],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["命令行：每次运行都会查 npm 有没有新版本，有就在输出末尾提示，不会自动更新。", "页面：去掉表单顶部的粘贴框和「复制链接」；自耦变的提示改成更直白的说法；AI 选型页改为直接用 npm 上的 oltc-selector。"] }],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      groups: [
        {
          kind: "new",
          items: [
            "页面：把铭牌或招标行粘贴进表单顶部即可自动填表；「复制链接」把当前选型发给同事，刷新也不丢；首次打开按浏览器语言显示。",
            "命令行：新增 --version，所有参数支持 --flag=value，不带参数显示帮助，拼错的参数给出建议；--json 新增 resolved、line、version，出错时也输出 JSON，选不到型号时退出码为 1。",
          ],
        },
        {
          kind: "fix",
          items: [
            "无载：清单里有型号却提示超出目录的情况已修正（800 A、D 接、Um 72.5 kV 现给出 WSLIV-2000D/72.5-18x17E）；没有尺寸字母的清单型号现在可以选到。",
            "不在样本接线图里的档位码一律带提醒；± 级数须为整数；干式 CVT 最多 9 档，用于 ± 调压范围时会提示它是线性调型号。",
            "命令行：铭牌行里的全角符号现在能读对（全角斜杠曾按低压侧选型）；不起作用的参数改为报错，不再悄悄忽略。",
          ],
        },
        {
          kind: "imp",
          items: [
            "页面：页脚加入更新记录、AI 选型、条款和隐私链接；打印只出结果卡；文字和输入框边线更清晰；读屏会念出没有型号的原因。",
          ],
        },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      groups: [{ kind: "new", items: ["命令行每天最多查一次 npm，有新版本时在输出末尾提示并给出更新命令，不会自动更新；--no-update-check 或 OLTC_NO_UPDATE_CHECK=1 可关闭。"] }],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      groups: [
        {
          kind: "imp",
          items: [
            "改参数后型号立即更新，不用再点「选型」；结果卡把工况和型号额定并排列出（最大通过电流、级电压、级容量、开关绝缘），并显示占用比例。",
            "手机端底部固定显示当前型号，可直接复制，点箭头跳到完整结果；「开关」一组默认收起，标题下一行列出当前取值。",
          ],
        },
        {
          kind: "fix",
          items: [
            "命令行：粗细调和正反调下指定的工作位置数不再被 ±8 覆盖；线性调 ±8 按 17 位计算；自耦变输入电流时默认开关在连接点；手动指定的对地绝缘可用于 363 kV 以上系统；只写角接时默认线端。",
          ],
        },
      ],
    },
    {
      version: "2.0.0",
      date: "2026-10",
      groups: [
        { kind: "new", items: ["可以选择变压器种类（双绕组或自耦变）和开关位置（中性点、线端、串联/公共绕组连接点、中压出线），电流、级电压和开关绝缘按位置计算。"] },
        {
          kind: "fix",
          items: [
            "自耦变按高压系统的绝缘选型，只给组合式开关，不再出现复合式型号。",
            "中性点绝缘没给时按 Um 72.5 选，并标「待 OS 核对」；35 kV 级中性点同样提示。",
          ],
        },
        { kind: "imp", items: ["页面重新设计：表单和结果并排，结果区实时显示电流、级电压、开关绝缘和开关位置；手机端单独排版。"] },
      ],
    },
    {
      version: "1.3.0",
      date: "2026-10",
      groups: [
        {
          kind: "fix",
          items: [
            "调压绕组间绝缘超出所有选择器等级时，不再给出 DE 型号，而是提示联系工程。",
            "自定义调节比例和安全系数可以正常输入小数，也认 0,5 这种逗号写法；无载里改过的档位不再带进有载选型。",
            "星接时电压角标显示对地绝缘，角接显示实际选用的 Um；去掉「不限」连接方式，避免级电压被少算。",
          ],
        },
        {
          kind: "imp",
          items: [
            "结果卡会标出需要工程确认的情况：未给级电压、超出额定电流、非标准分接代码、选择器等级被上调。",
          ],
        },
      ],
    },
    {
      version: "1.2.9",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "新增双断口真空系列 SDZV，级电压最高 6000 V、级容量约为 SHZV 的 1.5 倍。",
          ],
        },
        {
          kind: "fix",
          items: [
            "油灭弧、真空灭弧都成为硬约束：选油后结果不再出现真空型号；箱外真空盖不住工况时直接提示「超出样本」，不再改用油浸电抗式开关。",
          ],
        },
        {
          kind: "imp",
          items: ["选型助手教程页改成「装、发、拿型号」三步引导。"],
        },
      ],
    },
    {
      version: "1.2.6",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["选型助手技能移到单独的仓库维护，教程页直接指向它，以后更新更快。"],
        },
      ],
    },
    {
      version: "1.2.5",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "无载开关指定了触头数时，不再被错算成 17 个工位。",
            "命令行的安全系数默认值改为 ×1.0，和网页版一致。",
            "选型理由里的电流数值取整显示，不再出现一长串小数。",
          ],
        },
        {
          kind: "imp",
          items: ["助手列出的假定更完整，相数等参数也会一并说明。"],
        },
      ],
    },
    {
      version: "1.2.4",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "助手和命令行会主动告诉你：哪些参数没填、这次用了哪些默认值。",
            "助手在两个技能市场上架：WorkBuddy SkillHub 和 skillhub.cn。",
          ],
        },
      ],
    },
    {
      version: "1.2.3",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["助手带上图标，在 WorkBuddy 技能市场里一眼能认出来。"],
        },
      ],
    },
    {
      version: "1.2.2",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["助手说明文档改写：上半部分给人看，下半部分给 AI 看。"],
        },
      ],
    },
    {
      version: "1.2.1",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "助手能听懂更多参数了：级电压、安装方式（箱内、箱外、干式）、灭弧方式（油或真空）和相数。",
          ],
        },
      ],
    },
    {
      version: "1.2.0",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "命令行工具 oltc 发布，和网页版共用同一套选型引擎。",
            "「选型助手」上线：把变压器参数发给 AI 助手，就能拿回型号。",
            "只填变压器容量也能选型，工具会自动推算最大通过电流。",
            "无载开关可按样本册选择接线方式：II 正反调、IV 线性调、V 单桥跨接、VI Y-D 转换、VII 双桥跨接、VIII 串并联。",
            "结果卡会标明开关结构：复合式、组合式、笼式或鼓式。",
          ],
        },
        {
          kind: "fix",
          items: [
            "不会再选出样本册或 2025 价格表里不存在的型号，比如三相角接的 CM2。",
            "组合式三相有载开关只用于中性点；角接或线端工况会自动改用三台单相。",
          ],
        },
      ],
    },
    {
      version: "1.1.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: [
            "灭弧方式可以选择了：油或真空。",
            "新增 66、110、220 kV 三个预设，点一下即可填好典型工况。",
          ],
        },
        {
          kind: "imp",
          items: ["表单与结果左右同高，宽屏无需滚动即可点击选型。"],
        },
      ],
    },
    {
      version: "1.0.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: ["首次发布：输入变压器参数，即可选出样本册中真实存在的开关型号。"],
        },
      ],
    },
  ],
  en: [
    {
      version: "2.4.1",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["CLI: shorter output. The Assumed line names only what could change the type (the full list stays in --json), the insulation to earth is no longer said three times, and Other is now Other types that cover the duty.", "CLI: on a Chinese run an error prints in Chinese, then English (--lang en prints English alone); under --json an error is JSON only, and --version --json is JSON too."] }, { kind: "fix", items: ["CLI: --line reads a lowercase vector group (ynd11); a line that says only off-circuit is sized as off-circuit, not on-load; --conn beside --mva or --line is now an error (it used to swap the current formula to S/(3U) unseen); use --tap line or --winding delta."] }],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["CLI: the --market flag is removed. It knew Italy and Turkey only and did nothing in most cases; state the insulation to earth with --earth-um and the across-tap levels with --across-li / --across-ac.", "Page: the result card's height is rebuilt, so it ends level with the form at the end of the page with no empty band, and the type stays in view on a short window; the insulation bar that always read about 100 % is removed; no mark in the header; lighter dropdown borders."] }],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      groups: [{ kind: "fix", items: ["CLI: flags that contradict each other or cannot take effect are now errors instead of one being picked silently: --oil with --vacuum, --octc with --duty oltc, --conn Y with --tap line, --hv / --mv on a two-winding transformer, --minus on the --iu path, --um and --earth-um with different values, --step-pct below 0.1."] }, { kind: "imp", items: ["Page: the result column is as tall as the form, so both end on one line; the header shows the version and links to the assistant guide and the release notes; a new icon; the withstand levels to earth sit under Um."] }],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["CLI: every run checks npm for a newer version and prints a notice at the end when there is one; it never updates itself.", "Page: the paste box above the form and Copy link are removed; the Chinese autotransformer notes are in plainer words; the AI page now uses oltc-selector from npm directly."] }],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      groups: [
        {
          kind: "new",
          items: [
            "Page: paste a nameplate or tender line at the top of the form to fill it in; Copy link sends the current selection to a colleague and a reload keeps it; the first visit follows the browser language.",
            "CLI: new --version, --flag=value for every flag, help when no flag is given, and a suggestion for a mistyped flag; --json adds resolved, line and version, an error is JSON too, and the exit code is 1 when there is no type.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Off-circuit: a duty no longer reads out of catalogue range while a list row covers it (800 A, D, Um 72.5 kV now gives WSLIV-2000D/72.5-18x17E); list rows with no size letter can be chosen.",
            "A tap code that is not a brochure diagram always carries its note; ± steps must be a whole number; dry-type CVT stops at 9 positions and says it is a linear-regulation type when given for a ± range.",
            "CLI: full-width punctuation in a tender line is read correctly (a full-width slash used to size the LV winding); a flag that cannot take effect is an error, not a silent default.",
          ],
        },
        {
          kind: "imp",
          items: [
            "Page: footer links to the release notes, AI selection, terms and privacy; printing gives only the result card; text and field borders are easier to see; a screen reader says why there is no type.",
          ],
        },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      groups: [{ kind: "new", items: ["The CLI checks npm at most once a day and, when a newer version exists, prints a notice with the update command at the end; it never updates itself. --no-update-check or OLTC_NO_UPDATE_CHECK=1 turns it off."] }],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      groups: [
        {
          kind: "imp",
          items: [
            "The type updates as soon as a parameter changes, with no Select button; the result card sets the duty beside the type's rating (Imax, step voltage, step capacity, switch Um) and shows how much of each rating is used.",
            "On phones the current type stays in a bar at the bottom with Copy and a jump to the full result; the Tap changer section is folded by default behind one line that lists its values.",
          ],
        },
        {
          kind: "fix",
          items: [
            "CLI: a position count on W/G is no longer replaced by ±8; linear ±8 means 17 positions; an autotransformer sized from current defaults to the junction; a stated insulation to earth works above 363 kV; delta alone defaults to the line end.",
          ],
        },
      ],
    },
    {
      version: "2.0.0",
      date: "2026-10",
      groups: [
        { kind: "new", items: ["Pick the transformer kind (two-winding or autotransformer) and where the tap changer sits (neutral, line end, series–common junction, MV line lead); current, step voltage and switch insulation follow from that."] },
        {
          kind: "fix",
          items: [
            "Autotransformers take the HV system's insulation and only combined tap changers; compound types no longer appear for them.",
            "An unstated neutral insulation is sized at Um 72.5 and marked Check OS; a 35 kV-class neutral is marked the same way.",
          ],
        },
        { kind: "imp", items: ["Redesigned page: form and result side by side, with current, step voltage, switch insulation and tap position shown live; a separate phone layout."] },
      ],
    },
    {
      version: "1.3.0",
      date: "2026-10",
      groups: [
        {
          kind: "fix",
          items: [
            "When across-tap insulation is above every selector grade, the page no longer returns a DE type and asks you to contact engineering instead.",
            "Custom step percent and safety factor accept decimals, including 0,5 with a comma; tap edits made in off-circuit mode no longer carry into on-load sizing.",
            "For star the voltage caption shows the earth withstand, for delta the Um actually used; the Any connection is gone so step voltage is not under-counted.",
          ],
        },
        {
          kind: "imp",
          items: [
            "The result card flags what engineering must confirm: no step voltage given, duty above the rating, a non-standard tap code, or a raised selector grade.",
          ],
        },
      ],
    },
    {
      version: "1.2.9",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "The dual-break vacuum family SDZV is available, with step voltage up to 6000 V and about 1.5 times the step capacity of SHZV.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Oil and vacuum switching are both hard limits now: choosing oil keeps vacuum types out of the result, and when an on-tank vacuum duty exceeds every vacuum type, the tool says out of catalogue instead of substituting an oil reactor type.",
          ],
        },
        {
          kind: "imp",
          items: ["The assistant guide is now a three-step walkthrough: install, send, get the type."],
        },
      ],
    },
    {
      version: "1.2.6",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "The assistant skill moved to its own repository and the tutorial page points straight at it, so updates ship faster.",
          ],
        },
      ],
    },
    {
      version: "1.2.5",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "An off-circuit switch with a given contact count is no longer misread as 17 positions.",
            "The command-line safety factor now defaults to ×1.0, matching the web app.",
            "Duty currents in the reason strings are rounded, with no long decimals.",
          ],
        },
        {
          kind: "imp",
          items: ["The assistant relays a fuller list of assumptions, including the phase count."],
        },
      ],
    },
    {
      version: "1.2.4",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "The assistant and the CLI tell you which inputs you left out and which defaults were used, after every run.",
            "The assistant is published on both skill marketplaces: WorkBuddy SkillHub and skillhub.cn.",
          ],
        },
      ],
    },
    {
      version: "1.2.3",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "The assistant ships with its icon, so it is easy to recognise in the WorkBuddy skill marketplace.",
          ],
        },
      ],
    },
    {
      version: "1.2.2",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["The assistant manual was rewritten: the top half for people, the bottom half for the AI."],
        },
      ],
    },
    {
      version: "1.2.1",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "The assistant understands more inputs: step voltage, mounting (in-tank, on-tank, dry), switching medium (oil or vacuum), and phase count.",
          ],
        },
      ],
    },
    {
      version: "1.2.0",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "The oltc command-line tool is published, sharing the same selection engine as the web app.",
            "The Selection assistant launches: send the transformer data to an AI assistant and get the type back.",
            "You can select with just the transformer capacity — the tool derives the maximum through-current.",
            "Off-circuit switches offer the brochure wiring schemes: II reversing, IV linear, V single bridge, VI Y-D, VII double bridge, VIII series-parallel.",
            "The result card names the construction: compound, combined, cage, or drum.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Types that are not in the brochure or the 2025 list no longer appear, for example three-phase delta CM2.",
            "Combined three-phase on-load switches are star-point only; delta or line-end duties switch to three single-phase units.",
          ],
        },
      ],
    },
    {
      version: "1.1.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: [
            "The interrupter is a choice: oil or vacuum.",
            "Presets for 66, 110, and 220 kV fill a typical duty in one click.",
          ],
        },
        {
          kind: "imp",
          items: ["Form and result sit side by side at the same height, so wide screens need no scrolling to hit Select."],
        },
      ],
    },
    {
      version: "1.0.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: ["First release: enter the transformer data and get a type that exists in the catalogue."],
        },
      ],
    },
  ],
  vi: [
    {
      version: "2.4.1",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["CLI: kết quả ngắn hơn. Dòng Giả định chỉ nêu những mục có thể đổi mã kiểu (danh sách đầy đủ vẫn có trong --json), cách điện đối với đất không còn nói ba lần, và mục Khác nay là các kiểu khác đáp ứng được.", "CLI: khi chạy tiếng Trung, lỗi in tiếng Trung rồi tiếng Anh (--lang en chỉ in tiếng Anh); với --json lỗi chỉ là JSON, và --version --json cũng là JSON."] }, { kind: "fix", items: ["CLI: --line đọc được tổ đấu dây viết thường (ynd11); dòng chỉ ghi off-circuit được chọn theo không tải, không phải có tải; --conn đi cùng --mva hoặc --line nay báo lỗi (trước đây âm thầm đổi công thức dòng sang S/(3U)); hãy dùng --tap line hoặc --winding delta."] }],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["CLI: bỏ tham số --market. Nó chỉ biết Ý và Thổ Nhĩ Kỳ và phần lớn trường hợp không có tác dụng; hãy nêu cách điện đối với đất bằng --earth-um và mức chịu đựng ngang cuộn điều chỉnh bằng --across-li / --across-ac.", "Trang: chiều cao thẻ kết quả được làm lại, nên ở cuối trang thẻ kết thúc ngang với biểu mẫu, không còn dải trống, và mã kiểu luôn hiện trên cửa sổ thấp; bỏ thanh cách điện luôn gần 100 %; đầu trang không còn biểu tượng; viền ô chọn nhạt hơn."] }],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      groups: [{ kind: "fix", items: ["CLI: các tham số mâu thuẫn nhau hoặc không có tác dụng nay báo lỗi thay vì âm thầm chọn một: --oil cùng --vacuum, --octc cùng --duty oltc, --conn Y cùng --tap line, --hv / --mv với máy hai cuộn dây, --minus trên đường --iu, --um và --earth-um khác giá trị, --step-pct nhỏ hơn 0.1."] }, { kind: "imp", items: ["Trang: cột kết quả cao bằng biểu mẫu nên hai cột kết thúc trên cùng một đường; đầu trang có số phiên bản và liên kết tới hướng dẫn trợ lý và ghi chú phát hành; biểu tượng mới; mức chịu đựng đối với đất nằm dưới Um."] }],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["CLI: mỗi lần chạy đều kiểm tra npm xem có bản mới không và báo ở cuối kết quả nếu có; không tự cập nhật.", "Trang: bỏ ô dán ở đầu biểu mẫu và nút Sao chép liên kết; các ghi chú tiếng Trung cho máy biến áp tự ngẫu viết dễ hiểu hơn; trang AI nay dùng thẳng oltc-selector trên npm."] }],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      groups: [
        {
          kind: "new",
          items: [
            "Trang: dán dòng nhãn máy hoặc dòng thầu vào đầu biểu mẫu để tự điền; nút Sao chép liên kết gửi lựa chọn hiện tại cho đồng nghiệp và tải lại trang vẫn giữ; lần mở đầu theo ngôn ngữ trình duyệt.",
            "CLI: thêm --version, mọi tham số nhận --flag=value, không có tham số thì hiện trợ giúp, gõ sai tham số có gợi ý; --json thêm resolved, line và version, lỗi cũng là JSON, mã thoát là 1 khi không có kiểu.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Không tải: không còn báo ngoài danh mục khi bảng giá có dòng đáp ứng (800 A, D, Um 72.5 kV nay cho WSLIV-2000D/72.5-18x17E); chọn được các dòng không có chữ kích cỡ.",
            "Mã nấc không có trong sơ đồ catalogue luôn kèm ghi chú; số nấc ± phải là số nguyên; CVT loại khô tối đa 9 vị trí và có ghi chú là kiểu điều chỉnh tuyến tính khi dùng cho dải ±.",
            "CLI: đọc đúng dấu toàn chiều rộng trong dòng thầu (dấu gạch chéo toàn chiều rộng từng làm chọn theo cuộn hạ áp); tham số không có tác dụng nay báo lỗi, không còn bị bỏ qua âm thầm.",
          ],
        },
        {
          kind: "imp",
          items: [
            "Trang: chân trang có liên kết ghi chú phát hành, chọn bằng AI, điều khoản và quyền riêng tư; in chỉ ra thẻ kết quả; chữ và viền ô rõ hơn; trình đọc màn hình đọc lý do không có kiểu.",
          ],
        },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      groups: [{ kind: "new", items: ["CLI kiểm tra npm tối đa mỗi ngày một lần và, khi có phiên bản mới, in thông báo kèm lệnh cập nhật ở cuối; nó không tự cập nhật. Tắt bằng --no-update-check hoặc OLTC_NO_UPDATE_CHECK=1."] }],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      groups: [
        {
          kind: "imp",
          items: [
            "Kiểu được cập nhật ngay khi đổi thông số, không cần bấm Chọn; thẻ kết quả đặt chế độ làm việc cạnh định mức của kiểu (Imax, điện áp nấc, công suất nấc, Um bộ ĐAPT) và cho biết mức dùng của từng định mức.",
            "Trên điện thoại, kiểu hiện tại luôn nằm ở thanh dưới cùng, có nút Sao chép và nút chuyển tới kết quả đầy đủ; mục Bộ điều áp được thu gọn mặc định, một dòng liệt kê các giá trị đang chọn.",
          ],
        },
        {
          kind: "fix",
          items: [
            "CLI: số vị trí trên W/G không còn bị ±8 ghi đè; tuyến tính ±8 là 17 vị trí; máy biến áp tự ngẫu tính theo dòng điện mặc định đặt ở điểm nối; cách điện với đất do người dùng nhập áp dụng được trên 363 kV; chỉ chọn tam giác thì mặc định ở đầu dây.",
          ],
        },
      ],
    },
    {
      version: "2.0.0",
      date: "2026-10",
      groups: [
        { kind: "new", items: ["Chọn loại máy biến áp (hai cuộn dây hoặc tự ngẫu) và vị trí bộ ĐAPT (trung tính, đầu dây, điểm nối nối tiếp – chung, đầu ra trung áp); dòng điện, điện áp nấc và cách điện được tính theo vị trí đó."] },
        {
          kind: "fix",
          items: [
            "Máy biến áp tự ngẫu lấy cách điện của hệ thống cao áp và chỉ dùng bộ ĐAPT kiểu tổ hợp; không còn ra kiểu phức hợp.",
            "Khi chưa cho cách điện trung tính, chọn theo Um 72.5 và ghi Kiểm tra OS; trung tính cấp 35 kV cũng được ghi như vậy.",
          ],
        },
        { kind: "imp", items: ["Thiết kế lại trang: biểu mẫu và kết quả đặt cạnh nhau, hiển thị trực tiếp dòng điện, điện áp nấc, cách điện và vị trí bộ ĐAPT; bố cục riêng cho điện thoại."] },
      ],
    },
    {
      version: "1.3.0",
      date: "2026-10",
      groups: [
        {
          kind: "fix",
          items: [
            "Khi cách điện giữa các nấc vượt mọi cấp bộ chọn, trang không còn trả về mã DE mà yêu cầu liên hệ kỹ thuật.",
            "Tỷ lệ mỗi nấc và hệ số an toàn tùy chỉnh nhận số thập phân, kể cả 0,5 với dấu phẩy; nấc chỉnh ở chế độ không tải không còn ảnh hưởng chọn có tải.",
            "Nối sao hiển thị cách điện với đất, nối tam giác hiển thị Um thực dùng; bỏ lựa chọn Bất kỳ để điện áp nấc không bị tính thiếu.",
          ],
        },
        {
          kind: "imp",
          items: [
            "Thẻ kết quả đánh dấu các điểm cần kỹ thuật xác nhận: chưa có điện áp nấc, vượt dòng định mức, mã nấc không tiêu chuẩn, hoặc cấp bộ chọn bị nâng.",
          ],
        },
      ],
    },
    {
      version: "1.2.9",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Thêm họ chân không hai tiếp điểm SDZV: điện áp cấp tới 6000 V, dung lượng cấp khoảng 1,5 lần SHZV.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Dầu và chân không đều thành giới hạn cứng: chọn dầu thì kết quả không còn kiểu chân không; khi lắp ngoài thùng mà chân không không đáp ứng được, công cụ báo ngoài catalogue thay vì đổi sang máy dầu kiểu kháng.",
          ],
        },
        {
          kind: "imp",
          items: ["Trang hướng dẫn trợ lý đổi thành ba bước: cài, gửi, nhận kiểu."],
        },
      ],
    },
    {
      version: "1.2.6",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "Kỹ năng trợ lý chuyển sang kho riêng, trang hướng dẫn trỏ thẳng tới đó nên cập nhật nhanh hơn.",
          ],
        },
      ],
    },
    {
      version: "1.2.5",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "Khi đã cho số tiếp điểm, máy không tải không còn bị tính nhầm thành 17 vị trí.",
            "Hệ số an toàn của dòng lệnh mặc định là ×1.0, giống bản web.",
            "Dòng điện trong phần giải thích được làm tròn, không còn dãy số lẻ dài.",
          ],
        },
        {
          kind: "imp",
          items: ["Trợ lý liệt kê giả định đầy đủ hơn, kể cả số pha."],
        },
      ],
    },
    {
      version: "1.2.4",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Trợ lý và dòng lệnh chủ động cho biết bạn chưa nhập thông số nào và giá trị mặc định nào đang được dùng.",
            "Trợ lý đã lên hai chợ kỹ năng: WorkBuddy SkillHub và skillhub.cn.",
          ],
        },
      ],
    },
    {
      version: "1.2.3",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["Trợ lý có biểu tượng riêng, dễ nhận ra trong chợ kỹ năng WorkBuddy."],
        },
      ],
    },
    {
      version: "1.2.2",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["Tài liệu trợ lý được viết lại: nửa trên cho người đọc, nửa dưới cho AI."],
        },
      ],
    },
    {
      version: "1.2.1",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "Trợ lý hiểu thêm nhiều thông số: điện áp cấp, kiểu lắp (trong thùng, ngoài thùng, khô), môi trường dập hồ quang (dầu hoặc chân không) và số pha.",
          ],
        },
      ],
    },
    {
      version: "1.2.0",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Công cụ dòng lệnh oltc ra mắt, dùng chung bộ máy chọn kiểu với bản web.",
            "Ra mắt Trợ lý chọn kiểu: gửi thông số máy biến áp cho trợ lý AI và nhận lại kiểu máy.",
            "Chỉ cần nhập dung lượng máy biến áp, công cụ tự tính dòng qua lớn nhất.",
            "Máy không tải chọn được sơ đồ nối dây theo catalogue: II đảo chiều, IV tuyến tính, V cầu đơn, VI Y-D, VII cầu kép, VIII nối tiếp-song song.",
            "Thẻ kết quả ghi rõ kết cấu: hỗn hợp, tổ hợp, lồng hoặc trống.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Không còn chọn kiểu không có trong catalogue hoặc bảng 2025, ví dụ CM2 ba pha đấu tam giác.",
            "Máy có tải ba pha kiểu tổ hợp chỉ dùng cho điểm trung tính; đấu tam giác hoặc đầu dây tự chuyển sang ba máy một pha.",
          ],
        },
      ],
    },
    {
      version: "1.1.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: [
            "Chọn được kiểu dập hồ quang: dầu hoặc chân không.",
            "Ba cài sẵn 66, 110 và 220 kV, một cú nhấp là điền xong điều kiện điển hình.",
          ],
        },
        {
          kind: "imp",
          items: ["Biểu mẫu và kết quả đặt cạnh nhau cùng chiều cao, màn hình rộng không cần cuộn để bấm chọn."],
        },
      ],
    },
    {
      version: "1.0.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: ["Bản đầu tiên: nhập thông số máy biến áp, chọn ra kiểu có thật trong catalogue."],
        },
      ],
    },
  ],
  es: [
    {
      version: "2.4.1",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["CLI: salida más corta. La línea de supuestos nombra solo lo que puede cambiar el tipo (la lista completa sigue en --json), el aislamiento a tierra ya no se dice tres veces, y Otros pasa a ser otros tipos que cubren el servicio.", "CLI: en una ejecución en chino el error sale en chino y luego en inglés (--lang en solo en inglés); con --json el error es solo JSON, y --version --json también es JSON."] }, { kind: "fix", items: ["CLI: --line lee un grupo de conexión en minúsculas (ynd11); una línea que solo dice off-circuit se dimensiona sin carga, no en carga; --conn junto a --mva o --line ahora es un error (antes cambiaba la fórmula de corriente a S/(3U) sin avisar); use --tap line o --winding delta."] }],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["CLI: se elimina el parámetro --market. Solo conocía Italia y Turquía y en la mayoría de los casos no hacía nada; indique el aislamiento a tierra con --earth-um y los niveles a través del devanado de regulación con --across-li / --across-ac.", "Página: se rehízo la altura de la tarjeta de resultado, de modo que al final de la página termina a la par del formulario, sin franja vacía, y el tipo sigue visible en una ventana baja; se quita la barra de aislamiento que siempre marcaba cerca del 100 %; sin icono en la cabecera; bordes de los desplegables más claros."] }],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      groups: [{ kind: "fix", items: ["CLI: los parámetros que se contradicen o que no pueden tener efecto ahora dan error en lugar de elegirse uno en silencio: --oil con --vacuum, --octc con --duty oltc, --conn Y con --tap line, --hv / --mv en un transformador de dos devanados, --minus en la ruta --iu, --um y --earth-um con valores distintos, --step-pct menor que 0.1."] }, { kind: "imp", items: ["Página: la columna del resultado es tan alta como el formulario, así que ambas terminan en la misma línea; la cabecera muestra la versión y enlaces a la guía del asistente y a las notas de versión; icono nuevo; los niveles soportados a tierra están bajo Um."] }],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["CLI: cada ejecución comprueba en npm si hay una versión nueva y avisa al final cuando la hay; nunca se actualiza sola.", "Página: se quitan el cuadro para pegar encima del formulario y Copiar enlace; las notas en chino del autotransformador están en palabras más simples; la página de IA usa ahora oltc-selector de npm directamente."] }],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      groups: [
        {
          kind: "new",
          items: [
            "Página: pegue la línea de la placa o de la licitación arriba del formulario para rellenarlo; Copiar enlace envía la selección actual a un colega y se conserva al recargar; la primera visita sigue el idioma del navegador.",
            "CLI: nuevo --version, --flag=value en todas las opciones, ayuda cuando no se da ninguna opción y una sugerencia para una opción mal escrita; --json añade resolved, line y version, un error también es JSON y el código de salida es 1 cuando no hay tipo.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Sin carga: ya no se indica fuera de catálogo cuando una fila de la lista cubre el servicio (800 A, D, Um 72.5 kV da ahora WSLIV-2000D/72.5-18x17E); se pueden elegir las filas sin letra de tamaño.",
            "Un código de tomas que no es un esquema del catálogo siempre lleva su nota; los pasos ± deben ser un número entero; el CVT seco llega a 9 posiciones y avisa de que es un tipo de regulación lineal cuando se da para un rango ±.",
            "CLI: la puntuación de ancho completo en una línea de licitación se lee bien (una barra de ancho completo dimensionaba el devanado de BT); una opción que no puede tener efecto es un error, no un valor por defecto silencioso.",
          ],
        },
        {
          kind: "imp",
          items: [
            "Página: el pie enlaza a las notas de versión, la selección con IA, los términos y la privacidad; al imprimir sale solo la tarjeta de resultado; el texto y los bordes de los campos se ven mejor; el lector de pantalla dice por qué no hay tipo.",
          ],
        },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      groups: [{ kind: "new", items: ["La CLI consulta npm como máximo una vez al día y, si hay una versión más nueva, muestra un aviso con el comando de actualización al final; nunca se actualiza sola. Se desactiva con --no-update-check u OLTC_NO_UPDATE_CHECK=1."] }],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      groups: [
        {
          kind: "imp",
          items: [
            "El tipo se actualiza en cuanto cambia un dato, sin botón Seleccionar; la tarjeta de resultado pone el servicio junto al valor nominal del tipo (Imax, tensión de escalón, potencia de escalón, Um del cambiador) y muestra qué parte de cada valor se usa.",
            "En el móvil, el tipo actual queda en una barra inferior con Copiar y un salto al resultado completo; la sección Cambiador viene plegada, con una línea que resume sus valores.",
          ],
        },
        {
          kind: "fix",
          items: [
            "CLI: el número de posiciones en W/G ya no se sustituye por ±8; lineal ±8 son 17 posiciones; un autotransformador dimensionado por corriente va por defecto en la unión; el aislamiento a tierra indicado funciona por encima de 363 kV; solo triángulo va por defecto al extremo de línea.",
          ],
        },
      ],
    },
    {
      version: "2.0.0",
      date: "2026-10",
      groups: [
        { kind: "new", items: ["Elija el tipo de transformador (dos devanados o autotransformador) y dónde va el cambiador (neutro, extremo de línea, unión serie–común, salida de MT); la corriente, la tensión de escalón y el aislamiento salen de esa posición."] },
        {
          kind: "fix",
          items: [
            "Los autotransformadores toman el aislamiento del sistema de AT y solo cambiadores combinados; ya no aparecen tipos compuestos.",
            "Si no se indica el aislamiento del neutro, se dimensiona a Um 72.5 y se marca Verificar en OS; un neutro de clase 35 kV se marca igual.",
          ],
        },
        { kind: "imp", items: ["Página rediseñada: formulario y resultado lado a lado, con corriente, tensión de escalón, aislamiento y posición en vivo; diseño propio para móvil."] },
      ],
    },
    {
      version: "1.3.0",
      date: "2026-10",
      groups: [
        {
          kind: "fix",
          items: [
            "Si el aislamiento entre tomas supera todos los grados del selector, ya no se devuelve un tipo DE y se pide contactar con ingeniería.",
            "El porcentaje por toma y el factor de seguridad personalizados aceptan decimales, también 0,5 con coma; los cambios de tomas hechos en sin carga ya no afectan la selección en carga.",
            "En estrella la etiqueta muestra el aislamiento a tierra y en triángulo la Um usada; se quita la conexión Cualquiera para no subestimar la tensión de escalón.",
          ],
        },
        {
          kind: "imp",
          items: [
            "La tarjeta de resultado marca lo que ingeniería debe confirmar: tensión de escalón no indicada, corriente por encima del valor nominal, código de tomas no estándar o grado de selector elevado.",
          ],
        },
      ],
    },
    {
      version: "1.2.9",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Está disponible la familia de vacío de doble corte SDZV, con tensión de paso de hasta 6000 V y una capacidad de paso de aproximadamente 1,5 veces la de SHZV.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Aceite y vacío son ahora límites estrictos: al elegir aceite no aparecen tipos de vacío, y cuando un régimen en vacío sobre la cuba supera a todos los tipos de vacío, la herramienta indica fuera de catálogo en lugar de sustituir un reactor en aceite.",
          ],
        },
        {
          kind: "imp",
          items: ["La guía del asistente ahora es un recorrido de tres pasos: instalar, enviar y obtener el tipo."],
        },
      ],
    },
    {
      version: "1.2.6",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "La skill del asistente pasa a su propio repositorio y la página del tutorial apunta directamente a él, así las actualizaciones llegan antes.",
          ],
        },
      ],
    },
    {
      version: "1.2.5",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "Un cambiador sin carga con número de contactos indicado ya no se interpreta por error como 17 posiciones.",
            "El factor de seguridad de la línea de comandos ahora es ×1.0 por defecto, igual que en la web.",
            "Las corrientes en las explicaciones se redondean, sin decimales interminables.",
          ],
        },
        {
          kind: "imp",
          items: ["El asistente enumera supuestos más completos, incluido el número de fases."],
        },
      ],
    },
    {
      version: "1.2.4",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "El asistente y la CLI le dicen qué datos no indicó y qué valores por defecto se usaron, tras cada ejecución.",
            "El asistente está publicado en los dos mercados de skills: WorkBuddy SkillHub y skillhub.cn.",
          ],
        },
      ],
    },
    {
      version: "1.2.3",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "El asistente incluye su icono, fácil de reconocer en el mercado de skills de WorkBuddy.",
          ],
        },
      ],
    },
    {
      version: "1.2.2",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["El manual del asistente se reescribió: la mitad superior para personas, la inferior para la IA."],
        },
      ],
    },
    {
      version: "1.2.1",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "El asistente entiende más parámetros: tensión de paso, montaje (dentro del tanque, sobre el tanque, en seco), medio de conmutación (aceite o vacío) y número de fases.",
          ],
        },
      ],
    },
    {
      version: "1.2.0",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Se publica la herramienta de línea de comandos oltc, con el mismo motor de selección que la web.",
            "Se estrena el Asistente de selección: envíe los datos del transformador a un asistente de IA y reciba el tipo.",
            "Basta indicar la potencia del transformador: la herramienta calcula la corriente máxima.",
            "Los cambiadores sin carga ofrecen los esquemas de conexión del catálogo: II inversión, IV lineal, V puente simple, VI Y-D, VII puente doble, VIII serie-paralelo.",
            "La tarjeta de resultado indica la construcción: compuesto, combinado, jaula o tambor.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Ya no aparecen tipos que no están en el catálogo ni en la lista 2025, por ejemplo CM2 trifásico en triángulo.",
            "Los cambiadores en carga trifásicos combinados son solo para punto neutro; en triángulo o extremo de línea se pasa a tres unidades monofásicas.",
          ],
        },
      ],
    },
    {
      version: "1.1.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: [
            "El tipo de extinción es elegible: aceite o vacío.",
            "Preajustes de 66, 110 y 220 kV que rellenan un régimen típico con un clic.",
          ],
        },
        {
          kind: "imp",
          items: ["Formulario y resultado lado a lado a la misma altura; en pantallas anchas no hay que desplazarse para pulsar Seleccionar."],
        },
      ],
    },
    {
      version: "1.0.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: ["Primera versión: introduzca los datos del transformador y obtenga un tipo que existe en el catálogo."],
        },
      ],
    },
  ],
  tr: [
    {
      version: "2.4.1",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["CLI: çıktı daha kısa. Varsayılanlar satırı yalnızca tipi değiştirebilecek kalemleri adlandırır (tam liste --json içinde kalır), toprağa yalıtım artık üç kez söylenmez ve Diğer başlığı artık görevi karşılayan diğer tipler.", "CLI: Çince çalıştırmada hata önce Çince, sonra İngilizce yazılır (--lang en yalnızca İngilizce); --json ile hata yalnızca JSON olur, --version --json da JSON verir."] }, { kind: "fix", items: ["CLI: --line küçük harfli bağlantı grubunu okur (ynd11); yalnızca off-circuit yazan satır yük altında değil yüksüz olarak boyutlandırılır; --mva veya --line yanındaki --conn artık hatadır (eskiden akım formülünü sessizce S/(3U) yapıyordu); --tap line veya --winding delta kullanın."] }],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["CLI: --market parametresi kaldırıldı. Yalnızca İtalya ve Türkiye'yi biliyordu ve çoğu durumda hiçbir şey yapmıyordu; toprağa yalıtımı --earth-um ile, ayar sargısı üzerindeki dayanım seviyelerini --across-li / --across-ac ile verin.", "Sayfa: sonuç kartının yüksekliği yeniden yapıldı; sayfanın sonunda formla aynı hizada biter, boş şerit kalmaz ve alçak pencerede tip görünür kalır; hep yaklaşık %100 gösteren yalıtım çubuğu kaldırıldı; üst çubukta simge yok; açılır kutu kenarlıkları daha açık."] }],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      groups: [{ kind: "fix", items: ["CLI: birbiriyle çelişen veya etkisi olmayan parametreler artık sessizce biri seçilmek yerine hata verir: --oil ile --vacuum, --octc ile --duty oltc, --conn Y ile --tap line, iki sargılı trafoda --hv / --mv, --iu yolunda --minus, farklı değerli --um ve --earth-um, 0.1'den küçük --step-pct."] }, { kind: "imp", items: ["Sayfa: sonuç sütunu form kadar yüksek, böylece ikisi aynı çizgide biter; üst çubukta sürüm numarası ile asistan kılavuzu ve sürüm notları bağlantıları var; yeni simge; toprağa dayanım seviyeleri Um'un altında."] }],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["CLI: her çalıştırmada npm'de yeni sürüm olup olmadığına bakar ve varsa çıktının sonunda bildirir; kendini güncellemez.", "Sayfa: formun üstündeki yapıştırma kutusu ve Bağlantıyı kopyala kaldırıldı; ototransformatör için Çince notlar daha sade yazıldı; AI sayfası artık doğrudan npm'deki oltc-selector'ı kullanıyor."] }],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      groups: [
        {
          kind: "new",
          items: [
            "Sayfa: etiket veya ihale satırını formun üstüne yapıştırın, form dolar; Bağlantıyı kopyala geçerli seçimi iş arkadaşınıza gönderir ve sayfa yenilenince kaybolmaz; ilk açılış tarayıcı dilini izler.",
            "CLI: yeni --version, her bayrak için --flag=value, bayrak verilmezse yardım ve yanlış yazılan bayrak için öneri; --json çıktısına resolved, line ve version eklendi, hata da JSON olarak verilir ve tip yoksa çıkış kodu 1 olur.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Yüksüz: listede karşılayan bir satır varken artık katalog dışı denmiyor (800 A, D, Um 72.5 kV şimdi WSLIV-2000D/72.5-18x17E verir); boyut harfi olmayan liste satırları seçilebilir.",
            "Katalog şemasında olmayan kademe kodu her zaman notuyla gelir; ± adım sayısı tam sayı olmalıdır; kuru tip CVT en çok 9 konumludur ve ± aralık için verildiğinde doğrusal ayar tipi olduğunu belirtir.",
            "CLI: ihale satırındaki tam genişlikli noktalama doğru okunur (tam genişlikli eğik çizgi AG sargısını boyutlandırıyordu); etkisi olamayacak bayrak artık sessizce atlanmaz, hata verir.",
          ],
        },
        {
          kind: "imp",
          items: [
            "Sayfa: alt bilgide sürüm notları, yapay zekâ ile seçim, koşullar ve gizlilik bağlantıları var; yazdırma yalnız sonuç kartını verir; metin ve alan kenarlıkları daha net; ekran okuyucu tip olmamasının nedenini söyler.",
          ],
        },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      groups: [{ kind: "new", items: ["CLI, npm'i günde en fazla bir kez kontrol eder ve daha yeni bir sürüm varsa sonunda güncelleme komutuyla bir uyarı yazar; kendini asla güncellemez. --no-update-check veya OLTC_NO_UPDATE_CHECK=1 ile kapatılır."] }],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      groups: [
        {
          kind: "imp",
          items: [
            "Tip, bir parametre değişir değişmez güncellenir, Seç düğmesi yoktur; sonuç kartı görevi tipin anma değerlerinin yanına koyar (Imax, kademe gerilimi, kademe gücü, cihaz Um) ve her birinin ne kadarının kullanıldığını gösterir.",
            "Telefonda geçerli tip, Kopyala ve tam sonuca geçiş düğmesiyle alttaki çubukta kalır; Kademe değiştirici bölümü varsayılan olarak kapalıdır ve değerlerini tek satırda özetler.",
          ],
        },
        {
          kind: "fix",
          items: [
            "CLI: W/G'de verilen konum sayısı artık ±8 ile değiştirilmez; doğrusal ±8, 17 konumdur; akımdan boyutlanan ototransformatör varsayılan olarak bağlantı noktasına konur; verilen toprağa yalıtım 363 kV üstünde de geçerlidir; yalnızca üçgen seçilince hat ucu varsayılır.",
          ],
        },
      ],
    },
    {
      version: "2.0.0",
      date: "2026-10",
      groups: [
        { kind: "new", items: ["Transformatör tipini (iki sargılı veya ototransformatör) ve kademe değiştiricinin yerini (nötr, hat ucu, seri–ortak bağlantı noktası, OG çıkışı) seçin; akım, kademe gerilimi ve yalıtım bu konumdan hesaplanır."] },
        {
          kind: "fix",
          items: [
            "Ototransformatörler YG sisteminin yalıtımını alır ve yalnızca kombine kademe değiştirici kullanır; kompakt tipler artık çıkmaz.",
            "Nötr yalıtımı verilmediğinde Um 72.5 ile seçilir ve OS ile teyit olarak işaretlenir; 35 kV sınıfı nötr de aynı şekilde işaretlenir.",
          ],
        },
        { kind: "imp", items: ["Sayfa yeniden tasarlandı: form ve sonuç yan yana, akım, kademe gerilimi, yalıtım ve konum canlı gösterilir; telefon için ayrı düzen."] },
      ],
    },
    {
      version: "1.3.0",
      date: "2026-10",
      groups: [
        {
          kind: "fix",
          items: [
            "Kademeler arası yalıtım tüm seçici sınıflarını aştığında sayfa artık DE tipi vermiyor ve mühendislikle iletişime geçmenizi istiyor.",
            "Özel kademe yüzdesi ve güvenlik katsayısı ondalık kabul ediyor, virgüllü 0,5 dahil; yüksüz modda yapılan kademe değişiklikleri artık yük altı seçimi etkilemiyor.",
            "Yıldızda gerilim etiketi toprağa yalıtımı, üçgende kullanılan Um değerini gösteriyor; kademe gerilimi eksik hesaplanmasın diye Herhangi bağlantısı kaldırıldı.",
          ],
        },
        {
          kind: "imp",
          items: [
            "Sonuç kartı mühendislik onayı gereken durumları işaretliyor: kademe gerilimi verilmemiş, akım anma değerinin üstünde, standart dışı kademe kodu veya yükseltilmiş seçici sınıfı.",
          ],
        },
      ],
    },
    {
      version: "1.2.9",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Çift kesmeli vakum ailesi SDZV eklendi: kademe gerilimi 6000 V’e kadar, kademe kapasitesi SHZV’nin yaklaşık 1,5 katı.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Yağ ve vakum kesme artık kesin sınır: yağ seçildiğinde sonuçta vakum tipleri çıkmaz; tank üstü vakum işletmesi hiçbir vakum tipine sığmazsa araç, yağlı reaktör tipine dönmek yerine katalog dışı olduğunu söyler.",
          ],
        },
        {
          kind: "imp",
          items: ["Asistan kılavuzu üç adımlı bir akışa dönüştü: kur, gönder, tipi al."],
        },
      ],
    },
    {
      version: "1.2.6",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "Asistan becerisi kendi deposuna taşındı ve eğitim sayfası doğrudan oraya bağlanıyor; güncellemeler artık daha hızlı.",
          ],
        },
      ],
    },
    {
      version: "1.2.5",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "Kontak sayısı verilen bir yüksüz kademe değiştirici artık yanlışlıkla 17 kademe sayılmıyor.",
            "Komut satırında güvenlik katsayısı artık varsayılan ×1.0, web ile aynı.",
            "Açıklamalardaki akım değerleri yuvarlanıyor, uzun ondalıklar yok.",
          ],
        },
        {
          kind: "imp",
          items: ["Asistan artık faz sayısı dahil daha eksiksiz varsayımlar listeliyor."],
        },
      ],
    },
    {
      version: "1.2.4",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Asistan ve CLI, hangi girdileri vermediğinizi ve hangi varsayılanların kullanıldığını her çalıştırmadan sonra bildirir.",
            "Asistan iki beceri marketinde yayında: WorkBuddy SkillHub ve skillhub.cn.",
          ],
        },
      ],
    },
    {
      version: "1.2.3",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["Asistan kendi simgesiyle geliyor; WorkBuddy beceri marketinde kolayca tanınır."],
        },
      ],
    },
    {
      version: "1.2.2",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["Asistan kılavuzu yeniden yazıldı: üst yarı insanlar için, alt yarı yapay zekâ için."],
        },
      ],
    },
    {
      version: "1.2.1",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "Asistan daha fazla girdiyi anlıyor: kademe gerilimi, montaj (tank içi, tank üstü, kuru), kesme ortamı (yağ veya vakum) ve faz sayısı.",
          ],
        },
      ],
    },
    {
      version: "1.2.0",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "oltc komut satırı aracı yayınlandı; web ile aynı seçim motorunu paylaşıyor.",
            "Seçim asistanı yayında: transformatör verilerini bir yapay zekâ asistanına gönderin, tipi geri alın.",
            "Yalnızca transformatör gücünü girmeniz yeterli; araç en yüksek geçiş akımını kendisi hesaplar.",
            "Yüksüz kademe değiştiriciler katalogdaki bağlantı şemalarını sunar: II ters çevirme, IV doğrusal, V tek köprü, VI Y-D, VII çift köprü, VIII seri-paralel.",
            "Sonuç kartı yapıyı belirtir: bileşik, kombine, kafes veya tambur.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Katalogda veya 2025 listesinde olmayan tipler artık çıkmaz, örneğin üç faz üçgen CM2.",
            "Kombine üç faz yük-altı kademe değiştiriciler yalnızca yıldız noktası içindir; üçgen veya hat ucu işletmelerde üç tek fazlı üniteye geçilir.",
          ],
        },
      ],
    },
    {
      version: "1.1.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: [
            "Söndürme tipi seçilebilir: yağ veya vakum.",
            "66, 110 ve 220 kV ön ayarları tek tıkla tipik işletmeyi doldurur.",
          ],
        },
        {
          kind: "imp",
          items: ["Form ve sonuç yan yana, aynı yükseklikte; geniş ekranda Seç düğmesi için kaydırmaya gerek yok."],
        },
      ],
    },
    {
      version: "1.0.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: ["İlk sürüm: transformatör verilerini girin, katalogda var olan tipi alın."],
        },
      ],
    },
  ],
  id: [
    {
      version: "2.4.1",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["CLI: keluaran lebih pendek. Baris asumsi hanya menyebut hal yang dapat mengubah tipe (daftar lengkap tetap ada di --json), isolasi ke tanah tidak lagi disebut tiga kali, dan Lainnya kini menjadi tipe lain yang memenuhi tugas.", "CLI: pada keluaran bahasa Mandarin, galat dicetak dalam bahasa Mandarin lalu Inggris (--lang en hanya Inggris); dengan --json galat hanya berupa JSON, dan --version --json juga JSON."] }, { kind: "fix", items: ["CLI: --line membaca grup vektor huruf kecil (ynd11); baris yang hanya menyebut off-circuit dihitung sebagai tanpa beban, bukan berbeban; --conn di samping --mva atau --line kini menjadi galat (dulu diam-diam mengubah rumus arus menjadi S/(3U)); pakai --tap line atau --winding delta."] }],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["CLI: parameter --market dihapus. Parameter itu hanya mengenal Italia dan Turki dan pada kebanyakan kasus tidak berpengaruh; nyatakan isolasi ke tanah dengan --earth-um dan tingkat ketahanan melintasi belitan pengatur dengan --across-li / --across-ac.", "Halaman: tinggi kartu hasil dibuat ulang, sehingga di akhir halaman kartu berakhir sejajar dengan formulir tanpa pita kosong, dan tipe tetap terlihat pada jendela pendek; batang isolasi yang selalu menunjukkan sekitar 100 % dihapus; tidak ada ikon di kepala halaman; garis tepi dropdown lebih terang."] }],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      groups: [{ kind: "fix", items: ["CLI: parameter yang saling bertentangan atau tidak berpengaruh kini menjadi galat, bukan dipilih salah satu secara diam-diam: --oil dengan --vacuum, --octc dengan --duty oltc, --conn Y dengan --tap line, --hv / --mv pada trafo dua belitan, --minus pada jalur --iu, --um dan --earth-um dengan nilai berbeda, --step-pct di bawah 0.1."] }, { kind: "imp", items: ["Halaman: kolom hasil setinggi formulir sehingga keduanya berakhir pada satu garis; kepala halaman menampilkan versi serta tautan ke panduan asisten dan catatan rilis; ikon baru; tingkat ketahanan ke tanah berada di bawah Um."] }],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      groups: [{ kind: "imp", items: ["CLI: setiap dijalankan memeriksa npm untuk versi baru dan memberi tahu di akhir keluaran bila ada; tidak memperbarui dirinya sendiri.", "Halaman: kotak tempel di atas formulir dan Salin tautan dihapus; catatan autotransformator dalam bahasa Mandarin ditulis lebih sederhana; halaman AI kini langsung memakai oltc-selector dari npm."] }],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      groups: [
        {
          kind: "new",
          items: [
            "Halaman: tempel baris pelat nama atau baris tender di bagian atas formulir untuk mengisinya; Salin tautan mengirim pilihan saat ini ke rekan dan tetap ada setelah dimuat ulang; kunjungan pertama mengikuti bahasa peramban.",
            "CLI: --version baru, --flag=value untuk semua opsi, bantuan saat tidak ada opsi, dan saran untuk opsi yang salah ketik; --json menambah resolved, line, dan version, galat juga berupa JSON, dan kode keluar 1 bila tidak ada tipe.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Tanpa beban: tidak lagi disebut di luar katalog saat ada baris daftar yang memenuhi (800 A, D, Um 72.5 kV kini memberi WSLIV-2000D/72.5-18x17E); baris daftar tanpa huruf ukuran dapat dipilih.",
            "Kode tap yang bukan diagram katalog selalu membawa catatannya; langkah ± harus bilangan bulat; CVT tipe kering paling banyak 9 posisi dan diberi catatan bahwa itu tipe regulasi linear bila dipakai untuk rentang ±.",
            "CLI: tanda baca lebar penuh pada baris tender dibaca dengan benar (garis miring lebar penuh dulu mengukur belitan TR); opsi yang tidak dapat berlaku kini menjadi galat, tidak lagi diabaikan diam-diam.",
          ],
        },
        {
          kind: "imp",
          items: [
            "Halaman: bagian bawah memuat tautan catatan rilis, pemilihan dengan AI, ketentuan, dan privasi; cetak hanya menghasilkan kartu hasil; teks dan garis tepi kolom lebih jelas; pembaca layar menyebutkan alasan tidak ada tipe.",
          ],
        },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      groups: [{ kind: "new", items: ["CLI memeriksa npm paling banyak sekali sehari dan, jika ada versi baru, menampilkan pemberitahuan beserta perintah pembaruan di akhir; CLI tidak pernah memperbarui dirinya sendiri. Matikan dengan --no-update-check atau OLTC_NO_UPDATE_CHECK=1."] }],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      groups: [
        {
          kind: "imp",
          items: [
            "Tipe langsung berubah begitu parameter diubah, tanpa tombol Pilih; kartu hasil menaruh kondisi kerja di samping rating tipe (Imax, tegangan tap, kapasitas tap, Um OLTC) dan menunjukkan berapa bagian tiap rating yang terpakai.",
            "Di ponsel, tipe saat ini tetap di bilah bawah dengan tombol Salin dan lompatan ke hasil lengkap; bagian OLTC terlipat secara bawaan dengan satu baris yang merangkum nilainya.",
          ],
        },
        {
          kind: "fix",
          items: [
            "CLI: jumlah posisi pada W/G tidak lagi diganti ±8; linear ±8 berarti 17 posisi; autotransformator yang dihitung dari arus secara bawaan berada di titik sambungan; isolasi ke tanah yang diisi berlaku di atas 363 kV; hanya segitiga secara bawaan di ujung saluran.",
          ],
        },
      ],
    },
    {
      version: "2.0.0",
      date: "2026-10",
      groups: [
        { kind: "new", items: ["Pilih jenis transformator (dua belitan atau autotransformator) dan letak OLTC (netral, ujung saluran, sambungan seri – bersama, saluran TM); arus, tegangan tap dan isolasi dihitung dari letak itu."] },
        {
          kind: "fix",
          items: [
            "Autotransformator memakai isolasi sistem TT dan hanya OLTC kombinasi; tipe kompon tidak lagi muncul.",
            "Bila isolasi netral tidak diberikan, dipilih pada Um 72.5 dan ditandai Cek OS; netral kelas 35 kV ditandai sama.",
          ],
        },
        { kind: "imp", items: ["Halaman didesain ulang: formulir dan hasil berdampingan, arus, tegangan tap, isolasi dan letak OLTC tampil langsung; tata letak khusus ponsel."] },
      ],
    },
    {
      version: "1.3.0",
      date: "2026-10",
      groups: [
        {
          kind: "fix",
          items: [
            "Bila isolasi antar-tap melebihi semua kelas selector, halaman tidak lagi memberi tipe DE dan meminta Anda menghubungi bagian engineering.",
            "Persen per tap dan faktor keamanan kustom menerima desimal, termasuk 0,5 dengan koma; perubahan tap pada mode tanpa beban tidak lagi terbawa ke pemilihan berbeban.",
            "Untuk hubungan bintang, keterangan tegangan menampilkan ketahanan isolasi ke tanah, untuk delta menampilkan Um yang benar-benar dipakai; pilihan hubungan Bebas dihapus agar tegangan per tap tidak terhitung terlalu kecil.",
          ],
        },
        {
          kind: "imp",
          items: [
            "Kartu hasil menandai hal yang harus dikonfirmasi engineering: tegangan per tap tidak diisi, kondisi kerja di atas rating, kode tap tidak standar, atau kelas selector yang dinaikkan.",
          ],
        },
      ],
    },
    {
      version: "1.2.9",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Keluarga vakum pemutusan ganda SDZV tersedia, dengan tegangan per tap hingga 6000 V dan kapasitas per tap sekitar 1,5 kali SHZV.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Pemutusan minyak dan vakum kini sama-sama batas mutlak: memilih minyak mengeluarkan tipe vakum dari hasil, dan bila kondisi kerja vakum di atas tangki melebihi semua tipe vakum, alat ini menyatakan di luar katalog alih-alih mengganti dengan tipe reaktor minyak.",
          ],
        },
        {
          kind: "imp",
          items: ["Panduan asisten kini berupa tiga langkah: pasang, kirim, dapatkan tipenya."],
        },
      ],
    },
    {
      version: "1.2.6",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "Skill asisten pindah ke repositori sendiri dan halaman tutorial langsung menautkannya, sehingga pembaruan lebih cepat sampai.",
          ],
        },
      ],
    },
    {
      version: "1.2.5",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "OLTC tanpa beban dengan jumlah kontak tertentu tidak lagi terbaca sebagai 17 posisi.",
            "Faktor keamanan di command line kini bawaannya ×1.0, sama dengan aplikasi web.",
            "Arus kondisi kerja dalam teks alasan dibulatkan, tanpa desimal panjang.",
          ],
        },
        {
          kind: "imp",
          items: ["Asisten menyampaikan daftar asumsi yang lebih lengkap, termasuk jumlah fasa."],
        },
      ],
    },
    {
      version: "1.2.4",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Asisten dan CLI memberi tahu input mana yang tidak diisi dan nilai bawaan mana yang dipakai, setiap kali dijalankan.",
            "Asisten diterbitkan di dua marketplace skill: WorkBuddy SkillHub dan skillhub.cn.",
          ],
        },
      ],
    },
    {
      version: "1.2.3",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "Asisten kini dilengkapi ikon, sehingga mudah dikenali di marketplace skill WorkBuddy.",
          ],
        },
      ],
    },
    {
      version: "1.2.2",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["Manual asisten ditulis ulang: bagian atas untuk manusia, bagian bawah untuk AI."],
        },
      ],
    },
    {
      version: "1.2.1",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "Asisten memahami lebih banyak input: tegangan per tap, pemasangan (di dalam tangki, di atas tangki, kering), media pemutus (minyak atau vakum), dan jumlah fasa.",
          ],
        },
      ],
    },
    {
      version: "1.2.0",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Alat command line oltc diterbitkan, memakai mesin pemilihan yang sama dengan aplikasi web.",
            "Asisten pemilihan diluncurkan: kirim data trafo ke asisten AI dan dapatkan tipenya.",
            "Pemilihan bisa dilakukan hanya dengan kapasitas trafo; alat ini menurunkan arus lewat maksimum.",
            "OLTC tanpa beban menawarkan skema sambungan sesuai brosur: II pembalik, IV linear, V jembatan tunggal, VI Y-D, VII jembatan ganda, VIII seri-paralel.",
            "Kartu hasil menyebutkan konstruksinya: majemuk, kombinasi, sangkar, atau drum.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Tipe yang tidak ada di brosur atau daftar 2025 tidak lagi muncul, misalnya CM2 tiga fasa delta.",
            "OLTC berbeban kombinasi tiga fasa hanya untuk titik netral; kondisi kerja delta atau ujung saluran beralih ke tiga unit satu fasa.",
          ],
        },
      ],
    },
    {
      version: "1.1.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: [
            "Pemutus busur bisa dipilih: minyak atau vakum.",
            "Preset 66, 110, dan 220 kV mengisi kondisi kerja umum dengan satu klik.",
          ],
        },
        {
          kind: "imp",
          items: ["Formulir dan hasil berdampingan dengan tinggi yang sama, sehingga di layar lebar tidak perlu menggulir untuk menekan Pilih."],
        },
      ],
    },
    {
      version: "1.0.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: ["Rilis pertama: masukkan data trafo dan dapatkan tipe yang ada di katalog."],
        },
      ],
    },
  ],
};
