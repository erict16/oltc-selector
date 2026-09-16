import type { Lang } from "./i18n";

export type AgentGuideCopy = {
  back: string;
  title: string;
  lead: string;
  s1t: string;
  s1: string;
  s2t: string;
  s2: string;
  s3t: string;
  s3: string;
  s3note: string;
  s4t: string;
  s4: string;
  s5t: string;
  s5: string;
  s5dl: string;
  s6t: string;
  s6: string;
  s7t: string;
  s7: string;
};

const zh: AgentGuideCopy = {
  back: "选型",
  title: "试试把选型交给 AI 助手们？",
  lead: "网页供人工填写。同一规则也可交由常用 AI 助手执行。目录中不存在的型号不会出现。",
  s1t: "这是干什么",
  s1: "首页表格供人工填写。同一规则也可交由 WorkBuddy、ChatGPT、Claude、Grok、Kimi、GLM 等能运行命令的 Agent。Agent 必须调用 oltc，不得自行编造型号。",
  s2t: "安装",
  s2: "需要 Node.js 20 或更新，然后：",
  s3t: "运行",
  s3: "有载示例：",
  s3note:
    "无载加 --octc。组合式 --structure combined，复合式 --structure compound。--iu 是最大通过电流 Imax，不要再乘安全系数。--k 只用于 --mva。",
  s4t: "对 Agent 怎么说",
  s4: "用 oltc 选有载开关，不要自己编型号。工况：最大通过电流 350 A，Um 40.5 kV，角接，正反调 ±8。选完对照目录检查，并用一小段说明为什么这个型号正确。",
  s5t: "技能包",
  s5: "可选。在 WorkBuddy 里用「上传技能」导入 zip。技能要求先跑 oltc，拒绝样本册没有的型号，并说明为何正确。只含选型，不含报价。",
  s5dl: "下载 oltc-selector.zip",
  s6t: "常见错误",
  s6: "编造 CV2-500；把变压器 Dyn11 当成开关 Y/D；把无载当成有载；一拖三写成三台机构（默认一台）；把 10193W 的 19 当成变压器工作档位（电压档是 17）。",
  s7t: "界限",
  s7: "仅为示意。出 OS 或采购前须工程确认。本站是私人辅助，不是制造商官方工具。",
};

const en: AgentGuideCopy = {
  back: "Selector",
  title: "Try handing selection to AI assistants?",
  lead: "The form is for you. The same rules can be used by a common AI assistant. Types that are not in the catalogue do not come out.",
  s1t: "What this is",
  s1: "The home form is for you. The same rules can be used by WorkBuddy, ChatGPT, Claude, Grok, Kimi, GLM, or another agent that can run a command. The agent must call oltc — it must not invent a type string.",
  s2t: "Install",
  s2: "Node.js 20 or newer, then:",
  s3t: "Run",
  s3: "On-load example:",
  s3note:
    "Off-circuit: add --octc. Combined: --structure combined. Compound: --structure compound. --iu is Imax — do not apply a safety factor. --k is for --mva only.",
  s4t: "What to tell the agent",
  s4: "Select an OLTC with oltc. Do not invent a type. Duty: 350 A max through-current, Um 40.5 kV, delta, reversing ±8. Then check the type against the catalogue and say in one short paragraph why it is correct.",
  s5t: "Skill pack",
  s5: "Optional. Import this zip into WorkBuddy (Upload skill). It tells the agent to run oltc, refuse types the brochure does not have, and explain the pick. Selection only — no prices.",
  s5dl: "Download oltc-selector.zip",
  s6t: "Common mistakes",
  s6: "Inventing CV2-500; treating transformer Dyn11 as OLTC Y/D; treating off-circuit as on-load; writing three MDUs for three single-phase poles (default is one drive); putting 19 as transformer operating positions for 10193W (that is 17 voltage steps).",
  s7t: "Limits",
  s7: "Indicative only. Confirm every type with engineering before OS or purchase. This site is a private helper, not a manufacturer tool.",
};

