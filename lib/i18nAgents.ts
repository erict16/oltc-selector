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
  title: "把选型交给助手",
  lead: "下载技能包，丢进 WorkBuddy。你报工况，它选型号。",
  how: "打开 WorkBuddy，选 Upload skill，导入这个 zip。机器上要有 Node。技能会自己装好 oltc 命令，按工况选型，对照样本册。样本册里没有的型号出不来。包里没有报价。",
  dl: "下载技能包",
  cli: "想自己跑命令",
  cliBody: "先装 oltc，把电流、电压喂给它，再对照样本册。助手不编型号，样本册里没有的就是没有。",
  install: "安装",
  run: "有载",
  runNote: "无载加 --octc。组合式加 --structure combined。--iu 就是 Imax，别再乘安全系数。",
  say: "也可以直接说",
  sayBody:
    "用 oltc 选型，不要自己编型号。工况：Imax 350 A，Um 40.5 kV，角接，正反调 ±8。选完对照样本册，用几句话说明为什么是这个型号。",
  copy: "复制",
  copied: "已复制",
  limit: "出 OS 或采购前，要工程确认。这是私人辅助，不是厂家工具。",
};

const en: AgentGuideCopy = {
  back: "Selector",
  title: "Let an assistant pick the type",
  lead: "Download the skill pack and drop it into WorkBuddy. You describe the duty, it picks the type.",
  how: "In WorkBuddy, choose Upload skill and import the zip. Node needs to be on the machine. The skill installs the oltc command by itself, picks by your duty, and checks the brochure. Types missing from the brochure do not come out. No prices in the pack.",
  dl: "Download the skill pack",
  cli: "Want to run the commands yourself",
  cliBody:
    "Install oltc, feed it the current and voltage, then check the brochure. The assistant never invents a type. Not in the brochure means it does not exist.",
  install: "Install",
  run: "On-load",
  runNote:
    "Off-circuit: add --octc. Combined: add --structure combined. --iu is Imax. Do not add a safety factor.",
  say: "Or just tell it",
  sayBody:
    "Pick an OLTC with oltc. Do not invent a type. Duty: Imax 350 A, Um 40.5 kV, delta, reversing ±8. Then check the catalogue and explain in a few sentences why the type fits.",
  copy: "Copy",
  copied: "Copied",
  limit:
    "Get engineering sign-off before an OS or a purchase. This is a private helper, not a factory tool.",
};

const vi: AgentGuideCopy = {
  back: "Chọn kiểu",
  title: "Để trợ lý chọn giúp",
  lead: "Tải gói skill, thả vào WorkBuddy. Bạn mô tả chế độ, nó chọn kiểu.",
  how: "Trong WorkBuddy, chọn Upload skill và nhập file zip. Máy phải có Node. Skill tự cài lệnh oltc, chọn theo chế độ rồi đối với catalogue. Kiểu không có trong catalogue thì không có. Gói không kèm giá.",
  dl: "Tải gói skill",
  cli: "Tự chạy lệnh",
  cliBody:
    "Cài oltc, đưa dòng điện và điện áp vào, rồi đối catalogue. Trợ lý không bịa kiểu. Không có trong catalogue nghĩa là không có.",
  install: "Cài đặt",
  run: "Có tải",
  runNote:
    "Không tải: thêm --octc. Kiểu kết hợp: thêm --structure combined. --iu là Imax. Đừng nhân hệ số an toàn.",
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
  title: "Que el asistente elija por usted",
  lead: "Descargue el skill y súbalo a WorkBuddy. Usted describe el régimen, él elige el tipo.",
  how: "En WorkBuddy, elija Upload skill e importe el zip. El equipo necesita Node. El skill instala el comando oltc, elige según su régimen y comprueba el catálogo. Lo que no está en el catálogo no existe. El paquete no trae precios.",
  dl: "Descargar el skill",
  cli: "Ejecútelo usted mismo",
  cliBody:
    "Instale oltc, pásle la corriente y la tensión, y compruebe el folleto. El asistente no inventa tipos. Si no está en el folleto, no existe.",
  install: "Instalar",
  run: "En carga",
  runNote:
    "Sin carga: añada --octc. Combinado: añada --structure combined. --iu es Imax. No aplique un factor de seguridad.",
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
  title: "Seçimi asistana bırakın",
  lead: "Skill paketini indirip WorkBuddy'ye atın. Siz görevi söyleyin, o tipi seçsin.",
  how: "WorkBuddy'de Upload skill seçin, zip'i yükleyin. Makinede Node olmalı. Skill oltc komutunu kendisi kurar, göreve göre seçer, katalogla kontrol eder. Katalogda olmayan tip çıkmaz. Pakette fiyat yok.",
  dl: "Skill paketini indir",
  cli: "Kendiniz çalıştırın",
  cliBody:
    "oltc'yi kurun, akımı ve gerilimi verin, broşürle kontrol edin. Asistan tip uydurmaz. Broşürde yoksa yoktur.",
  install: "Kurulum",
  run: "Yük altında",
  runNote:
    "Yüksüz: --octc ekleyin. Kombine: --structure combined ekleyin. --iu, Imax'tir. Emniyet katsayısı eklemeyin.",
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
  title: "Поручить подбор помощнику",
  lead: "Скачайте skill и бросьте его в WorkBuddy. Вы описываете режим, он выбирает тип.",
  how: "В WorkBuddy выберите Upload skill и импортируйте zip. На машине должен быть Node. Skill сам ставит команду oltc, подбирает по вашему режиму и сверяет с каталогом. Типов вне каталога не будет. Цен в пакете нет.",
  dl: "Скачать skill",
  cli: "Запустить самому",
  cliBody:
    "Установите oltc, передайте ток и напряжение, затем сверьте с брошюрой. Помощник не выдумывает типы. Нет в брошюре, значит нет.",
  install: "Установка",
  run: "Под нагрузкой",
  runNote:
    "Без нагрузки: добавьте --octc. Комбинированный: добавьте --structure combined. --iu это Imax. Коэффициент запаса не применяйте.",
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
