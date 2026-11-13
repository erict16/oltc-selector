import type { Lang } from "./i18n";

export type AgentGuideCopy = {
  back: string;
  title: string;
  lead: string;
  s1t: string;
  s1b: string;
  s1prompt: string;
  npm: string;
  s2t: string;
  s2b: string;
  s2q: string;
  s3t: string;
  s3b: string;
  s3note: string;
  tagOltc: string;
  tagOctc: string;
  tagDry: string;
  more: string;
  moreLead: string;
  exDry: string;
  qDry: string;
  exShzv: string;
  qShzv: string;
  cli: string;
  cliBody: string;
  install: string;
  run: string;
  copy: string;
  copied: string;
  limit: string;
};

const zh: AgentGuideCopy = {
  back: "选型",
  title: "让 AI 助手帮你选型",
  lead: "三步：发一句话，发参数，拿型号。",
  s1t: "把这句话发给 AI 助手",
  s1b: "Claude、ChatGPT、Codex 等能运行命令的助手都可以。它会用 npm 上的 oltc-selector，不用你自己装。",
  s1prompt:
    "请用 npm 上的 oltc-selector 帮我选分接开关型号。先运行 npx -y oltc-selector@latest --help 看用法，缺的参数来问我。",
  npm: "在 npm 上查看",
  s2t: "把参数发给它",
  s2b: "像聊天一样，有什么发什么。参数不确定，它会来问你。",
  s2q: "帮我给这个一拖二的变压器选个型：110 kV，有载 ±8×1.25%，无载 5 档，350 A，高压侧中性点调压。",
  s3t: "拿到型号和理由",
  s3b: "型号都来自样本册，不编。一拖二会出有载、无载两个型号。",
  s3note: "两台都过了样本册检查，可以拿去询价。",
  tagOltc: "有载",
  tagOctc: "无载",
  tagDry: "干式",
  more: "更多选型案例",
  moreLead: "参数不一样，问法一样。",
  exDry: "干式",
  qDry: "帮我给这台干式变压器选个型：33/0.4 kV 站用变，干式，9 档线性 ±4×2.5%，真空电动有载。",
  exShzv: "3xSHZV",
  qShzv: "帮我选个有载开关：350 MVA，132±10×1.25%/11-11 kV，YNd11d11，高压侧中性点调压，最大电流 1750 A，开关对地 350/140。",
  cli: "想自己跑 CLI？",
  cliBody: "网页和命令行共用同一套选型引擎，结果一致。每次运行都会查有没有新版本，有就提示，不会自动更新。",
  install: "安装",
  run: "有载例子",
  copy: "复制",
  copied: "已复制",
  limit: "出 OS 或采购前，需要工程确认。",
};

const en: AgentGuideCopy = {
  back: "Selector",
  title: "Let an AI assistant pick the type",
  lead: "Three steps: send one line, send the data, get the type.",
  s1t: "Send this line to your AI assistant",
  s1b: "Any assistant that can run commands works: Claude, ChatGPT, Codex. It uses oltc-selector from npm; you install nothing.",
  s1prompt:
    "Use oltc-selector from npm to pick a tap-changer type for me. Run npx -y oltc-selector@latest --help first, then ask me for any missing data.",
  npm: "View on npm",
  s2t: "Send the transformer data",
  s2b: "Just chat. If a parameter is unclear, it asks.",
  s2q: "Pick one for a transformer with both on-load and off-circuit taps: 110 kV, on-load ±8×1.25%, off-circuit 5 positions, 350 A, taps at the HV neutral.",
  s3t: "Get the type and the why",
  s3b: "Every type comes from the catalogue, none invented. Dual-duty gets two type strings.",
  s3note: "Both passed the brochure check and are ready for pricing.",
  tagOltc: "on-load",
  tagOctc: "off-circuit",
  tagDry: "dry-type",
  more: "More examples",
  moreLead: "Same chat, different data.",
  exDry: "Dry-type",
  qDry: "Pick an OLTC for this dry-type transformer: 33/0.4 kV station, dry, 9 positions linear ±4×2.5%, vacuum motorised.",
  exShzv: "3xSHZV",
  qShzv: "Pick an on-load tap-changer for me: 350 MVA, 132±10×1.25%/11-11 kV, YNd11d11, taps at the HV neutral, max 1750 A, OLTC earth 350/140.",
  cli: "Prefer to run the CLI yourself?",
  cliBody: "The page and the CLI share one selection engine, so results match. Every run checks for a newer version and tells you; it never updates itself.",
  install: "Install",
  run: "On-load example",
  copy: "Copy",
  copied: "Copied",
  limit: "Get engineering sign-off before an OS or a purchase.",
};

