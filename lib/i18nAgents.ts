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
  say: string;
  sayBody: string;
  sayBody2: string;
  sayResult2: string;
  copy: string;
  copied: string;
  limit: string;
};

const zh: AgentGuideCopy = {
  back: "选型",
  title: "让 AI 助手帮你选型",
  lead: "下载技能包，传给你的 AI 助手。把变压器参数发给它，它选型号。",
  how: "在助手里找上传技能的入口，把 zip 传进去就行。之后把变压器参数发给它就行，有什么参数不确定，它会来问你。",
  dl: "下载技能包",
  cli: "想自己跑命令",
  cliBody:
    "技能背后是个命令行工具 oltc，和网页版同一套选型逻辑。它不编型号，样本册里没有的就是没有。",
  install: "安装",
  run: "有载例子",
  say: "然后就像聊天一样，把参数发给它",
  sayBody:
    "帮我选个有载开关：25 MVA，110±8×1.25%/10.5 kV，Dyn11，高压侧中性点调压，要真空。",
  sayBody2:
    "帮我选个一拖二的：110 kV，有载 ±8×1.25%，无载 5 档，350 A，高压侧中性点调压。",
  sayResult2:
    "它会给你两个型号：CV2III-350Y/72.5-10193W（有载）和 WSLIV-600Y/72.5-6x5A（无载）。",
  copy: "复制",
  copied: "已复制",
  limit: "出 OS 或采购前，需要工程确认。",
};

const en: AgentGuideCopy = {
  back: "Selector",
  title: "Let an AI assistant pick the type",
  lead: "Download the skill pack and upload it to the AI assistant you already use. Send it the transformer data, it picks the type.",
  how: "Find the skill upload entry in your assistant and send the zip in. Then just send it the transformer data. If a parameter is unclear, it will ask.",
  dl: "Download the skill pack",
  cli: "Want to run it yourself",
  cliBody:
    "Behind the skill is a small command line tool, oltc, with the same selection logic as the web app. It never invents a type. Not in the brochure means it does not exist.",
  install: "Install",
  run: "On-load example",
  say: "Then pick a type by chatting",
  sayBody:
    "Pick an on-load tap-changer for me: 25 MVA, 110±8×1.25%/10.5 kV, Dyn11, taps at the HV neutral, vacuum.",
  sayBody2:
    "Pick one for a transformer with both on-load and off-circuit taps: 110 kV, on-load ±8×1.25%, off-circuit 5 positions, 350 A, taps at the HV neutral.",
  sayResult2:
    "It answers with two types: CV2III-350Y/72.5-10193W (on-load) and WSLIV-600Y/72.5-6x5A (off-circuit).",
  copy: "Copy",
  copied: "Copied",
  limit: "Get engineering sign-off before an OS or a purchase.",
};

const vi: AgentGuideCopy = {
  back: "Chọn kiểu",
  title: "Để trợ lý AI chọn kiểu giúp bạn",
  lead: "Tải gói skill, tải lên trợ lý AI bạn đang dùng. Gửi số liệu máy biến áp cho nó, nó chọn kiểu.",
  how: "Tìm mục tải skill trong trợ lý, gửi file zip vào. Sau đó cứ gửi số liệu máy biến áp cho nó. Có thông số nào không rõ, nó sẽ hỏi lại bạn.",
  dl: "Tải gói skill",
  cli: "Muốn tự chạy lệnh",
  cliBody:
    "Phía sau skill là công cụ dòng lệnh oltc, cùng logic chọn với bản web. Nó không bịa kiểu. Không có trong catalogue nghĩa là không có.",
  install: "Cài đặt",
  run: "Ví dụ có tải",
  say: "Rồi chọn kiểu như chat bình thường",
  sayBody:
    "Chọn giúp tôi bộ chuyển nấc có tải: 25 MVA, 110±8×1.25%/10.5 kV, Dyn11, điều áp ở trung tính cao áp, chân không.",
  sayBody2:
    "Chọn giúp tôi cho máy biến áp vừa có tải vừa không tải: 110 kV, có tải ±8×1.25%, không tải 5 nấc, 350 A, điều áp ở trung tính cao áp.",
  sayResult2:
    "Nó trả về hai kiểu: CV2III-350Y/72.5-10193W (có tải) và WSLIV-600Y/72.5-6x5A (không tải).",
  copy: "Chép",
  copied: "Đã chép",
  limit: "Trước OS hoặc mua hàng cần kỹ sư xác nhận.",
};

