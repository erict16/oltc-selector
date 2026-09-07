# 有载开关选型

填工况，点选型。给出目录里**最低满足**的型号，以及 2025 基价（FOB 上海，可换 14 种货币）。

**在线：** [erict16.github.io/oltc-selector](https://erict16.github.io/oltc-selector/)

![工作台](docs/readme.png)

私人辅助，不是厂家官网。型号是起点，出 OS 前要工程确认。

## 怎么用

上面三个预选是变压器电压等级（66 / 110 / 220 kV），会填好对应的开关 Um。电流、Um、级电压都是目录下拉，手机上点选。

引擎按 2025 目录排：**CV2 → CM2 → SHZV → SHZVG**。能用一台三相就不拆成三台单相。没有 CV2-500。箱顶走 HWV；更多选项里可切无载（WSL / WSG）。

点选型之后才出型号。改参数不会悄悄换结果，要再点一次。

```bash
npm install
npm run dev      # http://127.0.0.1:3000
npm test
npm run build
```

GitHub Pages：`npm run build:gh`。

语言：中文、English、Tiếng Việt、Español、Türkçe、Русский。

## 字段

| 栏 | 意思 |
|---|---|
| 开关通过电流 Iᵤ | 目录电流，如 400 A、600 A |
| 设备最高电压 Um | 开关绝缘等级，如 72.5 kV（不是变压器 66 kV） |
| 级电压 Ust | 档位电压，如 1500 V |
| 开关连接 | 开关接在哪：Y 中性点 / D 线端 |
| 调压方式 | 线性 0 / 正反 W / 粗细 G |
| ± 级数 | 仅 W/G；线性只选位置数 |

## 测试

`npm test`：引擎、2025 价目、真实 Qu-ET / Anthony 报价回放（84 条，0 fail）。跳过的行（只有机构、CV2-500、一张表两台变）写了原因。笔记在 `docs/replay/`。

## 许可

[条款](https://erict16.github.io/oltc-selector/terms/) · [隐私](https://erict16.github.io/oltc-selector/privacy/)。仅供参考。
