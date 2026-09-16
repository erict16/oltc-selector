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
  lead: "下载技能包，丢进 WorkBuddy。你说工况，它去选型号。",
  how: "在 WorkBuddy 里选 Upload skill，导入 zip。本机要有 Node。技能会自己装 oltc 命令，再用它选型，对照样本册。目录里没有的出不来。没有报价。",
  dl: "下载技能包",
  cli: "想自己跑命令",
  cliBody:
    "助手不编型号。没有 oltc，它就自己跑 npm i -g oltc-selector，再把电流、电压喂给 oltc，最后对照样本册。",
  install: "安装",
  run: "有载",
  runNote:
    "无载加 --octc。组合式加 --structure combined。--iu 是最大通过电流，不要再乘安全系数。",
  say: "也可以直接说",
  sayBody:
    "用 oltc 选开关，不要自己编型号。工况：最大通过电流 350 A，Um 40.5 kV，角接，正反调 ±8。选完对照目录，用几句话说明这个型号为什么对。",
  copy: "复制",
  copied: "已复制",
  limit: "出 OS 或采购前，还是要工程确认。这是私人辅助，不是厂家工具。",
};

const en: AgentGuideCopy = {
  back: "Selector",
  title: "Hand selection to an assistant",
  lead: "Download the skill pack and drop it into WorkBuddy. You describe the duty. It picks the type.",
  how: "In WorkBuddy, choose Upload skill and import the zip. You need Node on the machine. The skill installs the oltc command itself, runs it, then checks the brochure. Types missing from the catalogue do not come out. No prices.",
  dl: "Download the skill pack",
  cli: "Run the command yourself",
  cliBody:
    "The assistant does not invent a type. If oltc is missing, it runs npm i -g oltc-selector, feeds your current and voltage to oltc, then checks the brochure.",
  install: "Install",
  run: "On-load",
  runNote:
    "Off-circuit: add --octc. Combined construction: --structure combined. --iu is Imax. Do not apply a safety factor.",
  say: "Or just say",
  sayBody:
    "Select an OLTC with oltc. Do not invent a type. Duty: 350 A max through-current, Um 40.5 kV, delta, reversing ±8. Then check the catalogue and explain in a few sentences why the type is right.",
  copy: "Copy",
  copied: "Copied",
  limit:
    "Confirm with engineering before OS or a purchase. This is a private helper, not a factory tool.",
};

const vi: AgentGuideCopy = {
  back: "Chọn kiểu",
  title: "Giao việc chọn kiểu cho trợ lý",
  lead: "Tải gói skill, thả vào WorkBuddy. Bạn nói chế độ, nó chọn kiểu.",
  how: "Trong WorkBuddy chọn Upload skill, nhập zip. Máy cần có Node. Skill tự cài lệnh oltc, chạy rồi đối catalogue. Kiểu không có trong catalogue sẽ không ra. Không có giá.",
  dl: "Tải gói skill",
  cli: "Tự chạy lệnh",
  cliBody:
    "Trợ lý không bịa kiểu. Không có oltc thì tự chạy npm i -g oltc-selector, đưa dòng và điện áp vào oltc, rồi đối catalogue.",
  install: "Cài đặt",
  run: "Có tải",
  runNote:
    "Không tải: thêm --octc. Kết hợp: --structure combined. --iu là Imax, đừng nhân hệ số an toàn.",
  say: "Hoặc nói thẳng",
  sayBody:
    "Chọn OLTC bằng oltc, đừng bịa kiểu. Chế độ: 350 A dòng xuyên max, Um 40.5 kV, tam giác, đảo cực ±8. Xong thì đối catalogue, giải thích ngắn vì sao kiểu đúng.",
  copy: "Chép",
  copied: "Đã chép",
  limit:
    "Trước OS hoặc mua hàng vẫn cần kỹ sư xác nhận. Đây là công cụ phụ, không phải công cụ hãng.",
};

