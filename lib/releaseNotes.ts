import type { Lang } from "./i18n";

export type NoteKind = "fix" | "new" | "imp";
export type NoteGroup = { kind: NoteKind; items: string[] };
export type Release = {
  version: string;
  /** YYYY-MM */
  date: string;
  /** One line a reader can scan: what this release is about. */
  title: string;
  groups: NoteGroup[];
};

/** What is the same in every language: the exact day (from the version
 *  commit or tag, where git has one) and a screenshot of how the page looked
 *  in that release, for the releases that changed its look. Screenshots are
 *  real runs of that tag, in public/changelog/. */
export const RELEASE_META: Record<string, { day?: string; image?: string }> = {
  "2.4.1": { day: "2026-11-14" },
  "2.4.0": { day: "2026-11-14", image: "/changelog/v2.4.0.webp" },
  "2.3.2": { day: "2026-11-14" },
  "2.3.1": { day: "2026-11-14" },
  "2.3.0": { day: "2026-11-13" },
  "2.2.0": { day: "2026-10-31" },
  "2.1.0": { day: "2026-10-31", image: "/changelog/v2.1.0.webp" },
  "2.0.0": { day: "2026-10-28", image: "/changelog/v2.0.0.webp" },
  "1.3.0": { day: "2026-10-22" },
  "1.2.9": { day: "2026-09-18" },
  "1.1.0": { day: "2026-08-20" },
  "1.0.0": { day: "2026-08-19", image: "/changelog/v1.0.0.webp" },
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
      title: "命令行输出更短、更好读",
      groups: [
        { kind: "imp", items: ["命令行：结果更短。只列出可能影响型号的假定，对地绝缘只说一次。", "命令行：出错时先给中文再给英文；用 --json 时出错也只给 JSON，方便程序读取。"] },
        { kind: "fix", items: ["命令行：小写的联结组（如 ynd11）也能读懂；只写了 off-circuit 的参数行会按无载开关选。", "命令行：给了容量又写 --conn 现在会报错，以前会悄悄把电流算错。请改用 --tap line 或 --winding delta。"] },
      ],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      title: "结果卡重新排版",
      groups: [
        { kind: "imp", items: ["页面：结果卡和表单一样高，滚到底两边对齐，不再留一块空白；窗口矮时也能看到型号。", "页面：去掉总在 100% 附近的对地绝缘进度条；页头不再放图标；下拉框边线调淡。", "命令行：去掉 --market 参数（它只认意大利和土耳其，大多时候不起作用）。对地绝缘直接用 --earth-um 写。"] },
      ],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      title: "参数写错会直接告诉你",
      groups: [
        { kind: "fix", items: ["命令行：参数互相矛盾或不起作用时会报错，不再悄悄挑一个用。比如同时写了油和真空，或者双绕组却给了中压。"] },
        { kind: "imp", items: ["页面：结果栏和表单一样高；页头加上版本号、选型助手和更新记录；换了新图标；对地工频和雷电耐压写在 Um 下面。"] },
      ],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      title: "命令行会提醒有新版本",
      groups: [
        { kind: "imp", items: ["命令行：每次运行都会看看 npm 上有没有新版本，有就在最后提醒一句，不会自己更新。", "页面：去掉表单上方的粘贴框和「复制链接」；自耦变的提示换成更直白的说法；AI 选型页直接用 npm 上的版本。"] },
      ],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      title: "粘贴铭牌就能填表",
      groups: [
        { kind: "new", items: ["页面：把铭牌或招标里的一行参数贴进来，表单自动填好；「复制链接」能把当前选型发给同事；第一次打开时按浏览器语言显示。", "命令行：--version 查看版本；不带参数时显示帮助；参数拼错会提示正确写法；给程序用的 JSON 输出更完整。"] },
        { kind: "fix", items: ["无载：清单里有型号却说「超出目录」的问题已修好（例如 800 A、角接、Um 72.5 kV 现在给出 WSLIV-2000D/72.5-18x17E）。", "样本接线图里没有的档位码都会带提醒；± 级数必须是整数；干式 CVT 最多 9 档，用在 ± 调压时会提示它是线性调型号。", "命令行：铭牌里的全角符号（比如全角斜杠）能正确识别，以前可能按低压侧选错。"] },
        { kind: "imp", items: ["页面：页脚加了更新记录、AI 选型、条款和隐私链接；打印时只打结果卡；文字和输入框更清楚；读屏软件会读出为什么没有型号。"] },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      title: "每天检查一次新版本",
      groups: [
        { kind: "new", items: ["命令行每天最多检查一次有没有新版本，有就在最后提醒并给出更新命令，不会自己更新。不想要提醒，加 --no-update-check。"] },
      ],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      title: "改了参数，型号马上跟着变",
      groups: [
        { kind: "imp", items: ["不用再点「选型」：改了参数，型号马上更新。结果卡把工况和型号额定值并排列出（最大通过电流、级电压、级容量、开关绝缘），并显示用了几成。", "手机上，当前型号固定在屏幕底部，可以直接复制；「开关」一组默认收起，标题下面一行列出当前的值。"] },
        { kind: "fix", items: ["命令行：粗细调、正反调时写的工作位置数不再被 ±8 覆盖；线性调 ±8 按 17 个位置算；自耦变默认开关在串联/公共绕组连接点；363 kV 以上也能手动指定对地绝缘；只写角接时默认在线端。"] },
      ],
    },
    {
      version: "2.0.0",
      date: "2026-10",
      title: "全新页面，按开关位置选型",
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
      title: "结果卡会提醒哪些要工程确认",
      groups: [
        { kind: "fix", items: ["调压绕组上的绝缘超出所有选择器等级时，不再给出 DE 型号，而是提示联系工程。", "自定义调节比例和安全系数可以输小数，写成 0,5 也行；无载里改过的档位不再带进有载选型。", "星接时电压旁边显示对地绝缘，角接时显示实际用的 Um；去掉「不限」连接方式，免得级电压被少算。"] },
        { kind: "imp", items: ["结果卡会标出要工程确认的情况：没给级电压、超出额定电流、非标准档位码、选择器等级被上调。"] },
      ],
    },
    {
      version: "1.2.9",
      date: "2026-09",
      title: "新增双断口真空 SDZV",
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
      title: "助手技能独立成库",
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
      title: "无载触头数与安全系数修正",
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
      title: "每次运行都列出默认值",
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
      title: "助手带上图标",
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
      title: "助手说明书重写",
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
      title: "助手能读更多参数",
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
      title: "命令行和选型助手上线",
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
      title: "油或真空可选，一键预设",
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
      title: "第一版上线",
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
      title: "Shorter, easier CLI output",
      groups: [
        { kind: "imp", items: ["CLI: shorter results. It lists only the assumptions that could change the type, and states the insulation to earth once.", "CLI: on a Chinese run an error shows Chinese first, then English; with --json an error is JSON only, so programs can read it."] },
        { kind: "fix", items: ["CLI: a lower-case vector group (such as ynd11) is read correctly; a line that says only off-circuit picks an off-circuit switch.", "CLI: --conn next to a capacity now stops with an error, because it used to change the current quietly. Use --tap line or --winding delta."] },
      ],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      title: "A cleaner result card",
      groups: [
        { kind: "imp", items: ["Page: the result card is as tall as the form and ends level with it, with no empty band; on a short window the type stays in view.", "Page: the earth-insulation bar that always read near 100% is gone; no icon in the header; softer dropdown borders.", "CLI: the --market flag is gone (it knew only Italy and Turkey and did nothing in most cases). Give the insulation to earth with --earth-um."] },
      ],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      title: "Wrong settings now get a clear error",
      groups: [
        { kind: "fix", items: ["CLI: settings that contradict each other or do nothing now stop with an error, instead of one being picked quietly. For example oil and vacuum together, or an MV voltage on a two-winding transformer."] },
        { kind: "imp", items: ["Page: the result column is as tall as the form; the header shows the version and links to the assistant and the release notes; a new icon; the earth withstand levels sit under Um."] },
      ],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      title: "The CLI tells you about new versions",
      groups: [
        { kind: "imp", items: ["CLI: each run checks npm for a newer version and adds a one-line note at the end; it never updates itself.", "Page: the paste box and Copy link above the form are gone; the autotransformer notes use plainer words; the AI page uses the npm version directly."] },
      ],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      title: "Paste a nameplate to fill the form",
      groups: [
        { kind: "new", items: ["Page: paste a nameplate or tender line and the form fills itself; Copy link sends your selection to a colleague; the first visit uses your browser's language.", "CLI: --version shows the version; no flags shows help; a mistyped flag gets a suggestion; the JSON output for programs is more complete."] },
        { kind: "fix", items: ["Off-circuit: a duty no longer says out of catalogue when the list has a type for it (800 A, delta, Um 72.5 kV now gives WSLIV-2000D/72.5-18x17E).", "A tap code that is not in the brochure's diagrams always comes with a note; ± steps must be a whole number; dry-type CVT stops at 9 positions and says it is a linear type when used for a ± range.", "CLI: full-width characters in a nameplate line, such as a full-width slash, are read correctly; before, they could size the LV winding."] },
        { kind: "imp", items: ["Page: footer links to the release notes, AI selection, terms and privacy; printing gives only the result card; clearer text and field borders; screen readers say why there is no type."] },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      title: "A daily check for new versions",
      groups: [
        { kind: "new", items: ["The CLI checks for a new version at most once a day and, when there is one, ends with a note and the update command; it never updates itself. Add --no-update-check to turn it off."] },
      ],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      title: "The type follows your inputs at once",
      groups: [
        { kind: "imp", items: ["No more Select button: the type updates as soon as you change a value. The result card puts the duty next to the type's rating (max through-current, step voltage, step capacity, switch insulation) and shows how much of each is used.", "On phones the type stays at the bottom of the screen, ready to copy; the Tap changer section starts folded, with its values in one line under the title."] },
        { kind: "fix", items: ["CLI: a position count given for coarse-fine or reversing is no longer replaced by ±8; linear ±8 counts as 17 positions; an autotransformer defaults to the series–common junction; a stated insulation to earth works above 363 kV; delta alone defaults to the line end."] },
      ],
    },
    {
      version: "2.0.0",
      date: "2026-10",
      title: "A new page: pick by transformer kind and tap position",
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
      title: "The result card says what engineering must check",
      groups: [
        { kind: "fix", items: ["When the insulation across the regulating winding is above every selector grade, the page asks you to contact engineering instead of giving a DE type.", "Custom step percent and safety factor take decimals, also with a comma (0,5); taps changed in off-circuit mode no longer carry into on-load.", "For star, the voltage note shows the insulation to earth; for delta, the Um actually used. The Any connection is gone, so step voltage is not counted too low."] },
        { kind: "imp", items: ["The result card marks what engineering must confirm: no step voltage given, duty above the rating, a non-standard tap code, or a raised selector grade."] },
      ],
    },
    {
      version: "1.2.9",
      date: "2026-09",
      title: "New: SDZV dual-break vacuum",
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
      title: "The assistant skill gets its own repository",
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
      title: "Fixes for contact count and safety factor",
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
      title: "Every run lists the defaults it used",
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
      title: "The assistant gets its icon",
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
      title: "A rewritten assistant manual",
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
      title: "The assistant reads more inputs",
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
      title: "The CLI and the AI assistant launch",
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
      title: "Oil or vacuum, and one-click presets",
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
      title: "First release",
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
      title: "Kết quả CLI ngắn và dễ đọc hơn",
      groups: [
        { kind: "imp", items: ["CLI: kết quả ngắn hơn. Chỉ liệt kê các giả định có thể làm đổi kiểu, và nói cách điện với đất một lần.", "CLI: khi chạy tiếng Trung, lỗi hiện tiếng Trung trước rồi tiếng Anh; với --json, lỗi chỉ ở dạng JSON để chương trình đọc được."] },
        { kind: "fix", items: ["CLI: tổ đấu dây viết thường (như ynd11) được đọc đúng; dòng chỉ ghi off-circuit sẽ chọn bộ chuyển nấc không tải.", "CLI: ghi --conn cùng với công suất giờ báo lỗi, vì trước đây nó lặng lẽ làm sai dòng điện. Hãy dùng --tap line hoặc --winding delta."] },
      ],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      title: "Thẻ kết quả gọn hơn",
      groups: [
        { kind: "imp", items: ["Trang: thẻ kết quả cao bằng biểu mẫu và kết thúc ngang hàng, không còn khoảng trống; cửa sổ thấp vẫn thấy kiểu.", "Trang: bỏ thanh cách điện với đất luôn gần 100%; đầu trang không còn biểu tượng; viền ô chọn nhạt hơn.", "CLI: bỏ tham số --market (chỉ biết Ý và Thổ Nhĩ Kỳ, phần lớn không có tác dụng). Ghi cách điện với đất bằng --earth-um."] },
      ],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      title: "Cài đặt sai sẽ báo lỗi rõ ràng",
      groups: [
        { kind: "fix", items: ["CLI: tham số mâu thuẫn nhau hoặc không có tác dụng giờ báo lỗi, không lặng lẽ chọn một cái. Ví dụ ghi cả dầu và chân không, hoặc máy hai cuộn dây mà lại có điện áp trung áp."] },
        { kind: "imp", items: ["Trang: cột kết quả cao bằng biểu mẫu; đầu trang có số phiên bản, liên kết tới trợ lý và nhật ký cập nhật; biểu tượng mới; mức chịu điện áp với đất nằm dưới Um."] },
      ],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      title: "CLI báo khi có phiên bản mới",
      groups: [
        { kind: "imp", items: ["CLI: mỗi lần chạy sẽ kiểm tra npm có phiên bản mới không và thêm một dòng nhắc ở cuối; không bao giờ tự cập nhật.", "Trang: bỏ ô dán và nút Sao chép liên kết phía trên biểu mẫu; ghi chú máy tự ngẫu dùng lời dễ hiểu hơn; trang AI dùng thẳng bản trên npm."] },
      ],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      title: "Dán nhãn máy để điền biểu mẫu",
      groups: [
        { kind: "new", items: ["Trang: dán một dòng nhãn máy hoặc hồ sơ thầu, biểu mẫu tự điền; Sao chép liên kết gửi lựa chọn cho đồng nghiệp; lần mở đầu dùng ngôn ngữ của trình duyệt.", "CLI: --version cho biết phiên bản; không có tham số thì hiện trợ giúp; gõ sai tham số sẽ được gợi ý; đầu ra JSON cho chương trình đầy đủ hơn."] },
        { kind: "fix", items: ["Không tải: không còn báo ngoài catalogue khi danh sách có kiểu phù hợp (800 A, tam giác, Um 72,5 kV nay cho WSLIV-2000D/72.5-18x17E).", "Mã nấc không có trong sơ đồ của catalogue luôn kèm ghi chú; số cấp ± phải là số nguyên; CVT khô tối đa 9 vị trí và báo là kiểu tuyến tính khi dùng cho dải ±.", "CLI: ký tự toàn độ trong dòng nhãn máy, như dấu gạch chéo toàn độ, được đọc đúng; trước đây có thể chọn theo phía hạ áp."] },
        { kind: "imp", items: ["Trang: chân trang có liên kết tới nhật ký cập nhật, chọn bằng AI, điều khoản và quyền riêng tư; in chỉ ra thẻ kết quả; chữ và viền ô rõ hơn; trình đọc màn hình nói lý do không có kiểu."] },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      title: "Kiểm tra phiên bản mới mỗi ngày",
      groups: [
        { kind: "new", items: ["CLI kiểm tra phiên bản mới tối đa một lần mỗi ngày; nếu có, cuối kết quả sẽ nhắc kèm lệnh cập nhật, không bao giờ tự cập nhật. Thêm --no-update-check để tắt."] },
      ],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      title: "Kiểu thay đổi ngay khi bạn nhập",
      groups: [
        { kind: "imp", items: ["Không còn nút Chọn: kiểu cập nhật ngay khi bạn đổi một giá trị. Thẻ kết quả đặt tải bên cạnh định mức của kiểu (dòng qua lớn nhất, điện áp cấp, công suất cấp, cách điện) và cho thấy đã dùng bao nhiêu.", "Trên điện thoại, kiểu luôn nằm ở cuối màn hình, sao chép được ngay; nhóm Bộ chuyển nấc mặc định thu gọn, giá trị hiện trên một dòng dưới tiêu đề."] },
        { kind: "fix", items: ["CLI: số vị trí ghi cho thô-tinh hoặc đảo chiều không còn bị ±8 thay thế; tuyến tính ±8 tính là 17 vị trí; máy tự ngẫu mặc định ở điểm nối cuộn nối tiếp–chung; cách điện với đất ghi tay dùng được trên 363 kV; chỉ ghi tam giác thì mặc định ở đầu đường dây."] },
      ],
    },
    {
      version: "2.0.0",
      date: "2026-10",
      title: "Trang mới: chọn theo loại máy và vị trí bộ chuyển nấc",
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
      title: "Thẻ kết quả nêu những gì kỹ thuật phải kiểm tra",
      groups: [
        { kind: "fix", items: ["Khi cách điện trên cuộn điều chỉnh cao hơn mọi cấp bộ chọn, trang yêu cầu liên hệ kỹ thuật thay vì đưa ra kiểu DE.", "Tỷ lệ cấp tự nhập và hệ số an toàn nhận số thập phân, cả dấu phẩy (0,5); nấc đã đổi ở chế độ không tải không còn mang sang có tải.", "Với sao, ghi chú điện áp hiện cách điện với đất; với tam giác, hiện Um thực dùng. Bỏ lựa chọn Bất kỳ để điện áp cấp không bị tính thiếu."] },
        { kind: "imp", items: ["Thẻ kết quả đánh dấu những gì kỹ thuật phải xác nhận: chưa có điện áp cấp, tải vượt định mức, mã nấc không chuẩn, hoặc cấp bộ chọn bị nâng."] },
      ],
    },
    {
      version: "1.2.9",
      date: "2026-09",
      title: "Mới: SDZV chân không hai điểm cắt",
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
      title: "Kỹ năng trợ lý có kho riêng",
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
      title: "Sửa số tiếp điểm và hệ số an toàn",
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
      title: "Mỗi lần chạy đều liệt kê giá trị mặc định",
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
      title: "Trợ lý có biểu tượng",
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
      title: "Viết lại hướng dẫn trợ lý",
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
      title: "Trợ lý hiểu thêm thông số",
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
      title: "Ra mắt CLI và trợ lý AI",
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
      title: "Dầu hoặc chân không, mẫu cài sẵn một chạm",
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
      title: "Phiên bản đầu tiên",
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
      title: "Salida de la CLI más corta y clara",
      groups: [
        { kind: "imp", items: ["CLI: resultados más cortos. Solo lista las suposiciones que pueden cambiar el tipo, y dice una sola vez el aislamiento a tierra.", "CLI: en una ejecución en chino, un error sale primero en chino y luego en inglés; con --json el error es solo JSON, para que lo lean los programas."] },
        { kind: "fix", items: ["CLI: un grupo de conexión en minúsculas (como ynd11) se lee bien; una línea que solo dice off-circuit elige un cambiador sin carga.", "CLI: --conn junto a una potencia ahora da error, porque antes cambiaba la corriente sin avisar. Use --tap line o --winding delta."] },
      ],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      title: "Una tarjeta de resultado más limpia",
      groups: [
        { kind: "imp", items: ["Página: la tarjeta de resultado tiene la misma altura que el formulario y termina a su nivel, sin franja vacía; en una ventana baja el tipo sigue a la vista.", "Página: desaparece la barra de aislamiento a tierra, siempre cerca del 100 %; sin icono en la cabecera; bordes de desplegables más suaves.", "CLI: se elimina la opción --market (solo conocía Italia y Turquía y casi nunca hacía nada). Indique el aislamiento a tierra con --earth-um."] },
      ],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      title: "Los ajustes erróneos dan un error claro",
      groups: [
        { kind: "fix", items: ["CLI: las opciones que se contradicen o no tienen efecto ahora dan error, en vez de elegir una sin avisar. Por ejemplo aceite y vacío a la vez, o tensión de MT en un transformador de dos devanados."] },
        { kind: "imp", items: ["Página: la columna de resultado tiene la altura del formulario; la cabecera muestra la versión y enlaza al asistente y a las notas de versión; icono nuevo; las tensiones soportadas a tierra van bajo Um."] },
      ],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      title: "La CLI avisa de nuevas versiones",
      groups: [
        { kind: "imp", items: ["CLI: cada ejecución mira en npm si hay una versión nueva y añade un aviso de una línea al final; nunca se actualiza sola.", "Página: se quitan la caja para pegar y Copiar enlace sobre el formulario; las notas de autotransformador usan palabras más sencillas; la página de IA usa directamente la versión de npm."] },
      ],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      title: "Pegue una placa para rellenar el formulario",
      groups: [
        { kind: "new", items: ["Página: pegue una línea de placa o de licitación y el formulario se rellena solo; Copiar enlace envía su selección a un colega; la primera visita usa el idioma del navegador.", "CLI: --version muestra la versión; sin opciones muestra la ayuda; una opción mal escrita recibe una sugerencia; la salida JSON para programas es más completa."] },
        { kind: "fix", items: ["Sin carga: ya no dice fuera de catálogo cuando la lista tiene un tipo para el caso (800 A, triángulo, Um 72,5 kV ahora da WSLIV-2000D/72.5-18x17E).", "Un código de tomas que no está en los esquemas del catálogo siempre lleva nota; los escalones ± deben ser enteros; el CVT seco llega a 9 posiciones y avisa de que es lineal si se usa para un rango ±.", "CLI: los caracteres de ancho completo en una línea de placa, como la barra de ancho completo, se leen bien; antes podían dimensionar el devanado de BT."] },
        { kind: "imp", items: ["Página: el pie enlaza a las notas de versión, selección con IA, términos y privacidad; al imprimir sale solo la tarjeta de resultado; texto y bordes más claros; los lectores de pantalla dicen por qué no hay tipo."] },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      title: "Comprobación diaria de versiones nuevas",
      groups: [
        { kind: "new", items: ["La CLI busca una versión nueva como mucho una vez al día y, si la hay, termina con un aviso y el comando para actualizar; nunca se actualiza sola. Añada --no-update-check para desactivarlo."] },
      ],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      title: "El tipo sigue sus datos al instante",
      groups: [
        { kind: "imp", items: ["Ya no hay botón Seleccionar: el tipo se actualiza en cuanto cambia un valor. La tarjeta de resultado pone la carga junto a la capacidad del tipo (corriente máxima, tensión de escalón, capacidad de escalón, aislamiento) y muestra cuánto se usa.", "En el móvil, el tipo queda al pie de la pantalla, listo para copiar; la sección del cambiador empieza plegada, con sus valores en una línea bajo el título."] },
        { kind: "fix", items: ["CLI: un número de posiciones dado para grueso-fino o inversor ya no se sustituye por ±8; lineal ±8 cuenta 17 posiciones; un autotransformador va por defecto en la unión serie–común; un aislamiento a tierra indicado funciona por encima de 363 kV; triángulo solo va por defecto en el extremo de línea."] },
      ],
    },
    {
      version: "2.0.0",
      date: "2026-10",
      title: "Página nueva: elija por tipo de transformador y posición",
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
      title: "La tarjeta dice qué debe revisar ingeniería",
      groups: [
        { kind: "fix", items: ["Cuando el aislamiento en el devanado de regulación supera todos los grados del selector, la página pide contactar con ingeniería en vez de dar un tipo DE.", "El porcentaje de escalón y el factor de seguridad aceptan decimales, también con coma (0,5); las tomas cambiadas en modo sin carga ya no pasan al modo en carga.", "En estrella, la nota de tensión muestra el aislamiento a tierra; en triángulo, la Um realmente usada. Se quita la conexión Cualquiera para no contar de menos la tensión de escalón."] },
        { kind: "imp", items: ["La tarjeta marca lo que ingeniería debe confirmar: sin tensión de escalón, carga por encima de la capacidad, código de tomas no estándar o grado de selector elevado."] },
      ],
    },
    {
      version: "1.2.9",
      date: "2026-09",
      title: "Nuevo: SDZV de vacío con doble ruptura",
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
      title: "La habilidad del asistente tiene su propio repositorio",
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
      title: "Correcciones de contactos y factor de seguridad",
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
      title: "Cada ejecución indica los valores por defecto",
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
      title: "El asistente estrena icono",
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
      title: "Manual del asistente reescrito",
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
      title: "El asistente entiende más datos",
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
      title: "Llegan la CLI y el asistente de IA",
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
      title: "Aceite o vacío, y ajustes en un clic",
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
      title: "Primera versión",
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
      title: "Daha kısa ve okunur CLI çıktısı",
      groups: [
        { kind: "imp", items: ["CLI: sonuçlar daha kısa. Yalnızca tipi değiştirebilecek varsayımları listeler ve toprağa yalıtımı bir kez söyler.", "CLI: Çince çalıştırmada hata önce Çince, sonra İngilizce gelir; --json ile hata yalnızca JSON olur, programlar okuyabilsin diye."] },
        { kind: "fix", items: ["CLI: küçük harfli bağlantı grubu (ynd11 gibi) doğru okunur; yalnızca off-circuit yazan satır yüksüz bir kademe değiştirici seçer.", "CLI: güçle birlikte yazılan --conn artık hata verir, çünkü eskiden akımı sessizce değiştiriyordu. --tap line veya --winding delta kullanın."] },
      ],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      title: "Daha sade bir sonuç kartı",
      groups: [
        { kind: "imp", items: ["Sayfa: sonuç kartı formla aynı yükseklikte ve onunla aynı hizada biter, boş şerit kalmaz; alçak pencerede de tip görünür kalır.", "Sayfa: hep %100 civarında duran toprağa yalıtım çubuğu kaldırıldı; başlıkta simge yok; açılır kutu kenarları daha yumuşak.", "CLI: --market parametresi kaldırıldı (yalnızca İtalya ve Türkiye'yi biliyordu, çoğu zaman bir işe yaramıyordu). Toprağa yalıtımı --earth-um ile verin."] },
      ],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      title: "Yanlış ayarlar artık açık bir hata verir",
      groups: [
        { kind: "fix", items: ["CLI: birbiriyle çelişen ya da etkisi olmayan parametreler artık hata verir; biri sessizce seçilmez. Örneğin yağ ve vakum birlikte ya da iki sargılı trafoda OG gerilimi."] },
        { kind: "imp", items: ["Sayfa: sonuç sütunu formla aynı yükseklikte; başlıkta sürüm ile asistan ve sürüm notları bağlantıları var; yeni simge; toprağa dayanım değerleri Um'nin altında."] },
      ],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      title: "CLI yeni sürümleri bildirir",
      groups: [
        { kind: "imp", items: ["CLI: her çalıştırmada npm'de yeni sürüm var mı diye bakar ve sona tek satırlık bir not ekler; kendini asla güncellemez.", "Sayfa: formun üstündeki yapıştırma kutusu ve Bağlantıyı kopyala kaldırıldı; ototransformatör notları daha sade; AI sayfası doğrudan npm'deki sürümü kullanır."] },
      ],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      title: "Formu doldurmak için etiket yapıştırın",
      groups: [
        { kind: "new", items: ["Sayfa: bir etiket ya da ihale satırı yapıştırın, form kendini doldurur; Bağlantıyı kopyala seçiminizi bir meslektaşa gönderir; ilk ziyaret tarayıcı dilini kullanır.", "CLI: --version sürümü gösterir; parametresiz çalıştırma yardımı gösterir; yanlış yazılan parametreye öneri gelir; programlar için JSON çıktısı daha eksiksiz."] },
        { kind: "fix", items: ["Yüksüz: listede uygun tip varken artık katalog dışı demez (800 A, üçgen, Um 72,5 kV artık WSLIV-2000D/72.5-18x17E verir).", "Katalog şemalarında olmayan kademe kodu her zaman not ile gelir; ± kademe sayısı tam sayı olmalı; kuru CVT en fazla 9 konumdur ve ± aralık için kullanılınca lineer tip olduğunu söyler.", "CLI: etiket satırındaki tam genişlikli karakterler, örneğin tam genişlikli eğik çizgi, doğru okunur; eskiden AG sargısına göre seçebiliyordu."] },
        { kind: "imp", items: ["Sayfa: altbilgide sürüm notları, AI ile seçim, koşullar ve gizlilik bağlantıları; yazdırınca yalnızca sonuç kartı çıkar; daha net yazı ve kutu kenarları; ekran okuyucular tip olmamasının nedenini söyler."] },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      title: "Yeni sürüm için günlük kontrol",
      groups: [
        { kind: "new", items: ["CLI yeni sürümü günde en fazla bir kez kontrol eder; varsa sonda bir not ve güncelleme komutu verir, kendini asla güncellemez. Kapatmak için --no-update-check ekleyin."] },
      ],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      title: "Tip, girdilerinizi anında izler",
      groups: [
        { kind: "imp", items: ["Seç düğmesi yok artık: bir değeri değiştirdiğiniz anda tip güncellenir. Sonuç kartı yükü tipin değerlerinin yanına koyar (en büyük geçiş akımı, kademe gerilimi, kademe gücü, yalıtım) ve ne kadarının kullanıldığını gösterir.", "Telefonda tip ekranın altında durur, hemen kopyalanabilir; Kademe değiştirici bölümü kapalı başlar, değerleri başlığın altında tek satırda görünür."] },
        { kind: "fix", items: ["CLI: kaba-ince veya ters çevirmeli için verilen konum sayısı artık ±8 ile değiştirilmez; lineer ±8, 17 konum sayılır; ototransformatör varsayılan olarak seri–ortak bağlantı noktasındadır; elle verilen toprağa yalıtım 363 kV üstünde de çalışır; yalnızca üçgen yazılınca varsayılan hat ucudur."] },
      ],
    },
    {
      version: "2.0.0",
      date: "2026-10",
      title: "Yeni sayfa: trafo tipine ve kademe konumuna göre seçim",
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
      title: "Sonuç kartı mühendisliğin neyi kontrol etmesi gerektiğini söyler",
      groups: [
        { kind: "fix", items: ["Ayar sargısı üzerindeki yalıtım tüm seçici kademelerini aşınca sayfa DE tipi vermek yerine mühendislikle iletişime geçmenizi ister.", "Özel kademe yüzdesi ve emniyet katsayısı ondalık kabul eder, virgülle de (0,5); yüksüz modda değiştirilen kademeler artık yüklüye taşınmaz.", "Yıldızda gerilim notu toprağa yalıtımı, üçgende gerçekten kullanılan Um'yi gösterir. Herhangi bağlantısı kaldırıldı, böylece kademe gerilimi eksik sayılmaz."] },
        { kind: "imp", items: ["Sonuç kartı mühendisliğin onaylaması gerekenleri işaretler: kademe gerilimi verilmemiş, yük değerin üstünde, standart dışı kademe kodu ya da yükseltilmiş seçici kademesi."] },
      ],
    },
    {
      version: "1.2.9",
      date: "2026-09",
      title: "Yeni: çift kesmeli vakum SDZV",
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
      title: "Asistan becerisi kendi deposunda",
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
      title: "Kontak sayısı ve emniyet katsayısı düzeltmeleri",
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
      title: "Her çalıştırma varsayılanları listeler",
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
      title: "Asistanın simgesi eklendi",
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
      title: "Asistan kılavuzu yeniden yazıldı",
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
      title: "Asistan daha fazla girdi anlar",
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
      title: "CLI ve AI asistan yayında",
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
      title: "Yağ veya vakum, tek tıkla hazır ayarlar",
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
      title: "İlk sürüm",
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
      title: "Output CLI lebih singkat dan mudah dibaca",
      groups: [
        { kind: "imp", items: ["CLI: hasil lebih singkat. Hanya mencantumkan asumsi yang bisa mengubah tipe, dan menyebut isolasi ke tanah sekali saja.", "CLI: pada run berbahasa Tionghoa, error tampil dalam bahasa Tionghoa lalu Inggris; dengan --json, error hanya berupa JSON agar bisa dibaca program."] },
        { kind: "fix", items: ["CLI: vector group huruf kecil (misalnya ynd11) terbaca benar; baris yang hanya menulis off-circuit memilih tap changer tanpa beban.", "CLI: --conn bersama kapasitas kini menghasilkan error, karena dulu diam-diam mengubah arus. Gunakan --tap line atau --winding delta."] },
      ],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      title: "Kartu hasil yang lebih rapi",
      groups: [
        { kind: "imp", items: ["Halaman: kartu hasil setinggi formulir dan berakhir sejajar dengannya, tanpa ruang kosong; di jendela pendek tipe tetap terlihat.", "Halaman: bilah isolasi ke tanah yang selalu dekat 100% dihapus; tanpa ikon di header; garis tepi dropdown lebih lembut.", "CLI: parameter --market dihapus (hanya mengenal Italia dan Turki dan hampir selalu tidak berpengaruh). Tulis isolasi ke tanah dengan --earth-um."] },
      ],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      title: "Pengaturan yang salah kini memberi error yang jelas",
      groups: [
        { kind: "fix", items: ["CLI: parameter yang saling bertentangan atau tidak berpengaruh kini menghasilkan error, bukan diam-diam memilih salah satunya. Misalnya minyak dan vakum sekaligus, atau tegangan TM pada trafo dua belitan."] },
        { kind: "imp", items: ["Halaman: kolom hasil setinggi formulir; header menampilkan versi serta tautan ke asisten dan catatan rilis; ikon baru; nilai ketahanan ke tanah ada di bawah Um."] },
      ],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      title: "CLI memberi tahu jika ada versi baru",
      groups: [
        { kind: "imp", items: ["CLI: setiap run memeriksa versi baru di npm dan menambahkan catatan satu baris di akhir; tidak pernah memperbarui dirinya sendiri.", "Halaman: kotak tempel dan Salin tautan di atas formulir dihapus; catatan autotrafo memakai kata yang lebih sederhana; halaman AI langsung memakai versi di npm."] },
      ],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      title: "Tempel pelat nama untuk mengisi formulir",
      groups: [
        { kind: "new", items: ["Halaman: tempel satu baris pelat nama atau tender dan formulir terisi sendiri; Salin tautan mengirim pilihan Anda ke rekan; kunjungan pertama memakai bahasa browser.", "CLI: --version menampilkan versi; tanpa parameter menampilkan bantuan; parameter yang salah ketik mendapat saran; output JSON untuk program lebih lengkap."] },
        { kind: "fix", items: ["Tanpa beban: tidak lagi menyebut di luar katalog saat daftar punya tipe yang cocok (800 A, delta, Um 72,5 kV kini memberi WSLIV-2000D/72.5-18x17E).", "Kode tap yang tidak ada di diagram katalog selalu disertai catatan; jumlah tahap ± harus bilangan bulat; CVT kering maksimal 9 posisi dan memberi tahu bahwa itu tipe linear bila dipakai untuk rentang ±.", "CLI: karakter lebar penuh di baris pelat nama, seperti garis miring lebar penuh, terbaca benar; dulu bisa memilih berdasarkan sisi TR."] },
        { kind: "imp", items: ["Halaman: footer berisi tautan ke catatan rilis, pemilihan dengan AI, ketentuan, dan privasi; cetak hanya mengeluarkan kartu hasil; teks dan tepi kolom lebih jelas; pembaca layar menyebut alasan tidak ada tipe."] },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      title: "Cek versi baru setiap hari",
      groups: [
        { kind: "new", items: ["CLI memeriksa versi baru paling banyak sekali sehari; jika ada, hasil diakhiri catatan dan perintah pembaruan, tanpa pernah memperbarui sendiri. Tambahkan --no-update-check untuk mematikannya."] },
      ],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      title: "Tipe langsung mengikuti input Anda",
      groups: [
        { kind: "imp", items: ["Tidak ada lagi tombol Pilih: tipe diperbarui begitu Anda mengubah nilai. Kartu hasil menaruh beban di samping rating tipe (arus lewat maksimum, tegangan tahap, kapasitas tahap, isolasi) dan menunjukkan berapa yang terpakai.", "Di ponsel, tipe tetap di bagian bawah layar dan siap disalin; bagian Tap changer mulai dalam keadaan terlipat, dengan nilainya dalam satu baris di bawah judul."] },
        { kind: "fix", items: ["CLI: jumlah posisi untuk kasar-halus atau pembalik tidak lagi diganti ±8; linear ±8 dihitung 17 posisi; autotrafo bawaannya di titik sambung seri–bersama; isolasi ke tanah yang ditulis berlaku di atas 363 kV; hanya delta bawaannya di ujung saluran."] },
      ],
    },
    {
      version: "2.0.0",
      date: "2026-10",
      title: "Halaman baru: pilih menurut jenis trafo dan posisi tap",
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
      title: "Kartu hasil menyebut yang harus dicek engineering",
      groups: [
        { kind: "fix", items: ["Bila isolasi pada belitan pengatur melebihi semua tingkat selektor, halaman meminta Anda menghubungi engineering alih-alih memberi tipe DE.", "Persentase tahap dan faktor keamanan kustom menerima desimal, juga dengan koma (0,5); tap yang diubah di mode tanpa beban tidak lagi terbawa ke mode berbeban.", "Untuk bintang, catatan tegangan menunjukkan isolasi ke tanah; untuk delta, Um yang benar-benar dipakai. Pilihan Bebas dihapus agar tegangan tahap tidak terhitung terlalu rendah."] },
        { kind: "imp", items: ["Kartu hasil menandai yang harus dikonfirmasi engineering: tanpa tegangan tahap, beban di atas rating, kode tap tidak standar, atau tingkat selektor dinaikkan."] },
      ],
    },
    {
      version: "1.2.9",
      date: "2026-09",
      title: "Baru: SDZV vakum dua titik putus",
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
      title: "Skill asisten punya repositori sendiri",
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
      title: "Perbaikan jumlah kontak dan faktor keamanan",
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
      title: "Setiap run mencantumkan nilai default",
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
      title: "Asisten kini punya ikon",
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
      title: "Panduan asisten ditulis ulang",
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
      title: "Asisten memahami lebih banyak input",
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
      title: "CLI dan asisten AI diluncurkan",
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
      title: "Minyak atau vakum, preset sekali klik",
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
      title: "Rilis pertama",
      groups: [
        {
          kind: "new",
          items: ["Rilis pertama: masukkan data trafo dan dapatkan tipe yang ada di katalog."],
        },
      ],
    },
  ],
};
