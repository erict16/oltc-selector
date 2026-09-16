import type { Lang } from "./i18n";

export type AgentGuideCopy = {
  back: string;
  title: string;
  lead: string;
  how: string;
  dl: string;
  cli: string;
  cliBody: string;
  install: string;
  run: string;
  runNote: string;
  say: string;
  sayBody: string;
  copy: string;
  copied: string;
  limit: string;
};

const zh: AgentGuideCopy = {
  back: "选型",
  title: "让 AI 助手帮你选型",
  lead: "下载技能包，传给你在用的 AI 助手。你报工况，它选型号。",
  how: "在助手里找上传技能的入口，WorkBuddy 里叫 Upload skill，别的助手也有类似的导入。把 zip 传进去就行。机器上要有 Node，技能会自己装好 oltc 命令，不用你动手。之后用大白话报工况，它选完会对照样本册：样本册里没有的型号出不来，包里也没有报价。",
  dl: "下载技能包",
  cli: "想自己跑命令",
  cliBody:
    "技能背后是个命令行工具 oltc，同一套选型逻辑。装上它，把电流、电压喂给它，再对照样本册。它不编型号，样本册里没有的就是没有。",
  install: "安装",
  run: "有载例子",
  runNote:
    "无载加 --octc。组合式加 --structure combined。--iu 是最大通过电流 Imax，直接填，别再乘安全系数。",
  say: "也可以直接对助手说",
  sayBody:
    "用 oltc 选型，不要自己编型号。工况：Imax 350 A，Um 40.5 kV，角接，正反调 ±8。选完对照样本册，用几句话说明为什么是这个型号。",
  copy: "复制",
  copied: "已复制",
  limit: "出 OS 或采购前，要工程确认。这是私人辅助，不是厂家工具。",
};

const en: AgentGuideCopy = {
  back: "Selector",
  title: "Let an AI assistant pick the type",
  lead: "Download the skill pack and upload it to the AI assistant you already use. You describe the duty, it picks the type.",
  how: "Find the skill upload entry in your assistant. In WorkBuddy it is called Upload skill; other assistants have a similar import. Send the zip in. Node needs to be on the machine, and the skill installs the oltc command by itself. Then describe the duty in plain words. It checks the brochure after picking: a type missing from the brochure does not come out, and the pack has no prices.",
  dl: "Download the skill pack",
  cli: "Want to run it yourself",
  cliBody:
    "Behind the skill is a small command line tool, oltc, with the same selection logic. Install it, feed it the current and voltage, then check the brochure. It never invents a type. Not in the brochure means it does not exist.",
  install: "Install",
  run: "On-load example",
  runNote:
    "Off-circuit: add --octc. Combined: add --structure combined. --iu is the max through-current Imax. Enter it as is, no safety factor.",
  say: "Or just tell the assistant",
  sayBody:
    "Pick an OLTC with oltc. Do not invent a type. Duty: Imax 350 A, Um 40.5 kV, delta, reversing ±8. Then check the catalogue and explain in a few sentences why the type fits.",
  copy: "Copy",
  copied: "Copied",
  limit:
    "Get engineering sign-off before an OS or a purchase. This is a private helper, not a factory tool.",
};

const vi: AgentGuideCopy = {
  back: "Chọn kiểu",
  title: "Để trợ lý AI chọn kiểu giúp bạn",
  lead: "Tải gói skill, tải lên trợ lý AI bạn đang dùng. Bạn mô tả chế độ, nó chọn kiểu.",
  how: "Tìm mục tải skill trong trợ lý: trong WorkBuddy là Upload skill, trợ lý khác có mục nhập tương tự. Gửi file zip vào. Máy phải có Node, skill tự cài lệnh oltc, bạn không cần làm gì. Sau đó cứ mô tả chế độ bằng lời thường. Nó chọn xong sẽ đối catalogue: kiểu không có trong catalogue thì không ra, gói không kèm giá.",
  dl: "Tải gói skill",
  cli: "Muốn tự chạy lệnh",
  cliBody:
    "Phía sau skill là công cụ dòng lệnh oltc, cùng một logic chọn. Cài nó, đưa dòng điện và điện áp vào, rồi đối catalogue. Nó không bịa kiểu. Không có trong catalogue nghĩa là không có.",
  install: "Cài đặt",
  run: "Ví dụ có tải",
  runNote:
    "Không tải: thêm --octc. Kiểu kết hợp: thêm --structure combined. --iu là dòng xuyên lớn nhất Imax, điền đúng số đó, đừng nhân hệ số an toàn.",
  say: "Hoặc nói thẳng với trợ lý",
  sayBody:
    "Chọn OLTC bằng oltc. Đừng bịa kiểu. Chế độ: Imax 350 A, Um 40.5 kV, nối tam giác, đảo cực ±8. Xong thì đối catalogue, giải thích vài câu vì sao kiểu này đúng.",
  copy: "Chép",
  copied: "Đã chép",
  limit:
    "Trước OS hoặc mua hàng cần kỹ sư xác nhận. Đây là trợ lý cá nhân, không phải công cụ của hãng.",
};

