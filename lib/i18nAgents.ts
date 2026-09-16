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
  lead: "下载技能包，传给你在用的 AI 助手。把变压器参数发给它，它选型号。",
  how: "在助手里找上传技能的入口，WorkBuddy 里叫 Upload skill，别的助手也有类似的导入。把 zip 传进去就行。机器上要有 Node，技能会自己装好 oltc 命令，不用你动手。之后把变压器参数直接发给它，铭牌上那种写法它就看得懂，会自己算电流、对照样本册。样本册里没有的型号出不来，包里也没有报价。",
  dl: "下载技能包",
  cli: "想自己跑命令",
  cliBody:
    "技能背后是个命令行工具 oltc，同一套选型逻辑。装上它，把电流、电压喂给它，再对照样本册。它不编型号，样本册里没有的就是没有。",
  install: "安装",
  run: "有载例子",
  runNote:
    "无载加 --octc。组合式加 --structure combined。--iu 是最大通过电流 Imax，直接填，别再乘安全系数。",
  say: "然后就像聊天一样，把参数发给它",
  sayBody:
    "帮我选个有载开关：25 MVA，110±8×1.25%/10.5 kV，Dyn11，高压侧中性点调压，要真空。",
  copy: "复制",
  copied: "已复制",
  limit: "出 OS 或采购前，要工程确认。这是私人辅助，不是厂家工具。",
};

const en: AgentGuideCopy = {
  back: "Selector",
  title: "Let an AI assistant pick the type",
  lead: "Download the skill pack and upload it to the AI assistant you already use. Send it the transformer data, it picks the type.",
  how: "Find the skill upload entry in your assistant. In WorkBuddy it is called Upload skill; other assistants have a similar import. Send the zip in. Node needs to be on the machine, and the skill installs the oltc command by itself. Then send the transformer data as written on the nameplate. It does the current math itself and checks the brochure: a type missing from the brochure does not come out, and the pack has no prices.",
  dl: "Download the skill pack",
  cli: "Want to run it yourself",
  cliBody:
    "Behind the skill is a small command line tool, oltc, with the same selection logic. Install it, feed it the current and voltage, then check the brochure. It never invents a type. Not in the brochure means it does not exist.",
  install: "Install",
  run: "On-load example",
  runNote:
    "Off-circuit: add --octc. Combined: add --structure combined. --iu is the max through-current Imax. Enter it as is, no safety factor.",
  say: "Then pick a type by chatting",
  sayBody:
    "Pick an on-load tap-changer for me: 25 MVA, 110±8×1.25%/10.5 kV, Dyn11, taps at the HV neutral, vacuum.",
  copy: "Copy",
  copied: "Copied",
  limit:
    "Get engineering sign-off before an OS or a purchase. This is a private helper, not a factory tool.",
};

const vi: AgentGuideCopy = {
  back: "Chọn kiểu",
  title: "Để trợ lý AI chọn kiểu giúp bạn",
  lead: "Tải gói skill, tải lên trợ lý AI bạn đang dùng. Gửi số liệu máy biến áp cho nó, nó chọn kiểu.",
  how: "Tìm mục tải skill trong trợ lý: trong WorkBuddy là Upload skill, trợ lý khác có mục nhập tương tự. Gửi file zip vào. Máy phải có Node, skill tự cài lệnh oltc, bạn không cần làm gì. Sau đó cứ gửi số liệu máy biến áp như ghi trên nhãn máy. Nó tự tính dòng và đối catalogue: kiểu không có trong catalogue thì không ra, gói không kèm giá.",
  dl: "Tải gói skill",
  cli: "Muốn tự chạy lệnh",
  cliBody:
    "Phía sau skill là công cụ dòng lệnh oltc, cùng một logic chọn. Cài nó, đưa dòng điện và điện áp vào, rồi đối catalogue. Nó không bịa kiểu. Không có trong catalogue nghĩa là không có.",
  install: "Cài đặt",
  run: "Ví dụ có tải",
  runNote:
    "Không tải: thêm --octc. Kiểu kết hợp: thêm --structure combined. --iu là dòng xuyên lớn nhất Imax, điền đúng số đó, đừng nhân hệ số an toàn.",
  say: "Rồi chọn kiểu như chat bình thường",
  sayBody:
    "Chọn giúp tôi bộ chuyển nấc có tải: 25 MVA, 110±8×1.25%/10.5 kV, Dyn11, điều áp ở trung tính cao áp, chân không.",
  copy: "Chép",
  copied: "Đã chép",
  limit:
    "Trước OS hoặc mua hàng cần kỹ sư xác nhận. Đây là trợ lý cá nhân, không phải công cụ của hãng.",
};

