---
name: huaming-oltc-selector
display_name: 华明分接开关选型
display_name_en: Huaming Tap-Changer Selector
description: >
  华明分接开关选型：贴变压器铭牌或给参数（容量、电压、电流、调压方式、分接范围），
  用 oltc 命令算出样本册里真实存在的有载（OLTC）/ 无载（OCTC）开关型号，并说明选型理由。
  触发：选型、分接开关、有载开关、无载开关、华明、Huaming、OLTC、OCTC、tap changer、
  型号、CV2、CM2、SHZV、HWV、WSL、WSG、CMD、星点、线端、正反调、粗细调、线性调、
  Imax、Um、一拖二（无载带有载）、检查型号是否存在、解读型号含义。
  不触发：报价、价格、OS 商务条款、运输单据。
description_zh: 贴铭牌或给参数，用 oltc 选华明分接开关型号；只出样本册里存在的型号，并说明理由。
description_en: Run oltc to pick a Huaming tap-changer type, then check the brochure and explain why.
allowed-tools: Bash, Read
version: 1.2.1
author: Eric Tan
license: MIT
category: engineering
---

# 华明分接开关选型 (oltc CLI)

把变压器工况变成**华明（Huaming）商用型号字符串**，用已发布的 CLI `oltc`（`npx -y oltc-selector@latest`；高频使用可 `npm i -g oltc-selector` 装上 PATH）。与 https://oltc-selector.vercel.app/ 同一套选型引擎。

**仅限华明样本册——其他厂家不在范围内。无价格。无报价。不编型号。**

## 必须遵守

1. 如果 `oltc` 在 PATH 上，**直接跑**。不要凭记忆猜型号。
2. 如果没有 `oltc`，自己用 npx 跑：`npx -y oltc-selector@latest <参数>`（需要 Node 20+）。不要让用户先装任何东西。高频使用可以 `npm i -g oltc-selector` 把 `oltc` 装上 PATH。如果 `npm`/`npx` 都没有，停下来让用户装 Node 20+。禁止编造 CV2-500 或组合式 III-D。
3. CLI 输出型号后，**对照下面的样本册规则检查**。通不过就明说，不要包装成可下单。
4. 检查通过后，用 3–6 句短句解释**为什么这个型号正确**（系列、Ium、Um、Y/D 或 3×、分接代码、结构）。不要写长文。
5. 输出型号**不带** `+CMA7`，除非用户要电动机构。三台单相 → **1× CMA7**，不是三台。
6. **一拖二 / 无载带有载**（一台变压器同时装有载和无载分接开关）需要**两次**选型：有载部分跑一次普通命令，无载部分跑一次 `--octc`。两个型号字符串都要过样本册检查，一起呈现。不要把两种工况合并成一次运行。

## 怎么跑

```
oltc --iu 350 --um 40.5 --conn D --reg W --pm 8
oltc --mva 25 --kv 110 --conn Y --reg W --pm 8
oltc --octc --iu 800 --um 72.5 --conn D --series II --contact 6x5
oltc --iu 600 --um 72.5 --conn Y --reg W --pm 8 --structure combined
```

| 参数 | 含义 |
|------|------|
| `--iu` | Imax（最低分接处的通过电流）。**不乘**安全系数。 |
| `--mva` `--kv` | 容量路径。安全系数 `--k`（默认 1.2）只在这里生效。 |
| `--um` | 设备 Um（kV），样本册档位。 |
| `--conn Y\|D` | 开关应用点：星点 vs 线端。**不是**变压器 Dyn11。 |
| `--reg W\|G\|0` | 正反调 / 粗细调 / 线性调。 |
| `--pm` | ± 级数（W/G）。线性调用 `--positions`。 |
| `--octc` | 无载（WSL/WSG）。 |
| `--structure` | `auto` / `combined` / `compound` / `cage` / `drum` |
| `--series` | 无载接线方式 II IV V VI VII VIII |
| `--ust` | 级电压（V）。规格直接给伏数时用；容量路径会自动算。 |
| `--mount` | 安装方式：`in-tank` 箱内（默认）/ `on-tank` 箱顶 / `dry` 干式 |
| `--oil` / `--vacuum` | 灭弧介质。有载默认真空；无载自动按油处理。 |
| `--phases` | `I` / `II` / `III`，默认 III。单相选型用 `--phases I`。 |

`--json` 同样没有价格。

> npx 报 "could not determine executable to run"？说明当前目录自己的 `package.json` 就叫 `oltc-selector`，遮蔽了 registry 上的包。换个目录跑，或用全局安装。

## 按需补充的输入

默认值就是网页首屏：有载、箱内、真空、结构自动、±8 中间 3 档正反调。规格明确写到下面这些时才补：

- **级电压 `--ust`**：规格直接给伏数（如「级电压 2000 V」「Ust 1375 V」）就传 `--ust 2000`，不要倒推百分比。`--step-pct` 和 `--ust` 给一个就够；两个都给时 `--ust` 优先。级电压决定相邻分接间绝缘档，拿不准就只给 `--step-pct`，让 CLI 算。
- **安装与介质 `--mount` / `--oil`**：干式变压器必须 `--mount dry`；明确要求油中灭弧（老式 CV 油浸方案）用 `--oil`。铭牌写「真空」不用传——默认就是真空。无载（`--octc`）不用管介质，CLI 自动按油处理。