const vi: AgentGuideCopy = {
  back: "Chọn kiểu",
  title: "Để trợ lý AI chọn kiểu giúp bạn",
  lead: "Ba bước: gửi một câu, gửi số liệu, nhận kiểu.",
  s1t: "Gửi câu này cho trợ lý AI",
  s1b: "Trợ lý nào chạy được lệnh đều dùng được: Claude, ChatGPT, Codex. Nó dùng oltc-selector trên npm; bạn không phải cài gì.",
  s1prompt:
    "Hãy dùng oltc-selector trên npm để chọn kiểu bộ điều áp cho tôi. Chạy npx -y oltc-selector@latest --help trước, thiếu thông số nào thì hỏi tôi.",
  npm: "Xem trên npm",
  s2t: "Gửi số liệu máy biến áp",
  s2b: "Cứ chat bình thường. Thông số nào không rõ, nó sẽ hỏi lại.",
  s2q: "Chọn giúp tôi cho máy biến áp vừa có tải vừa không tải: 110 kV, có tải ±8×1.25%, không tải 5 nấc, 350 A, điều áp ở trung tính cao áp.",
  s3t: "Nhận kiểu và lý do",
  s3b: "Kiểu nào cũng từ catalogue, không bịa. Máy hai hệ thống sẽ ra hai mã kiểu.",
  s3note: "Cả hai đều qua kiểm tra catalogue, có thể đem đi báo giá.",
  tagOltc: "có tải",
  tagOctc: "không tải",
  tagDry: "khô",
  more: "Thêm ví dụ chọn kiểu",
  moreLead: "Chat như cũ, số liệu khác.",
  exDry: "Máy khô",
  qDry: "Chọn giúp tôi cho máy biến áp khô: 33/0.4 kV máy trạm, khô, 9 nấc tuyến tính ±4×2.5%, chân không chạy điện.",
  exShzv: "3xSHZV",
  qShzv: "Chọn giúp tôi bộ chuyển nấc có tải: 350 MVA, 132±10×1.25%/11-11 kV, YNd11d11, điều áp ở trung tính cao áp, dòng max 1750 A, cách điện OLTC 350/140.",
  cli: "Muốn tự chạy CLI?",
  cliBody: "Trang web và CLI dùng chung một engine chọn kiểu, kết quả giống nhau. Mỗi lần chạy, CLI kiểm tra bản mới và báo cho bạn; nó không tự cập nhật.",
  install: "Cài đặt",
  run: "Ví dụ có tải",
  copy: "Chép",
  copied: "Đã chép",
  limit: "Trước OS hoặc mua hàng cần kỹ sư xác nhận.",
};

const es: AgentGuideCopy = {
  back: "Selector",
  title: "Que un asistente de IA elija el tipo",
  lead: "Tres pasos: envíe una línea, envíe los datos, reciba el tipo.",
  s1t: "Envíe esta línea a su asistente de IA",
  s1b: "Sirve cualquier asistente que ejecute comandos: Claude, ChatGPT, Codex. Usa oltc-selector desde npm; usted no instala nada.",
  s1prompt:
    "Use oltc-selector de npm para elegir un tipo de cambiador de tomas. Ejecute primero npx -y oltc-selector@latest --help y pídame los datos que falten.",
  npm: "Ver en npm",
  s2t: "Envíe los datos del transformador",
  s2b: "Como un chat. Si un parámetro no está claro, se lo preguntará.",
  s2q: "Elíjame uno para un transformador con regulación en carga y sin carga: 110 kV, en carga ±8×1.25%, sin carga 5 posiciones, 350 A, regulación en el neutro de AT.",
  s3t: "Reciba el tipo y la razón",
  s3b: "Todos los tipos vienen del catálogo, nada inventado. Un equipo doble recibe dos códigos.",
  s3note: "Ambos pasaron la revisión del catálogo y sirven para pedir precio.",
  tagOltc: "en carga",
  tagOctc: "sin carga",
  tagDry: "seco",
  more: "Más ejemplos",
  moreLead: "Mismo chat, otros datos.",
  exDry: "Seco",
  qDry: "Elíjame un cambiador para este transformador seco: estación 33/0.4 kV, seco, 9 posiciones lineales ±4×2.5%, motorizado de vacío.",
  exShzv: "3xSHZV",
  qShzv: "Elíjame un cambiador en carga: 350 MVA, 132±10×1.25%/11-11 kV, YNd11d11, regulación en el neutro de AT, 1750 A máx., aislamiento OLTC 350/140.",
  cli: "¿Prefieres ejecutar la CLI tú mismo?",
  cliBody: "La web y la CLI comparten el mismo motor de selección, los resultados coinciden. En cada ejecución la CLI comprueba si hay una versión nueva y le avisa; nunca se actualiza sola.",
  install: "Instalar",
  run: "Ejemplo en carga",
  copy: "Copiar",
  copied: "Copiado",
  limit: "Antes de un OS o una compra, confírmelo con ingeniería.",
};