const es: AgentGuideCopy = {
  back: "Selector",
  title: "Que un asistente de IA elija el tipo",
  lead: "Descargue el skill y súbalo al asistente de IA que ya usa. Envíele los datos del transformador y él elige el tipo.",
  how: "Busque la opción de subir skills en su asistente: en WorkBuddy se llama Upload skill; otros asistentes tienen una importación parecida. Envíe el zip. El equipo necesita Node y el skill instala el comando oltc por sí solo. Luego envíe los datos del transformador tal como figuran en la placa. Él hace las cuentas de corriente y comprueba el catálogo: lo que no está en el catálogo no existe y el paquete no trae precios.",
  dl: "Descargar el skill",
  cli: "Si quiere ejecutarlo usted mismo",
  cliBody:
    "Detrás del skill hay una herramienta de línea de comandos, oltc, con la misma lógica de selección. Instálela, pásle la corriente y la tensión y compruebe el folleto. No inventa tipos. Si no está en el folleto, no existe.",
  install: "Instalar",
  run: "Ejemplo en carga",
  runNote:
    "Sin carga: añada --octc. Combinado: añada --structure combined. --iu es la corriente máxima Imax. Escríbala tal cual, sin factor de seguridad.",
  say: "Luego elija charlando",
  sayBody:
    "Elíjame un cambiador en carga: 25 MVA, 110±8×1.25%/10.5 kV, Dyn11, regulación en el neutro de AT, vacío.",
  copy: "Copiar",
  copied: "Copiado",
  limit:
    "Antes de un OS o una compra, confírmelo con ingeniería. Es una ayuda privada, no una herramienta de fábrica.",
};

const tr: AgentGuideCopy = {
  back: "Seçici",
  title: "Tipi bir AI asistan seçsin",
  lead: "Skill paketini indirip kullandığınız AI asistana yükleyin. Trafo verilerini gönderin, o tipi seçsin.",
  how: "Asistanınızda skill yükleme girişini bulun: WorkBuddy'de buna Upload skill denir, diğer asistanlarda benzer bir içe aktarma vardır. Zip'i gönderin. Makinede Node olmalı; skill oltc komutunu kendisi kurar, size iş düşmez. Sonra trafo verilerini etiketinde yazdığı gibi gönderin. Akım hesabını kendisi yapar, katalogla kontrol eder: katalogda olmayan tip çıkmaz, pakette fiyat yok.",
  dl: "Skill paketini indir",
  cli: "Kendiniz çalıştırmak isterseniz",
  cliBody:
    "Skill'in arkasında aynı seçim mantığına sahip bir komut satırı aracı var: oltc. Kurun, akımı ve gerilimi verin, broşürle kontrol edin. Tip uydurmaz. Broşürde yoksa yoktur.",
  install: "Kurulum",
  run: "Yük altında örnek",
  runNote:
    "Yüksüz: --octc ekleyin. Kombine: --structure combined ekleyin. --iu, maksimum geçiş akımı Imax'tir. Olduğu gibi girin, emniyet katsayısı eklemeyin.",
  say: "Sonra sohbet eder gibi seçin",
  sayBody:
    "Bana yük altında kademe değiştirici seç: 25 MVA, 110±8×1.25%/10.5 kV, Dyn11, YG tarafı yıldız noktasından ayar, vakum.",
  copy: "Kopyala",
  copied: "Kopyalandı",
  limit:
    "OS veya satın almadan önce mühendis onayı alın. Bu özel bir yardımcı, fabrika aracı değil.",
};

const ru: AgentGuideCopy = {
  back: "Подбор",
  title: "Пусть ИИ-помощник подберёт тип",
  lead: "Скачайте skill и загрузите его в ИИ-помощника, которым пользуетесь. Отправьте ему данные трансформатора, он выберет тип.",
  how: "Найдите в помощнике загрузку skill: в WorkBuddy это Upload skill, у других есть похожий импорт. Отправьте zip. На машине должен быть Node, команду oltc skill поставит сам. Дальше просто отправьте данные трансформатора, как написано на шильдике. Ток он посчитает сам и сверит с каталогом: типов вне каталога не будет, цен в пакете нет.",
  dl: "Скачать skill",
  cli: "Если хотите запускать сами",
  cliBody:
    "Внутри skill командная утилита oltc с той же логикой подбора. Установите её, передайте ток и напряжение, затем сверьте с брошюрой. Она не выдумывает типы. Нет в брошюре, значит нет.",
  install: "Установка",
  run: "Пример под нагрузкой",
  runNote:
    "Без нагрузки: добавьте --octc. Комбинированный: добавьте --structure combined. --iu это максимальный сквозной ток Imax. Вводите как есть, без коэффициента запаса.",
  say: "Дальше просто пишите, как в чате",
  sayBody:
    "Подбери РПН: 25 МВА, 110±8×1.25%/10.5 кВ, Dyn11, регулирование в нейтрали ВН, вакуум.",
  copy: "Копировать",
  copied: "Скопировано",
  limit:
    "Перед OS или закупкой нужно подтверждение инженера. Это частный помощник, не инструмент завода.",
};

const ALL: Record<Lang, AgentGuideCopy> = { zh, en, vi, es, tr, ru };

export function agentGuide(lang: Lang): AgentGuideCopy {
  return ALL[lang] ?? zh;
}