const es: AgentGuideCopy = {
  back: "Selector",
  title: "Que un asistente de IA elija el tipo",
  lead: "Descargue el skill y súbalo al asistente de IA que ya usa. Usted describe el régimen, él elige el tipo.",
  how: "Busque la opción de subir skills en su asistente: en WorkBuddy se llama Upload skill; otros asistentes tienen una importación parecida. Envíe el zip. El equipo necesita Node y el skill instala el comando oltc por sí solo. Luego describa el régimen en palabras normales. Tras elegir, comprueba el catálogo: lo que no está en el catálogo no existe y el paquete no trae precios.",
  dl: "Descargar el skill",
  cli: "Si quiere ejecutarlo usted mismo",
  cliBody:
    "Detrás del skill hay una herramienta de línea de comandos, oltc, con la misma lógica de selección. Instálela, pásle la corriente y la tensión y compruebe el folleto. No inventa tipos. Si no está en el folleto, no existe.",
  install: "Instalar",
  run: "Ejemplo en carga",
  runNote:
    "Sin carga: añada --octc. Combinado: añada --structure combined. --iu es la corriente máxima Imax. Escríbala tal cual, sin factor de seguridad.",
  say: "O dígaselo directamente",
  sayBody:
    "Elija un OLTC con oltc. No invente el tipo. Régimen: Imax 350 A, Um 40.5 kV, delta, inversión ±8. Luego compruebe el catálogo y explique en unas frases por qué el tipo es el correcto.",
  copy: "Copiar",
  copied: "Copiado",
  limit:
    "Antes de un OS o una compra, confírmelo con ingeniería. Es una ayuda privada, no una herramienta de fábrica.",
};

const tr: AgentGuideCopy = {
  back: "Seçici",
  title: "Tipi bir AI asistan seçsin",
  lead: "Skill paketini indirip kullandığınız AI asistana yükleyin. Siz görevi söyleyin, o tipi seçsin.",
  how: "Asistanınızda skill yükleme girişini bulun: WorkBuddy'de buna Upload skill denir, diğer asistanlarda benzer bir içe aktarma vardır. Zip'i gönderin. Makinede Node olmalı; skill oltc komutunu kendisi kurar, size iş düşmez. Sonra görevi günlük dille anlatın. Seçtikten sonra katalogla kontrol eder: katalogda olmayan tip çıkmaz, pakette fiyat yok.",
  dl: "Skill paketini indir",
  cli: "Kendiniz çalıştırmak isterseniz",
  cliBody:
    "Skill'in arkasında aynı seçim mantığına sahip bir komut satırı aracı var: oltc. Kurun, akımı ve gerilimi verin, broşürle kontrol edin. Tip uydurmaz. Broşürde yoksa yoktur.",
  install: "Kurulum",
  run: "Yük altında örnek",
  runNote:
    "Yüksüz: --octc ekleyin. Kombine: --structure combined ekleyin. --iu, maksimum geçiş akımı Imax'tir. Olduğu gibi girin, emniyet katsayısı eklemeyin.",
  say: "Ya da asistana deyin",
  sayBody:
    "oltc ile OLTC seç. Tip uydurma. Görev: Imax 350 A, Um 40.5 kV, üçgen, tersinir ±8. Sonra katalogla kontrol et, birkaç cümleyle neden doğru olduğunu anlat.",
  copy: "Kopyala",
  copied: "Kopyalandı",
  limit:
    "OS veya satın almadan önce mühendis onayı alın. Bu özel bir yardımcı, fabrika aracı değil.",
};

const ru: AgentGuideCopy = {
  back: "Подбор",
  title: "Пусть ИИ-помощник подберёт тип",
  lead: "Скачайте skill и загрузите его в ИИ-помощника, которым пользуетесь. Вы описываете режим, он выбирает тип.",
  how: "Найдите в помощнике загрузку skill: в WorkBuddy это Upload skill, у других есть похожий импорт. Отправьте zip. На машине должен быть Node, команду oltc skill поставит сам. Дальше описывайте режим обычными словами. После подбора он сверяет с каталогом: типов вне каталога не будет, цен в пакете нет.",
  dl: "Скачать skill",
  cli: "Если хотите запускать сами",
  cliBody:
    "Внутри skill командная утилита oltc с той же логикой подбора. Установите её, передайте ток и напряжение, затем сверьте с брошюрой. Она не выдумывает типы. Нет в брошюре, значит нет.",
  install: "Установка",
  run: "Пример под нагрузкой",
  runNote:
    "Без нагрузки: добавьте --octc. Комбинированный: добавьте --structure combined. --iu это максимальный сквозной ток Imax. Вводите как есть, без коэффициента запаса.",
  say: "Или скажите помощнику",
  sayBody:
    "Подберите РПН через oltc. Не выдумывайте тип. Режим: Imax 350 А, Um 40.5 кВ, треугольник, реверс ±8. Затем сверьте с каталогом и объясните парой фраз, почему тип подходит.",
  copy: "Копировать",
  copied: "Скопировано",
  limit:
    "Перед OS или закупкой нужно подтверждение инженера. Это частный помощник, не инструмент завода.",
};

const ALL: Record<Lang, AgentGuideCopy> = { zh, en, vi, es, tr, ru };

export function agentGuide(lang: Lang): AgentGuideCopy {
  return ALL[lang] ?? zh;
}
