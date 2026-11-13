/**
 * Chinese for the CLI's own errors. The parser writes English; the default
 * output language is Chinese, so an error used to arrive in the wrong
 * language (2026-11-14 CLI review). One row per message; a message with no
 * row prints in English only, and cliErrorsZh.test.ts fails for it.
 */
const WHAT_ZH: Record<string, string> = {
  "MVA and kV": "容量和电压",
  "the MVA rating": "容量",
  "the kV ratio": "电压比",
  "the kV ratio and range": "电压比和调压范围",
};

const ROWS: Array<[RegExp, string | ((m: RegExpMatchArray) => string)]> = [
  [/^(\S+) must be greater than 0 \(got (.+)\)$/, "$1 必须大于 0（收到 $2）"],
  [/^(\S+) must not be negative \(got (.+)\)$/, "$1 不能为负（收到 $2）"],
  [/^Ambiguous number for (\S+): (.+)\. Write 1200 or 1\.2 \(no thousands separator\)\.$/, "$1 的数字有歧义：$2。请写 1200 或 1.2，不要用千分位。"],
  [/^Invalid number for (\S+): (.*)$/, "$1 的数字无效：$2"],
  [
    /^Unknown flag: (\S+?)\.(?: Did you mean (\S+)\?)?.* Run oltc --help for the list\.$/,
    (m) => `未知参数：${m[1]}。${m[2] ? `是不是想写 ${m[2]}？` : ""}运行 oltc --help 查看全部参数。`,
  ],
  [/^(\S+) takes no value$/, "$1 不带值"],
  [/^Missing value for (\S+)$/, "$1 缺少值"],
  [/^(\S+) is given twice$/, "$1 给了两次"],
  [/^--lang must be en or zh$/, "--lang 只能是 en 或 zh"],
  [/^--octc conflicts with --duty oltc\. Drop one\.$/, "--octc 和 --duty oltc 矛盾，请去掉一个。"],
  [/^Give --oil or --vacuum, not both$/, "--oil 和 --vacuum 只能给一个"],
  [/^Give --iu or --imax, not both$/, "--iu 和 --imax 只能给一个"],
  [/^--market is removed\./, "--market 已删除。开关对地绝缘请用 --earth-um，跨调压绕组的耐压请用 --across-li / --across-ac。"],
  [/^--conn must be Y or D$/, "--conn 只能是 Y 或 D"],
  [/^--kind must be two or auto$/, "--kind 只能是 two 或 auto"],
  [/^--tap must be neutral\|line\|junction\|mv-line$/, "--tap 只能是 neutral、line、junction 或 mv-line"],
  [/^--winding must be star or delta$/, "--winding 只能是 star 或 delta"],
  [/^--reg must be W, G, or 0$/, "--reg 只能是 W、G 或 0"],
  [/^--pm must be a whole number of at least 1$/, "--pm 必须是不小于 1 的整数"],
  [/^(\S+) must be a whole number of at least 2$/, "$1 必须是不小于 2 的整数"],
  [/^--structure must be auto\|combined\|compound\|cage\|drum$/, "--structure 只能是 auto、combined、compound、cage 或 drum"],
  [/^--series must be II\|IV\|V\|VI\|VII\|VIII$/, "--series 只能是 II、IV、V、VI、VII 或 VIII"],
  [/^--mount must be in-tank\|on-tank\|dry\|reactor$/, "--mount 只能是 in-tank、on-tank、dry 或 reactor"],
  [/^--contact must look like 6x5 or 12x11D$/, "--contact 的写法如 6x5 或 12x11D"],
  [/^--phases must be I, II, or III$/, "--phases 只能是 I、II 或 III"],
  [/^--minus must be a whole number of steps$/, "--minus 必须是整数级数"],
  [/^--mid must be 1 or 3$/, "--mid 只能是 1 或 3"],
  [/^--duty must be oltc or octc$/, "--duty 只能是 oltc 或 octc"],
  [/^--range must look like \+4\/-12 or \+4\/-12x1\.25%$/, "--range 的写法如 +4/-12 或 +4/-12x1.25%"],
  [/^--mid (\S+) does not fit (\S+): the Fig\. 3-3 row has mid (\S+)\.$/, "--mid $1 和 $2 不匹配：样本图 3-3 对应的中间位是 $3。"],
  [
    /^--line reads an autotransformer without both HV and MV kV: (.*)\. Give --hv and --mv\.$/s,
    "--line 读出是自耦变，但缺高压或中压电压：$1。请给 --hv 和 --mv。",
  ],
  [
    /^Could not read (MVA and kV|the MVA rating|the kV ratio|the kV ratio and range) from --line: (.*)\. Write it like "25MVA 110±8x1\.25%\/10\.5kV YNd11", or give --mva\/--kv \(or --hv\/--mv\) instead\.$/s,
    (m) =>
      `--line 读不出${WHAT_ZH[m[1]!]}：${m[2]}。请写成 "25MVA 110±8x1.25%/10.5kV YNd11" 这样，或改用 --mva/--kv（自耦变用 --hv/--mv）。`,
  ],
  [/^--kind auto with --mva needs --hv and --mv$/, "--kind auto 配 --mva 时需要 --hv 和 --mv"],
  [/^--mva requires --kv \(tap-side rated voltage\)$/, "--mva 需要 --kv（调压侧额定电压）"],
  [/^--series is off-circuit wiring: add --octc$/, "--series 是无载接线方式：请加 --octc"],
  [/^--contact is an off-circuit contact: add --octc$/, "--contact 是无载触头规格：请加 --octc"],
  [/^--structure (\S+) is off-circuit: add --octc \(on-load takes combined or compound\)$/, "--structure $1 是无载结构：请加 --octc（有载用 combined 或 compound）"],
  [/^--structure (\S+) is on-load only: with --octc use cage or drum$/, "--structure $1 只用于有载：--octc 时用 cage 或 drum"],
  [/^--vacuum does not apply with --octc /, "--vacuum 不适用于 --octc（无载开关不切断电流）"],
  [/^--oil does not apply with --mount dry$/, "--oil 不适用于 --mount dry"],
  [/^--vacuum does not apply with --mount reactor /, "--vacuum 不适用于 --mount reactor（电抗器开关是油浸的）"],
  [/^--conn D conflicts with --tap neutral: /, "--conn D 和 --tap neutral 矛盾：中性点是星形（Y）。请去掉一个。"],
  [/^--conn Y conflicts with --tap line: /, "--conn Y 和 --tap line 矛盾：线端是角形（D）。请去掉一个。"],
  [/^--conn does not apply with --mva: /, "--conn 不用于 --mva：Y 或 D 由开关位置决定。线端用 --tap line，角形绕组用 --winding delta。"],
  [/^--hv and --mv are autotransformer voltages: /, "--hv 和 --mv 是自耦变的电压：请加 --kind auto（双绕组用 --kv）"],
  [/^--minus sets the lowest-tap current on the --mva path; /, "--minus 只在 --mva 路径上用来算最低档电流；--iu 路径请直接给电流"],
  [/^Give --um or --earth-um, not both: (\S+) and (\S+) disagree\.$/, "--um 和 --earth-um 只能给一个：$1 和 $2 不一致。"],
  [/^--step-pct is a percent: 1\.25 means 1\.25 %\. (\S+) is too small\.$/, "--step-pct 是百分数：1.25 表示 1.25%。$1 太小。"],
  [/^--pm (\S+) and --pos (\S+) disagree\. Give one of them\.$/, "--pm $1 和 --pos $2 不一致，请只给一个。"],
  [/^Give --iu or --mva\/--kv, not both /, "--iu 和 --mva/--kv 只能给一种（--mva 旁边的订货规范 Imax 用 --os-imax）"],
  [/^--os-imax needs --mva\/--kv; /, "--os-imax 需要 --mva/--kv；--iu 路径上电流直接用 --iu"],
  [/^--k applies only on the --mva path /, "--k 只用于 --mva 路径（--iu 不乘安全系数）"],
  [/^--k must be ≥ 1$/, "--k 必须不小于 1"],
  [/^--step-pct needs --mva\/--kv; give --ust on the --iu path$/, "--step-pct 需要 --mva/--kv；--iu 路径请给 --ust"],
  [/^Give --um or --earth-um, not both, when no winding voltage \(--kv\) is given$/, "没给绕组电压（--kv）时，--um 和 --earth-um 只能给一个"],
  [/^Need --iu \(Imax\) or --mva plus --kv$/, "需要 --iu（最大电流），或 --mva 加 --kv"],
  [/^Need --um, or --mva\/--kv so Um can be derived$/, "需要 --um，或给 --mva/--kv 以推出 Um"],
  [/^Engine emitted a non-catalogue type: (.*)$/, "引擎给出了样本册里没有的型号：$1"],
  [/^Bad transformer data$/, "变压器参数有误"],
  [/^No type found\.$/, "没有找到型号。"],
];

/** The Chinese for one English CLI error line, or null when there is no row. */
export function cliErrorZh(en: string): string | null {
  for (const [re, to] of ROWS) {
    const m = en.match(re);
    if (!m) continue;
    return typeof to === "function" ? to(m) : to.replace(/\$(\d)/g, (_, d: string) => m[Number(d)] ?? "");
  }
  return null;
}

const HAS_HAN = /[一-鿿]/;

/**
 * The lines to print for an error. English: as thrown. Chinese: the Chinese
 * first, then the English, as the engine's own "no type" errors already do.
 * A line that is already Chinese (engine and duty errors) is kept as it is.
 */
export function cliErrorLines(message: string, lang: "en" | "zh"): string[] {
  const lines = message.split("\n").filter((l) => l !== "");
  if (lang === "en") return lines;
  if (lines.some((l) => HAS_HAN.test(l))) return lines;
  const whole = cliErrorZh(message);
  if (whole) return [whole, ...lines];
  return lines.flatMap((l) => {
    const zh = cliErrorZh(l);
    return zh ? [zh, l] : [l];
  });
}