const es: AgentGuideCopy = {
  back: "Selector",
  title: "Que un asistente de IA elija el tipo",
  lead: "Descargue el skill y súbalo al asistente de IA que ya usa. Envíele los datos del transformador y él elige el tipo.",
  how: "Busque la opción de subir skills en su asistente y envíe el zip. Luego envíele los datos del transformador. Si algún parámetro no está claro, se lo preguntará.",
  dl: "Descargar el skill",
  cli: "Si quiere ejecutarlo usted mismo",
  cliBody:
    "Detrás del skill hay una herramienta de línea de comandos, oltc, con la misma lógica de selección que la web. No inventa tipos. Si no está en el folleto, no existe.",
  install: "Instalar",
  run: "Ejemplo en carga",
  say: "Luego elija charlando",
  sayBody:
    "Elíjame un cambiador en carga: 25 MVA, 110±8×1.25%/10.5 kV, Dyn11, regulación en el neutro de AT, vacío.",
  sayBody2:
    "Elíjame uno para un transformador con regulación en carga y sin carga: 110 kV, en carga ±8×1.25%, sin carga 5 posiciones, 350 A, regulación en el neutro de AT.",
  sayResult2:
    "Responde con dos tipos: CV2III-350Y/72.5-10193W (en carga) y WSLIV-600Y/72.5-6x5A (sin carga).",
  copy: "Copiar",
  copied: "Copiado",
  limit: "Antes de un OS o una compra, confírmelo con ingeniería.",
};

const tr: AgentGuideCopy = {
  back: "Seçici",
  title: "Tipi bir AI asistan seçsin",
  lead: "Skill paketini indirip kullandığınız AI asistana yükleyin. Trafo verilerini gönderin, o tipi seçsin.",
  how: "Asistanınızda skill yükleme girişini bulun ve zip'i gönderin. Sonra trafo verilerini göndermeniz yeterli. Emin olmadığı bir parametre olursa size sorar.",
  dl: "Skill paketini indir",
  cli: "Kendiniz çalıştırmak isterseniz",
  cliBody:
    "Skill'in arkasında web ile aynı seçim mantığına sahip bir komut satırı aracı var: oltc. Tip uydurmaz. Broşürde yoksa yoktur.",
  install: "Kurulum",
  run: "Yük altında örnek",
  say: "Sonra sohbet eder gibi seçin",
  sayBody:
    "Bana yük altında kademe değiştirici seç: 25 MVA, 110±8×1.25%/10.5 kV, Dyn11, YG tarafı yıldız noktasından ayar, vakum.",
  sayBody2:
    "Hem yük altında hem yüksüz kademeli bir trafo için seç: 110 kV, yük altında ±8×1.25%, yüksüz 5 kademe, 350 A, YG yıldız noktasından ayar.",
  sayResult2:
    "İki tip verir: CV2III-350Y/72.5-10193W (yük altında) ve WSLIV-600Y/72.5-6x5A (yüksüz).",
  copy: "Kopyala",
  copied: "Kopyalandı",
  limit: "OS veya satın almadan önce mühendis onayı alın.",
};

const ru: AgentGuideCopy = {
  back: "Подбор",
  title: "Пусть ИИ-помощник подберёт тип",
  lead: "Скачайте skill и загрузите его в ИИ-помощника, которым пользуетесь. Отправьте ему данные трансформатора, он выберет тип.",
  how: "Найдите в помощнике загрузку skill и отправьте zip. Дальше просто отправьте данные трансформатора. Если какой-то параметр непонятен, он спросит.",
  dl: "Скачать skill",
  cli: "Если хотите запускать сами",
  cliBody:
    "Внутри skill командная утилита oltc с той же логикой подбора, что и на сайте. Она не выдумывает типы. Нет в брошюре, значит нет.",
  install: "Установка",
  run: "Пример под нагрузкой",
  say: "Дальше просто пишите, как в чате",
  sayBody:
    "Подбери РПН: 25 МВА, 110±8×1.25%/10.5 кВ, Dyn11, регулирование в нейтрали ВН, вакуум.",
  sayBody2:
    "Подбери для трансформатора с РПН и ПБВ: 110 кВ, под нагрузкой ±8×1.25%, без нагрузки 5 ступеней, 350 А, регулирование в нейтрали ВН.",
  sayResult2:
    "Получается два типа: CV2III-350Y/72.5-10193W (РПН) и WSLIV-600Y/72.5-6x5A (ПБВ).",
  copy: "Копировать",
  copied: "Скопировано",
  limit: "Перед OS или закупкой нужно подтверждение инженера.",
};

const ALL: Record<Lang, AgentGuideCopy> = { zh, en, vi, es, tr, ru };

export function agentGuide(lang: Lang): AgentGuideCopy {
  return ALL[lang] ?? zh;
}
