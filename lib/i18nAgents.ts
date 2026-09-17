import type { Lang } from "./i18n";

export type AgentGuideCopy = {
  back: string;
  title: string;
  lead: string;
  s1t: string;
  s1b: string;
  s1copy: string;
  s1alt: string;
  dl: string;
  hub: string;
  s2t: string;
  s2b: string;
  s2q: string;
  s3t: string;
  s3b: string;
  s3note: string;
  tagOltc: string;
  tagOctc: string;
  cli: string;
  install: string;
  run: string;
  copy: string;
  copied: string;
  limit: string;
};

const zh: AgentGuideCopy = {
  back: "选型",
  title: "让 AI 助手帮你选型",
  lead: "三步：装上技能，发参数，拿型号。",
  s1t: "装上技能",
  s1b: "把这句话发给你的 AI 助手，WorkBuddy、Claude Code、Cursor 都行，它自己从 SkillHub 装好。",
  s1copy: "复制这句话",
  s1alt: "其他装法：",
  dl: "下载技能包 zip",
  hub: "在 SkillHub 上查看",
  s2t: "把参数发给它",
  s2b: "像聊天一样，有什么发什么。参数不确定，它会来问你。",
  s2q: "帮我选个一拖二的：110 kV，有载 ±8×1.25%，无载 5 档，350 A，高压侧中性点调压。",
  s3t: "拿到型号和理由",
  s3b: "型号都来自样本册，不编。一拖二会出有载、无载两个型号。",
  s3note: "两台都过了样本册检查，可以拿去询价。",
  tagOltc: "有载",
  tagOctc: "无载",
  cli: "想自己跑命令",
  install: "安装",
  run: "有载例子",
  copy: "复制",
  copied: "已复制",
  limit: "出 OS 或采购前，需要工程确认。",
};

const en: AgentGuideCopy = {
  back: "Selector",
  title: "Let an AI assistant pick the type",
  lead: "Three steps: install the skill, send the data, get the type.",
  s1t: "Install the skill",
  s1b: "Send this line to your AI assistant. WorkBuddy, Claude Code, Cursor all work; it installs the skill from SkillHub by itself.",
  s1copy: "Copy the line",
  s1alt: "Other ways:",
  dl: "Download the skill zip",
  hub: "View on SkillHub",
  s2t: "Send the transformer data",
  s2b: "Just chat. If a parameter is unclear, it asks.",
  s2q: "Pick one for a transformer with both on-load and off-circuit taps: 110 kV, on-load ±8×1.25%, off-circuit 5 positions, 350 A, taps at the HV neutral.",
  s3t: "Get the type and the why",
  s3b: "Every type comes from the catalogue, none invented. Dual-duty gets two type strings.",
  s3note: "Both passed the brochure check and are ready for pricing.",
  tagOltc: "on-load",
  tagOctc: "off-circuit",
  cli: "Want to run it yourself",
  install: "Install",
  run: "On-load example",
  copy: "Copy",
  copied: "Copied",
  limit: "Get engineering sign-off before an OS or a purchase.",
};

const vi: AgentGuideCopy = {
  back: "Chọn kiểu",
  title: "Để trợ lý AI chọn kiểu giúp bạn",
  lead: "Ba bước: cài skill, gửi số liệu, nhận kiểu.",
  s1t: "Cài skill",
  s1b: "Gửi câu này cho trợ lý AI của bạn. WorkBuddy, Claude Code, Cursor đều được; nó tự cài từ SkillHub.",
  s1copy: "Chép câu này",
  s1alt: "Cách khác:",
  dl: "Tải gói skill zip",
  hub: "Xem trên SkillHub",
  s2t: "Gửi số liệu máy biến áp",
  s2b: "Cứ chat bình thường. Thông số nào không rõ, nó sẽ hỏi lại.",
  s2q: "Chọn giúp tôi cho máy biến áp vừa có tải vừa không tải: 110 kV, có tải ±8×1.25%, không tải 5 nấc, 350 A, điều áp ở trung tính cao áp.",
  s3t: "Nhận kiểu và lý do",
  s3b: "Kiểu nào cũng từ catalogue, không bịa. Máy hai hệ thống sẽ ra hai mã kiểu.",
  s3note: "Cả hai đều qua kiểm tra catalogue, có thể đem đi báo giá.",
  tagOltc: "có tải",
  tagOctc: "không tải",
  cli: "Muốn tự chạy lệnh",
  install: "Cài đặt",
  run: "Ví dụ có tải",
  copy: "Chép",
  copied: "Đã chép",
  limit: "Trước OS hoặc mua hàng cần kỹ sư xác nhận.",
};

