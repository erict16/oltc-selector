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
  "1.3.0": { day: "2026-10-22", image: "/changelog/v1.3.0.webp" },
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
        { kind: "imp", items: ["命令行的结果更短了，只列出可能影响型号的假定。", "命令行出错时先给中文、再给英文。"] },
        { kind: "fix", items: ["命令行能读懂小写的联结组，比如 ynd11。", "只写了 off-circuit 的参数行，现在按无载开关选型。", "给了容量又写 --conn 时，命令行现在会报错，不再悄悄算错电流。"] },
      ],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      title: "结果卡重新排版",
      groups: [
        { kind: "imp", items: ["结果卡和表单一样高，滚到底时两边对齐。", "去掉了总在 100% 附近的对地绝缘进度条。", "命令行去掉了 --market 参数，对地绝缘请直接用 --earth-um 写。"] },
      ],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      title: "参数写错会直接告诉你",
      groups: [
        { kind: "fix", items: ["命令行的参数互相矛盾时会直接报错，比如同时写了油和真空。"] },
        { kind: "imp", items: ["页头加上了版本号、命令行和更新记录的入口。", "对地工频和雷电耐压显示在 Um 下面。"] },
      ],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      title: "命令行会提醒有新版本",
      groups: [
        { kind: "imp", items: ["命令行每次运行都会检查有没有新版本，有就在最后提醒一句。", "去掉了表单上方的粘贴框和「复制链接」。", "自耦变的提示换成了更直白的说法。"] },
      ],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      title: "粘贴铭牌就能填表",
      groups: [
        { kind: "new", items: ["把铭牌或招标里的一行参数贴进表单，就能自动填好。", "「复制链接」可以把当前选型发给同事。", "命令行可以用 --version 查看版本，拼错参数时会提示正确写法。"] },
        { kind: "fix", items: ["无载开关在清单里有型号时，不再误报「超出目录」。", "样本接线图里没有的档位码，都会带上提醒。", "铭牌里的全角符号现在能正确识别。"] },
        { kind: "imp", items: ["现在打印页面时，只打印结果卡。"] },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      title: "每天检查一次新版本",
      groups: [
        { kind: "new", items: ["命令行每天最多检查一次新版本，有就提醒你更新，不会自己更新。"] },
      ],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      title: "改了参数，型号马上跟着变",
      groups: [
        { kind: "imp", items: ["改了参数，型号马上更新，不用再点「选型」。", "结果卡把工况和型号的额定值并排列出，并显示用了几成。", "手机上，当前型号固定在屏幕底部，可以直接复制。"] },
        { kind: "fix", items: ["命令行里粗细调和正反调的工作位置数，不再被 ±8 覆盖。", "自耦变按电流选型时，开关默认在串联和公共绕组的连接点。"] },
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
        { kind: "fix", items: ["绝缘超出所有选择器等级时，不再给出 DE 型号，而是提示联系工程。", "调节比例和安全系数可以输入小数。", "去掉了「不限」连接方式，免得级电压被少算。"] },
        { kind: "imp", items: ["结果卡会标出要工程确认的情况，比如没给级电压或超出额定电流。"] },
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
        { kind: "imp", items: ["The CLI gives shorter results and lists only the assumptions that could change the type.", "On a Chinese run, CLI errors show Chinese first, then English."] },
        { kind: "fix", items: ["The CLI reads a lower-case vector group, such as ynd11.", "A line that says only off-circuit now picks an off-circuit switch.", "The CLI now stops with an error when --conn is given with a capacity, instead of quietly getting the current wrong."] },
      ],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      title: "A cleaner result card",
      groups: [
        { kind: "imp", items: ["The result card is as tall as the form, so both end level.", "The earth-insulation bar that always read near 100% is gone.", "The CLI no longer has the --market flag. Give the insulation to earth with --earth-um."] },
      ],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      title: "Wrong settings now get a clear error",
      groups: [
        { kind: "fix", items: ["The CLI stops with an error when settings contradict each other, such as oil and vacuum together."] },
        { kind: "imp", items: ["The header now shows the version and links to the CLI and the release notes.", "The earth withstand levels are shown under Um."] },
      ],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      title: "The CLI tells you about new versions",
      groups: [
        { kind: "imp", items: ["Each CLI run checks for a new version and adds a one-line note when there is one.", "The paste box and Copy link above the form are gone.", "The autotransformer notes use plainer words."] },
      ],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      title: "Paste a nameplate to fill the form",
      groups: [
        { kind: "new", items: ["Paste a nameplate or tender line into the form and it fills itself in.", "Copy link sends your current selection to a colleague.", "The CLI has --version, and it suggests the right flag when you mistype one."] },
        { kind: "fix", items: ["An off-circuit duty no longer reads out of catalogue when the list has a type for it.", "A tap code that is not in the brochure's diagrams always comes with a note.", "Full-width characters in a nameplate are now read correctly."] },
        { kind: "imp", items: ["Printing gives only the result card."] },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      title: "A daily check for new versions",
      groups: [
        { kind: "new", items: ["The CLI checks for a new version at most once a day and tells you to update. It never updates itself."] },
      ],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      title: "The type follows your inputs at once",
      groups: [
        { kind: "imp", items: ["The type updates as soon as you change a value. There is no Select button any more.", "The result card shows the duty next to the type's rating, and how much of it is used.", "On phones the type stays at the bottom of the screen, ready to copy."] },
        { kind: "fix", items: ["In the CLI, a position count for coarse-fine or reversing is no longer replaced by ±8.", "An autotransformer sized from current now defaults to the series–common junction."] },
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
        { kind: "fix", items: ["When the insulation is above every selector grade, the page asks you to contact engineering instead of giving a DE type.", "Step percent and safety factor accept decimals.", "The Any connection is gone, so step voltage is not counted too low."] },
        { kind: "imp", items: ["The result card marks what engineering must confirm, such as a missing step voltage or a duty above the rating."] },
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
        { kind: "imp", items: ["CLI cho kết quả ngắn hơn, chỉ liệt kê các giả định có thể làm đổi kiểu.", "Khi chạy tiếng Trung, lỗi của CLI hiện tiếng Trung trước rồi tiếng Anh."] },
        { kind: "fix", items: ["CLI đọc được tổ đấu dây viết thường, ví dụ ynd11.", "Dòng chỉ ghi off-circuit giờ chọn bộ chuyển nấc không tải.", "CLI giờ báo lỗi khi ghi --conn cùng công suất, thay vì lặng lẽ tính sai dòng điện."] },
      ],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      title: "Thẻ kết quả gọn hơn",
      groups: [
        { kind: "imp", items: ["Thẻ kết quả cao bằng biểu mẫu, nên hai bên kết thúc ngang nhau.", "Đã bỏ thanh cách điện với đất luôn gần 100%.", "CLI bỏ tham số --market. Hãy ghi cách điện với đất bằng --earth-um."] },
      ],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      title: "Cài đặt sai sẽ báo lỗi rõ ràng",
      groups: [
        { kind: "fix", items: ["CLI báo lỗi khi các tham số mâu thuẫn nhau, ví dụ ghi cả dầu và chân không."] },
        { kind: "imp", items: ["Đầu trang hiện số phiên bản và liên kết tới CLI và nhật ký cập nhật.", "Mức chịu điện áp với đất hiện dưới Um."] },
      ],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      title: "CLI báo khi có phiên bản mới",
      groups: [
        { kind: "imp", items: ["Mỗi lần chạy, CLI kiểm tra phiên bản mới và nhắc một dòng nếu có.", "Đã bỏ ô dán và nút Sao chép liên kết phía trên biểu mẫu.", "Ghi chú về máy biến áp tự ngẫu dùng lời dễ hiểu hơn."] },
      ],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      title: "Dán nhãn máy để điền biểu mẫu",
      groups: [
        { kind: "new", items: ["Dán một dòng nhãn máy hoặc hồ sơ thầu vào biểu mẫu, biểu mẫu sẽ tự điền.", "Sao chép liên kết gửi lựa chọn hiện tại cho đồng nghiệp.", "CLI có --version và gợi ý đúng tham số khi bạn gõ sai."] },
        { kind: "fix", items: ["Chế độ không tải không còn báo ngoài catalogue khi danh sách có kiểu phù hợp.", "Mã nấc không có trong sơ đồ của catalogue luôn kèm ghi chú.", "Ký tự toàn độ trong nhãn máy giờ được đọc đúng."] },
        { kind: "imp", items: ["Khi in chỉ in thẻ kết quả."] },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      title: "Kiểm tra phiên bản mới mỗi ngày",
      groups: [
        { kind: "new", items: ["CLI kiểm tra phiên bản mới tối đa một lần mỗi ngày và nhắc bạn cập nhật. Nó không bao giờ tự cập nhật."] },
      ],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      title: "Kiểu thay đổi ngay khi bạn nhập",
      groups: [
        { kind: "imp", items: ["Kiểu cập nhật ngay khi bạn đổi một giá trị. Không còn nút Chọn.", "Thẻ kết quả đặt tải bên cạnh định mức của kiểu và cho thấy đã dùng bao nhiêu.", "Trên điện thoại, kiểu luôn ở cuối màn hình và sao chép được ngay."] },
        { kind: "fix", items: ["Trong CLI, số vị trí cho thô-tinh hoặc đảo chiều không còn bị ±8 thay thế.", "Máy tự ngẫu chọn theo dòng điện giờ mặc định ở điểm nối cuộn nối tiếp–chung."] },
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
        { kind: "fix", items: ["Khi cách điện cao hơn mọi cấp bộ chọn, trang yêu cầu liên hệ kỹ thuật thay vì đưa ra kiểu DE.", "Tỷ lệ cấp và hệ số an toàn nhận số thập phân.", "Đã bỏ lựa chọn Bất kỳ để điện áp cấp không bị tính thiếu."] },
        { kind: "imp", items: ["Thẻ kết quả đánh dấu những gì kỹ thuật phải xác nhận, ví dụ thiếu điện áp cấp hoặc tải vượt định mức."] },
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
        { kind: "imp", items: ["La CLI da resultados más cortos y solo lista las suposiciones que pueden cambiar el tipo.", "En una ejecución en chino, los errores de la CLI salen primero en chino y luego en inglés."] },
        { kind: "fix", items: ["La CLI lee un grupo de conexión en minúsculas, como ynd11.", "Una línea que solo dice off-circuit ahora elige un cambiador sin carga.", "La CLI ahora da error si se indica --conn junto a una potencia, en vez de calcular mal la corriente sin avisar."] },
      ],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      title: "Una tarjeta de resultado más limpia",
      groups: [
        { kind: "imp", items: ["La tarjeta de resultado tiene la misma altura que el formulario, así que ambos terminan al mismo nivel.", "Desaparece la barra de aislamiento a tierra, que siempre marcaba cerca del 100 %.", "La CLI ya no tiene la opción --market. Indique el aislamiento a tierra con --earth-um."] },
      ],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      title: "Los ajustes erróneos dan un error claro",
      groups: [
        { kind: "fix", items: ["La CLI da error cuando las opciones se contradicen, por ejemplo aceite y vacío a la vez."] },
        { kind: "imp", items: ["La cabecera muestra la versión y enlaza a la CLI y a las notas de versión.", "Las tensiones soportadas a tierra se muestran bajo Um."] },
      ],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      title: "La CLI avisa de nuevas versiones",
      groups: [
        { kind: "imp", items: ["Cada ejecución de la CLI busca una versión nueva y añade un aviso de una línea si la hay.", "Se quitan la caja para pegar y Copiar enlace sobre el formulario.", "Las notas de autotransformador usan palabras más sencillas."] },
      ],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      title: "Pegue una placa para rellenar el formulario",
      groups: [
        { kind: "new", items: ["Pegue una línea de placa o de licitación en el formulario y se rellena solo.", "Copiar enlace envía su selección actual a un colega.", "La CLI tiene --version y sugiere la opción correcta si escribe mal una."] },
        { kind: "fix", items: ["Un caso sin carga ya no sale fuera de catálogo cuando la lista tiene un tipo para él.", "Un código de tomas que no está en los esquemas del catálogo siempre lleva una nota.", "Los caracteres de ancho completo de una placa ahora se leen bien."] },
        { kind: "imp", items: ["Al imprimir solo sale la tarjeta de resultado."] },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      title: "Comprobación diaria de versiones nuevas",
      groups: [
        { kind: "new", items: ["La CLI busca una versión nueva como mucho una vez al día y le avisa para actualizar. Nunca se actualiza sola."] },
      ],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      title: "El tipo sigue sus datos al instante",
      groups: [
        { kind: "imp", items: ["El tipo se actualiza en cuanto cambia un valor. Ya no hay botón Seleccionar.", "La tarjeta de resultado pone la carga junto a la capacidad del tipo y muestra cuánto se usa.", "En el móvil, el tipo queda al pie de la pantalla, listo para copiar."] },
        { kind: "fix", items: ["En la CLI, el número de posiciones para grueso-fino o inversor ya no se sustituye por ±8.", "Un autotransformador dimensionado por corriente va ahora por defecto en la unión serie–común."] },
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
        { kind: "fix", items: ["Cuando el aislamiento supera todos los grados del selector, la página pide contactar con ingeniería en vez de dar un tipo DE.", "El porcentaje de escalón y el factor de seguridad aceptan decimales.", "Se quita la conexión Cualquiera para no contar de menos la tensión de escalón."] },
        { kind: "imp", items: ["La tarjeta marca lo que ingeniería debe confirmar, como una tensión de escalón que falta o una carga por encima de la capacidad."] },
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
        { kind: "imp", items: ["CLI daha kısa sonuç verir ve yalnızca tipi değiştirebilecek varsayımları listeler.", "Çince çalıştırmada CLI hataları önce Çince, sonra İngilizce gelir."] },
        { kind: "fix", items: ["CLI küçük harfli bağlantı grubunu okur, örneğin ynd11.", "Yalnızca off-circuit yazan satır artık yüksüz bir kademe değiştirici seçer.", "CLI artık güçle birlikte --conn verilince hata verir, akımı sessizce yanlış hesaplamaz."] },
      ],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      title: "Daha sade bir sonuç kartı",
      groups: [
        { kind: "imp", items: ["Sonuç kartı formla aynı yükseklikte, böylece ikisi aynı hizada biter.", "Hep %100 civarında duran toprağa yalıtım çubuğu kaldırıldı.", "CLI'da artık --market parametresi yok. Toprağa yalıtımı --earth-um ile verin."] },
      ],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      title: "Yanlış ayarlar artık açık bir hata verir",
      groups: [
        { kind: "fix", items: ["Parametreler birbiriyle çelişince CLI hata verir, örneğin yağ ve vakum birlikte."] },
        { kind: "imp", items: ["Başlık artık sürümü gösterir ve CLI ile sürüm notlarına bağlantı verir.", "Toprağa dayanım değerleri Um'nin altında gösterilir."] },
      ],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      title: "CLI yeni sürümleri bildirir",
      groups: [
        { kind: "imp", items: ["CLI her çalıştırmada yeni sürüm olup olmadığına bakar ve varsa tek satırlık bir not ekler.", "Formun üstündeki yapıştırma kutusu ve Bağlantıyı kopyala kaldırıldı.", "Ototransformatör notları daha sade bir dille yazıldı."] },
      ],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      title: "Formu doldurmak için etiket yapıştırın",
      groups: [
        { kind: "new", items: ["Forma bir etiket ya da ihale satırı yapıştırın, form kendini doldurur.", "Bağlantıyı kopyala, mevcut seçiminizi bir meslektaşa gönderir.", "CLI'da --version var ve yanlış yazılan parametre için doğrusunu önerir."] },
        { kind: "fix", items: ["Listede uygun tip varken yüksüz bir durum artık katalog dışı görünmez.", "Katalog şemalarında olmayan bir kademe kodu her zaman bir notla gelir.", "Etiketteki tam genişlikli karakterler artık doğru okunur."] },
        { kind: "imp", items: ["Yazdırınca yalnızca sonuç kartı çıkar."] },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      title: "Yeni sürüm için günlük kontrol",
      groups: [
        { kind: "new", items: ["CLI yeni sürümü günde en fazla bir kez kontrol eder ve güncellemenizi hatırlatır. Kendini asla güncellemez."] },
      ],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      title: "Tip, girdilerinizi anında izler",
      groups: [
        { kind: "imp", items: ["Bir değeri değiştirdiğiniz anda tip güncellenir. Seç düğmesi artık yok.", "Sonuç kartı yükü tipin değerlerinin yanına koyar ve ne kadarının kullanıldığını gösterir.", "Telefonda tip ekranın altında durur ve hemen kopyalanabilir."] },
        { kind: "fix", items: ["CLI'da kaba-ince veya ters çevirmeli için konum sayısı artık ±8 ile değiştirilmez.", "Akıma göre seçilen ototransformatör artık varsayılan olarak seri–ortak bağlantı noktasındadır."] },
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
        { kind: "fix", items: ["Yalıtım tüm seçici kademelerini aşınca sayfa DE tipi vermek yerine mühendislikle iletişime geçmenizi ister.", "Kademe yüzdesi ve emniyet katsayısı ondalık kabul eder.", "Herhangi bağlantısı kaldırıldı, böylece kademe gerilimi eksik sayılmaz."] },
        { kind: "imp", items: ["Sonuç kartı mühendisliğin onaylaması gerekenleri işaretler, örneğin eksik kademe gerilimi ya da değerin üstünde yük."] },
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
        { kind: "imp", items: ["CLI memberi hasil lebih singkat dan hanya mencantumkan asumsi yang bisa mengubah tipe.", "Pada run berbahasa Tionghoa, error CLI tampil dalam bahasa Tionghoa lalu Inggris."] },
        { kind: "fix", items: ["CLI membaca vector group huruf kecil, misalnya ynd11.", "Baris yang hanya menulis off-circuit kini memilih tap changer tanpa beban.", "CLI kini memberi error bila --conn ditulis bersama kapasitas, alih-alih diam-diam salah menghitung arus."] },
      ],
    },
    {
      version: "2.4.0",
      date: "2026-11",
      title: "Kartu hasil yang lebih rapi",
      groups: [
        { kind: "imp", items: ["Kartu hasil setinggi formulir, jadi keduanya berakhir sejajar.", "Bilah isolasi ke tanah yang selalu dekat 100% dihapus.", "CLI tidak lagi punya parameter --market. Tulis isolasi ke tanah dengan --earth-um."] },
      ],
    },
    {
      version: "2.3.2",
      date: "2026-11",
      title: "Pengaturan yang salah kini memberi error yang jelas",
      groups: [
        { kind: "fix", items: ["CLI memberi error bila parameter saling bertentangan, misalnya minyak dan vakum sekaligus."] },
        { kind: "imp", items: ["Header kini menampilkan versi serta tautan ke CLI dan catatan rilis.", "Nilai ketahanan ke tanah ditampilkan di bawah Um."] },
      ],
    },
    {
      version: "2.3.1",
      date: "2026-11",
      title: "CLI memberi tahu jika ada versi baru",
      groups: [
        { kind: "imp", items: ["Setiap run, CLI memeriksa versi baru dan menambahkan catatan satu baris bila ada.", "Kotak tempel dan Salin tautan di atas formulir dihapus.", "Catatan autotrafo memakai kata yang lebih sederhana."] },
      ],
    },
    {
      version: "2.3.0",
      date: "2026-11",
      title: "Tempel pelat nama untuk mengisi formulir",
      groups: [
        { kind: "new", items: ["Tempel satu baris pelat nama atau tender ke formulir, dan formulir terisi sendiri.", "Salin tautan mengirim pilihan Anda saat ini ke rekan.", "CLI punya --version dan menyarankan parameter yang benar bila Anda salah ketik."] },
        { kind: "fix", items: ["Kasus tanpa beban tidak lagi tampil di luar katalog bila daftar punya tipe yang cocok.", "Kode tap yang tidak ada di diagram katalog selalu disertai catatan.", "Karakter lebar penuh di pelat nama kini terbaca benar."] },
        { kind: "imp", items: ["Saat dicetak, hanya kartu hasil yang keluar."] },
      ],
    },
    {
      version: "2.2.0",
      date: "2026-10",
      title: "Cek versi baru setiap hari",
      groups: [
        { kind: "new", items: ["CLI memeriksa versi baru paling banyak sekali sehari dan mengingatkan Anda untuk memperbarui. CLI tidak pernah memperbarui dirinya sendiri."] },
      ],
    },
    {
      version: "2.1.0",
      date: "2026-10",
      title: "Tipe langsung mengikuti input Anda",
      groups: [
        { kind: "imp", items: ["Tipe diperbarui begitu Anda mengubah nilai. Tombol Pilih sudah tidak ada.", "Kartu hasil menaruh beban di samping rating tipe dan menunjukkan berapa yang terpakai.", "Di ponsel, tipe tetap di bagian bawah layar dan siap disalin."] },
        { kind: "fix", items: ["Di CLI, jumlah posisi untuk kasar-halus atau pembalik tidak lagi diganti ±8.", "Autotrafo yang dipilih dari arus kini bawaannya di titik sambung seri–bersama."] },
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
        { kind: "fix", items: ["Bila isolasi melebihi semua tingkat selektor, halaman meminta Anda menghubungi engineering alih-alih memberi tipe DE.", "Persentase tahap dan faktor keamanan menerima desimal.", "Pilihan Bebas dihapus agar tegangan tahap tidak terhitung terlalu rendah."] },
        { kind: "imp", items: ["Kartu hasil menandai yang harus dikonfirmasi engineering, misalnya tegangan tahap yang belum diisi atau beban di atas rating."] },
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