const vi: AgentGuideCopy = {
  back: "Chọn kiểu",
  title: "Giao việc chọn kiểu cho trợ lý AI?",
  lead: "Biểu mẫu trên trang chủ dành cho bạn. Cùng một quy tắc có thể giao cho trợ lý AI. Kiểu không có trong catalogue sẽ không được đưa ra.",
  s1t: "Đây là gì",
  s1: "Bảng trên trang chủ dành cho người. Cùng quy tắc có thể giao cho WorkBuddy, ChatGPT, Claude, Grok, Kimi, GLM hoặc agent khác chạy được lệnh. Agent phải gọi oltc, không được bịa kiểu.",
  s2t: "Cài đặt",
  s2: "Node.js 20 trở lên, rồi:",
  s3t: "Chạy",
  s3: "Ví dụ có tải:",
  s3note:
    "Không tải: thêm --octc. Kết hợp: --structure combined. Tổ hợp: --structure compound. --iu là Imax — không nhân hệ số an toàn. --k chỉ dùng với --mva.",
  s4t: "Nói gì với agent",
  s4: "Chọn OLTC bằng oltc. Đừng bịa kiểu. Chế độ: 350 A dòng xuyên max, Um 40.5 kV, tam giác, đảo cực ±8. Sau đó đối chiếu catalogue và giải thích ngắn vì sao kiểu đúng.",
  s5t: "Gói skill",
  s5: "Tùy chọn. Tải zip vào WorkBuddy (Upload skill). Skill bắt chạy oltc, từ chối kiểu brochure không có, và giải thích. Chỉ chọn kiểu, không giá.",
  s5dl: "Tải oltc-selector.zip",
  s6t: "Lỗi thường gặp",
  s6: "Bịa CV2-500; coi Dyn11 máy biến áp là Y/D của bộ đổi nấc; coi không tải là có tải; viết ba MDU cho ba cực một pha (mặc định một bộ truyền); coi 19 của 10193W là số nấc điện áp (thực ra 17).",
  s7t: "Giới hạn",
  s7: "Chỉ mang tính tham khảo. Xác nhận kỹ thuật trước OS hoặc mua. Đây là công cụ phụ, không phải công cụ hãng.",
};

const es: AgentGuideCopy = {
  back: "Selector",
  title: "¿Dejar la selección a los asistentes de IA?",
  lead: "El formulario es para usted. Las mismas reglas pueden usarlas un asistente de IA. Los tipos que no están en el catálogo no aparecen.",
  s1t: "Qué es esto",
  s1: "El formulario de inicio es para usted. Las mismas reglas pueden usarlas WorkBuddy, ChatGPT, Claude, Grok, Kimi, GLM u otro agente que ejecute un comando. El agente debe llamar oltc; no debe inventar el tipo.",
  s2t: "Instalación",
  s2: "Node.js 20 o posterior, luego:",
  s3t: "Ejecutar",
  s3: "Ejemplo en carga:",
  s3note:
    "Fuera de circuito: --octc. Combinado: --structure combined. Compuesto: --structure compound. --iu es Imax; no aplique factor de seguridad. --k solo con --mva.",
  s4t: "Qué decirle al agente",
  s4: "Seleccione un OLTC con oltc. No invente el tipo. Régimen: 350 A de corriente máxima, Um 40.5 kV, delta, inversión ±8. Luego compruebe el catálogo y explique por qué el tipo es correcto.",
  s5t: "Paquete de skill",
  s5: "Opcional. Importe el zip en WorkBuddy. El skill exige ejecutar oltc, rechazar tipos que no estén en el folleto y explicar la elección. Solo selección, sin precios.",
  s5dl: "Descargar oltc-selector.zip",
  s6t: "Errores frecuentes",
  s6: "Inventar CV2-500; tomar Dyn11 del transformador como Y/D del conmutador; tratar fuera de circuito como en carga; escribir tres MDU para tres polos monofásicos (por defecto uno); tomar 19 de 10193W como escalones de tensión (son 17).",
  s7t: "Límites",
  s7: "Solo orientativo. Confirme con ingeniería antes del OS o la compra. Este sitio es una ayuda privada, no una herramienta del fabricante.",
};