const tr: AgentGuideCopy = {
  back: "Seçici",
  title: "Tipi bir AI asistan seçsin",
  lead: "Üç adım: bir satır gönderin, veriyi gönderin, tipi alın.",
  s1t: "Bu satırı AI asistanınıza gönderin",
  s1b: "Komut çalıştırabilen her asistan olur: Claude, ChatGPT, Codex. npm'deki oltc-selector'ı kullanır; siz bir şey kurmazsınız.",
  s1prompt:
    "npm'deki oltc-selector ile benim için kademe değiştirici tipi seçin. Önce npx -y oltc-selector@latest --help çalıştırın, eksik veriyi bana sorun.",
  npm: "npm'de görüntüle",
  s2t: "Trafo verilerini gönderin",
  s2b: "Sohbet gibi yazın. Emin olmadığı parametre olursa size sorar.",
  s2q: "Hem yük altında hem yüksüz kademeli bir trafo için seç: 110 kV, yük altında ±8×1.25%, yüksüz 5 kademe, 350 A, YG yıldız noktasından ayar.",
  s3t: "Tipi ve gerekçesini alın",
  s3b: "Tüm tipler katalogdan, uydurma yok. Çift görevli trafoda iki tip kodu çıkar.",
  s3note: "İkisi de katalog kontrolünden geçti, fiyat istemeye hazır.",
  tagOltc: "yük altında",
  tagOctc: "yüksüz",
  tagDry: "kuru",
  more: "Daha fazla örnek",
  moreLead: "Aynı sohbet, farklı veri.",
  exDry: "Kuru tip",
  qDry: "Kuru tipi trafo için seç: 33/0.4 kV istasyon, kuru, 9 kademe lineer ±4×2.5%, vakum motorlu.",
  exShzv: "3xSHZV",
  qShzv: "Bana yük altında kademe değiştirici seç: 350 MVA, 132±10×1.25%/11-11 kV, YNd11d11, YG yıldız noktasından ayar, max 1750 A, OLTC toprağı 350/140.",
  cli: "CLI'yi kendiniz mi çalıştırırsınız?",
  cliBody: "Web sayfası ve CLI aynı seçim motorunu paylaşır, sonuçlar aynıdır. CLI her çalıştırmada yeni sürüm olup olmadığına bakar ve haber verir; kendini güncellemez.",
  install: "Kurulum",
  run: "Yük altında örnek",
  copy: "Kopyala",
  copied: "Kopyalandı",
  limit: "OS veya satın almadan önce mühendis onayı alın.",
};

const idn: AgentGuideCopy = {
  back: "Pemilih",
  title: "Biarkan asisten AI memilih tipenya",
  lead: "Tiga langkah: kirim satu kalimat, kirim data, dapatkan tipenya.",
  s1t: "Kirim kalimat ini ke asisten AI Anda",
  s1b: "Asisten apa pun yang bisa menjalankan perintah bisa dipakai: Claude, ChatGPT, Codex. Asisten memakai oltc-selector dari npm; Anda tidak perlu memasang apa pun.",
  s1prompt:
    "Pakai oltc-selector dari npm untuk memilih tipe tap changer bagi saya. Jalankan npx -y oltc-selector@latest --help dulu, lalu tanyakan data yang kurang.",
  npm: "Lihat di npm",
  s2t: "Kirim data trafo",
  s2b: "Cukup seperti chat. Bila ada parameter yang kurang jelas, asisten akan bertanya.",
  s2q: "Pilihkan untuk trafo dengan tap berbeban dan tanpa beban: 110 kV, berbeban ±8×1.25%, tanpa beban 5 posisi, 350 A, pengaturan di titik netral sisi TT.",
  s3t: "Dapatkan tipe dan alasannya",
  s3b: "Semua tipe berasal dari katalog, tidak ada yang dikarang. Trafo dengan dua jenis tap mendapat dua kode tipe.",
  s3note: "Keduanya lolos pemeriksaan katalog dan siap untuk permintaan harga.",
  tagOltc: "berbeban",
  tagOctc: "tanpa beban",
  tagDry: "kering",
  more: "Contoh lainnya",
  moreLead: "Chat yang sama, data berbeda.",
  exDry: "Tipe kering",
  qDry: "Pilihkan OLTC untuk trafo kering ini: trafo pemakaian sendiri 33/0.4 kV, kering, 9 posisi linear ±4×2.5%, vakum bermotor.",
  exShzv: "3xSHZV",
  qShzv: "Pilihkan OLTC berbeban: 350 MVA, 132±10×1.25%/11-11 kV, YNd11d11, pengaturan di titik netral sisi TT, arus maks. 1750 A, isolasi OLTC ke tanah 350/140.",
  cli: "Ingin menjalankan CLI sendiri?",
  cliBody: "Halaman web dan CLI memakai mesin pemilihan yang sama, jadi hasilnya sama. Setiap dijalankan, CLI memeriksa versi baru dan memberi tahu Anda; CLI tidak memperbarui dirinya sendiri.",
  install: "Pasang",
  run: "Contoh berbeban",
  copy: "Salin",
  copied: "Tersalin",
  limit: "Minta persetujuan engineering sebelum OS atau pembelian.",
};

const ALL: Record<Lang, AgentGuideCopy> = { zh, en, vi, es, tr, id: idn };

export function agentGuide(lang: Lang): AgentGuideCopy {
  return ALL[lang] ?? zh;
}