const es: AgentGuideCopy = {
  back: "Selector",
  title: "Que un asistente de IA elija el tipo",
  lead: "Tres pasos: instale el skill, envíe los datos, reciba el tipo.",
  s1t: "Instale el skill",
  s1b: "Envíe esta línea a su asistente de IA. WorkBuddy, Claude Code y Cursor sirven; él mismo lo instala desde SkillHub.",
  s1copy: "Copiar la línea",
  s1alt: "Otras formas:",
  dl: "Descargar el skill zip",
  hub: "Ver en SkillHub",
  s2t: "Envíe los datos del transformador",
  s2b: "Como un chat. Si un parámetro no está claro, se lo preguntará.",
  s2q: "Elíjame uno para un transformador con regulación en carga y sin carga: 110 kV, en carga ±8×1.25%, sin carga 5 posiciones, 350 A, regulación en el neutro de AT.",
  s3t: "Reciba el tipo y la razón",
  s3b: "Todos los tipos vienen del catálogo, nada inventado. Un equipo doble recibe dos códigos.",
  s3note: "Ambos pasaron la revisión del catálogo y sirven para pedir precio.",
  tagOltc: "en carga",
  tagOctc: "sin carga",
  cli: "Si quiere ejecutarlo usted mismo",
  install: "Instalar",
  run: "Ejemplo en carga",
  copy: "Copiar",
  copied: "Copiado",
  limit: "Antes de un OS o una compra, confírmelo con ingeniería.",
};

const tr: AgentGuideCopy = {
  back: "Seçici",
  title: "Tipi bir AI asistan seçsin",
  lead: "Üç adım: skill'i kurun, veriyi gönderin, tipi alın.",
  s1t: "Skill'i kurun",
  s1b: "Bu satırı AI asistanınıza gönderin. WorkBuddy, Claude Code, Cursor hepsi olur; SkillHub'dan kendisi kurar.",
  s1copy: "Satırı kopyala",
  s1alt: "Başka yollar:",
  dl: "Skill zip'ini indir",
  hub: "SkillHub'da görüntüle",
  s2t: "Trafo verilerini gönderin",
  s2b: "Sohbet gibi yazın. Emin olmadığı parametre olursa size sorar.",
  s2q: "Hem yük altında hem yüksüz kademeli bir trafo için seç: 110 kV, yük altında ±8×1.25%, yüksüz 5 kademe, 350 A, YG yıldız noktasından ayar.",
  s3t: "Tipi ve gerekçesini alın",
  s3b: "Tüm tipler katalogdan, uydurma yok. Çift görevli trafoda iki tip kodu çıkar.",
  s3note: "İkisi de katalog kontrolünden geçti, fiyat istemeye hazır.",
  tagOltc: "yük altında",
  tagOctc: "yüksüz",
  cli: "Kendiniz çalıştırmak isterseniz",
  install: "Kurulum",
  run: "Yük altında örnek",
  copy: "Kopyala",
  copied: "Kopyalandı",
  limit: "OS veya satın almadan önce mühendis onayı alın.",
};

const ru: AgentGuideCopy = {
  back: "Подбор",
  title: "Пусть ИИ-помощник подберёт тип",
  lead: "Три шага: установите skill, отправьте данные, получите тип.",
  s1t: "Установите skill",
  s1b: "Отправьте эту строку своему ИИ-помощнику. WorkBuddy, Claude Code, Cursor, любой подойдёт; он сам установит skill из SkillHub.",
  s1copy: "Копировать строку",
  s1alt: "Другие способы:",
  dl: "Скачать skill zip",
  hub: "Открыть в SkillHub",
  s2t: "Отправьте данные трансформатора",
  s2b: "Просто пишите, как в чате. Если параметр непонятен, он спросит.",
  s2q: "Подбери для трансформатора с РПН и ПБВ: 110 кВ, под нагрузкой ±8×1.25%, без нагрузки 5 ступеней, 350 А, регулирование в нейтрали ВН.",
  s3t: "Получите тип и обоснование",
  s3b: "Все типы из каталога, ничего не выдумано. Для двойного регулирования будет два кода.",
  s3note: "Оба прошли проверку по каталогу, можно запрашивать цену.",
  tagOltc: "РПН",
  tagOctc: "ПБВ",
  cli: "Если хотите запускать сами",
  install: "Установка",
  run: "Пример под нагрузкой",
  copy: "Копировать",
  copied: "Скопировано",
  limit: "Перед OS или закупкой нужно подтверждение инженера.",
};

const ALL: Record<Lang, AgentGuideCopy> = { zh, en, vi, es, tr, ru };

export function agentGuide(lang: Lang): AgentGuideCopy {
  return ALL[lang] ?? zh;
}