const tr: AgentGuideCopy = {
  back: "Seçici",
  title: "Seçimi AI asistanlara bırakmayı dener misiniz?",
  lead: "Form sizin için. Aynı kurallar bir AI asistan tarafından da kullanılabilir. Katalogda olmayan tipler üretilmez.",
  s1t: "Bu nedir",
  s1: "Ana sayfadaki form sizin için. Aynı kurallar WorkBuddy, ChatGPT, Claude, Grok, Kimi, GLM veya komut çalıştıran başka bir agent ile kullanılabilir. Agent oltc çağırmalı, tipi uydurmamalı.",
  s2t: "Kurulum",
  s2: "Node.js 20 veya üzeri, sonra:",
  s3t: "Çalıştır",
  s3: "Yük altında örnek:",
  s3note:
    "Yüksüz: --octc. Kombine: --structure combined. Kompound: --structure compound. --iu Imax’tir; emniyet katsayısı uygulamayın. --k yalnızca --mva ile.",
  s4t: "Agente ne denir",
  s4: "oltc ile OLTC seç. Tip uydurma. Görev: 350 A maks. akım, Um 40.5 kV, üçgen, tersinir ±8. Sonra katalogla kontrol et ve neden doğru olduğunu kısaca yaz.",
  s5t: "Skill paketi",
  s5: "İsteğe bağlı. Zip’i WorkBuddy’ye yükleyin. Skill oltc çalıştırmayı, broşürde olmayan tipi reddetmeyi ve açıklamayı ister. Yalnızca seçim, fiyat yok.",
  s5dl: "oltc-selector.zip indir",
  s6t: "Sık hatalar",
  s6: "CV2-500 uydurmak; transformatör Dyn11’i OLTC Y/D sanmak; yüksüzü yük altı saymak; üç tek faz kutup için üç MDU yazmak (varsayılan bir sürücü); 10193W’deki 19’u gerilim kademesi sanmak (17’dir).",
  s7t: "Sınırlar",
  s7: "Yalnızca gösterge niteliğindedir. OS veya satın almadan önce mühendislik onayı gerekir. Bu site özel bir yardımcı, üretici aracı değildir.",
};

const ru: AgentGuideCopy = {
  back: "Подбор",
  title: "Поручить подбор ИИ-помощникам?",
  lead: "Форма — для вас. Те же правила может выполнить обычный ИИ-помощник. Типы вне каталога не выдаются.",
  s1t: "Что это",
  s1: "Форма на главной — для вас. Те же правила могут использовать WorkBuddy, ChatGPT, Claude, Grok, Kimi, GLM или другой агент, умеющий запускать команду. Агент должен вызывать oltc и не выдумывать тип.",
  s2t: "Установка",
  s2: "Node.js 20 или новее, затем:",
  s3t: "Запуск",
  s3: "Пример под нагрузкой:",
  s3note:
    "Без нагрузки: --octc. Комбинированный: --structure combined. Компаунд: --structure compound. --iu это Imax; коэффициент запаса не применять. --k только с --mva.",
  s4t: "Что сказать агенту",
  s4: "Подберите РПН через oltc. Не выдумывайте тип. Режим: 350 А макс. ток, Um 40.5 кВ, треугольник, реверс ±8. Затем сверьте с каталогом и кратко объясните, почему тип верен.",
  s5t: "Пакет skill",
  s5: "По желанию. Импортируйте zip в WorkBuddy. Skill требует запуска oltc, отказа от типов вне брошюры и пояснения. Только подбор, без цен.",
  s5dl: "Скачать oltc-selector.zip",
  s6t: "Частые ошибки",
  s6: "Выдумать CV2-500; принять Dyn11 трансформатора за Y/D РПН; принять без нагрузки за под нагрузкой; писать три MDU на три однофазных полюса (по умолчанию один привод); считать 19 в 10193W числом ступеней напряжения (их 17).",
  s7t: "Ограничения",
  s7: "Только ориентир. Перед OS или закупкой нужно инженерное подтверждение. Это частный помощник, не инструмент завода.",
};

const ALL: Record<Lang, AgentGuideCopy> = { zh, en, vi, es, tr, ru };

export function agentGuide(lang: Lang): AgentGuideCopy {
  return ALL[lang] ?? zh;
}