## 读取变压器数据

粘贴的铭牌或规格行就够了。这样映射：

- `25 MVA 110±8×1.25%/10.5 kV` → `--mva 25 --kv 110 --pm 8 --step-pct 1.25 --reg W`。`±N×x%` 是分接范围：N 是 `--pm`，x 是 `--step-pct`。围绕中间位置的 `±` 范围是正反调（`--reg W`）；0..N 的平直范围是线性调（`--reg 0 --positions`）。
- `--kv` 是**分接侧**额定电压，即开关所在的绕组。`110±8×1.25%/10.5` 里分接在 110 上；除非分接在低压侧，否则忽略 10.5。
- kVA → MVA：除以 1000（31500 kVA = 31.5 MVA）。
- 给的是额定电流而不是容量：Imax ≈ Irated ÷ (1 − N×x%)。优先用 `--mva --kv`，让 CLI 算。
- **Dyn11 / YNd1 是变压器联结组标号，不是 `--conn`。** `--conn Y` 指开关在星点；`--conn D` 指线端角接工况。规格只给联结组、没说分接在哪？问一句短的，别猜。
- Um：用 `--mva --kv` 时 CLI 自动推（35 → 40.5，66 → 72.5，110 Y → 72.5，110 D → 126，220 → 252）。只有用户直接给出设备电压等级时才传 `--um`。
- `--iu` 是最低分接处的变压器最大通过电流。永远不要给它加安全系数。`--k` 只存在于容量路径。

电流、电压、分接范围缺一个？只问缺的那一项。不要凭记忆补。

> 规格行：`SFZ11-25000/110, 110±8×1.25%/10.5 kV, Dyn11, 分接在高压中性点, 真空`
> → `oltc --mva 25 --kv 110 --conn Y --reg W --pm 8 --step-pct 1.25`

## 一拖二（一台变压器上 OLTC + OCTC）

规格同时含有载范围和无载范围（无载带有载）= **两台**开关。拆开跑两次：

- 有载部分（有载 ±N×x%）→ 普通运行，用该部分的 `--pm` / `--step-pct`。
- 无载部分（无载档位数 / 接线方式）→ `--octc` 运行，用 `--positions` 或 `--contact`，规格写明接线方式时加 `--series`。
- 两台开关通常在同一绕组上：两次运行用相同的 `--iu` 和 `--um`，除非规格分开给。
- 规格只给了一个总范围、没说怎么在有载和无载之间分？**问。**不要自己编拆分方案。

> 规格行：`110 kV, 有载 ±8×1.25% + 无载 5 档 (一拖二), 350 A, 分接在高压中性点`
> → `oltc --iu 350 --um 72.5 --conn Y --reg W --pm 8 --step-pct 1.25`
> → `oltc --octc --iu 350 --um 72.5 --conn Y --positions 5`
> → 例如 `CV2III-350Y/72.5-10193W`（有载）+ `WSLIV-600Y/72.5-6x5A`（无载）。两个都对照样本册检查，然后各用一两句解释。

## 样本册检查（CLI 之后）

见 `references/brochure-check.md`。命中任何一条就判不通过：

- **CV2-500** —— 2025 年 CV2 III 只有 350 和 600。500 A 油中复合式是 SV。
- **组合式 III-D** —— 没有 `CM2III-…D`、`CMIII-…D`、`SHZVIII-…D`。对应的 I 型存在时用 `3x…I-` 覆盖。**CV2 / CV / SV / HWV 的 III-D 存在。**
- **复合式等级字母** —— 没有 `CV2III-350Y/40.5B`。组合式箱内可以带 B/C/D/DE。
- **WSL 缺行** —— 笼式型号必须作为 2025 表的键存在，不是笛卡尔积拼出来的。
- **星点 Um** —— 绕组 ≥145 kV 的 Y 工况，开关通常取 **72.5**，不是 145。
- **10193W 工作位置数** —— 19 是机械位置；变压器电压级数 = **17**。

## 深入 OLTC（解释时用）

- 样本册 **Iu** = 开关额定通过电流。**Ium** = 其中的最大值，即型号里的数字（`CV2III-600`）。表单上的 **Imax** = 最低分接处的变压器电流。CLI 输入是 Imax；型号数字是 Ium ≥ 该工况（约 97% 裕度升一档）。
- **组合式** = 切换开关 + 分接选择器（CM、CM2、SHZV、CMD）。**复合式** = 选择开关（CV、CV2、SV）。**笼式** WSL/WDL，**鼓式** WSG。
- 排名是**最低满足**：CV2 → CM2 → SHZV → SHZVG。合法的 III 存在时，一台 III 优于 3× I。
- 选择器绝缘等级按 Um 下限：≤72.5 B，126/145 C，170/252 D，≥300 DE。相邻分接间 BIL 只能往上抬。
- 分接代码 `P = 2×(±N)+mid`。三个中间位置共用一个电压。

## 选好之后——这样解释

> `CV2III-350D/40.5-10193W` —— 真空复合式覆盖 40.5 kV 线端 350 A。CV2 的 III-D 存在。±8 中间 3 档正反调是 10193W。复合式无选择器等级字母。满足要求的最低样本册系列。

然后停。下单（OS）前仍需工程确认。