const es: AgentGuideCopy = {
  back: "Selector",
  title: "Deje la selección al asistente",
  lead: "Descargue el skill y suéltelo en WorkBuddy. Usted describe el régimen. Elige el tipo.",
  how: "En WorkBuddy, elija Upload skill e importe el zip. Hace falta Node en el equipo. El skill instala oltc, lo ejecuta y comprueba el catálogo. Los tipos que no están en el catálogo no aparecen. Sin precios.",
  dl: "Descargar el skill",
  cli: "Ejecute el comando usted",
  cliBody:
    "El asistente no inventa el tipo. Si falta oltc, ejecuta npm i -g oltc-selector, pasa corriente y tensión a oltc y comprueba el folleto.",
  install: "Instalar",
  run: "En carga",
  runNote:
    "Fuera de circuito: --octc. Combinado: --structure combined. --iu es Imax. No aplique factor de seguridad.",
  say: "O dígale",
  sayBody:
    "Seleccione un OLTC con oltc. No invente el tipo. Régimen: 350 A de corriente máxima, Um 40.5 kV, delta, inversión ±8. Luego compruebe el catálogo y explique en pocas frases por qué el tipo es correcto.",
  copy: "Copiar",
  copied: "Copiado",
  limit:
    "Confirme con ingeniería antes del OS o la compra. Es una ayuda privada, no una herramienta de fábrica.",
};

const tr: AgentGuideCopy = {
  back: "Seçici",
  title: "Seçimi asistana bırakın",
  lead: "Skill paketini indirip WorkBuddy'ye atın. Siz görevi söyleyin, o tipi seçsin.",
  how: "WorkBuddy'de Upload skill deyip zip'i yükleyin. Makinede Node olsun. Skill oltc komutunu kendi kurar, çalıştırır, katalogla kontrol eder. Katalogda olmayan tip üretilmez. Fiyat yok.",
  dl: "Skill paketini indir",
  cli: "Komutu kendiniz çalıştırın",
  cliBody:
    "Asistan tip uydurmaz. oltc yoksa npm i -g oltc-selector çalıştırır, akım ve gerilimi oltc'ye verir, broşürle kontrol eder.",
  install: "Kurulum",
  run: "Yük altında",
  runNote:
    "Yüksüz: --octc. Kombine: --structure combined. --iu Imax'tir. Emniyet katsayısı uygulamayın.",
  say: "Ya da deyin",
  sayBody:
    "oltc ile OLTC seç. Tip uydurma. Görev: 350 A maks. akım, Um 40.5 kV, üçgen, tersinir ±8. Sonra katalogla kontrol et, birkaç cümleyle neden doğru olduğunu yaz.",
  copy: "Kopyala",
  copied: "Kopyalandı",
  limit:
    "OS veya satın almadan önce mühendislik onayı gerekir. Bu özel bir yardımcı, üretici aracı değil.",
};

const ru: AgentGuideCopy = {
  back: "Подбор",
  title: "Поручить подбор помощнику",
  lead: "Скачайте skill и бросьте в WorkBuddy. Вы описываете режим, он выбирает тип.",
  how: "В WorkBuddy: Upload skill и zip. На машине нужен Node. Skill сам ставит команду oltc, запускает её и сверяет с каталогом. Типов вне каталога не будет. Без цен.",
  dl: "Скачать skill",
  cli: "Запустить команду самим",
  cliBody:
    "Помощник не выдумывает тип. Нет oltc, сам выполняет npm i -g oltc-selector, передаёт ток и напряжение в oltc, затем сверяет брошюру.",
  install: "Установка",
  run: "Под нагрузкой",
  runNote:
    "Без нагрузки: --octc. Комбинированный: --structure combined. --iu это Imax. Коэффициент запаса не применяйте.",
  say: "Или скажите",
  sayBody:
    "Подберите РПН через oltc. Не выдумывайте тип. Режим: 350 А макс. ток, Um 40.5 кВ, треугольник, реверс ±8. Затем сверьте каталог и в нескольких фразах объясните, почему тип верный.",
  copy: "Копировать",
  copied: "Скопировано",
  limit:
    "Перед OS или закупкой нужно инженерное подтверждение. Это частный помощник, не инструмент завода.",
};

const ALL: Record<Lang, AgentGuideCopy> = { zh, en, vi, es, tr, ru };

export function agentGuide(lang: Lang): AgentGuideCopy {
  return ALL[lang] ?? zh;
}
