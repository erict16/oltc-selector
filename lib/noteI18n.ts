import type { Lang } from "./i18n";

/**
 * Engine and duty notes are written in Chinese and English. The other UI
 * languages translate the English text by template here, so the engine keeps
 * one source per note. A note with no template stays in English.
 */
type Tr = Record<"vi" | "es" | "tr" | "id", string>;
type Rule = [RegExp, (m: RegExpMatchArray) => Tr];

/** Mounting + arc medium words in the engine's no-result lines (limitScope). */
const SCOPE: Record<string, Tr> = {
  "in-tank vacuum": { vi: "chân không trong thùng", es: "de vacío en cuba", tr: "tank içi vakum", id: "vakum dalam tangki" },
  "in-tank oil": { vi: "dầu trong thùng", es: "en aceite en cuba", tr: "tank içi yağlı", id: "minyak dalam tangki" },
  "on-tank vacuum": { vi: "chân không ngoài thùng", es: "de vacío fuera de cuba", tr: "tank dışı vakum", id: "vakum luar tangki" },
  "on-tank oil": { vi: "dầu ngoài thùng", es: "en aceite fuera de cuba", tr: "tank dışı yağlı", id: "minyak luar tangki" },
  "in-tank": { vi: "trong thùng", es: "en cuba", tr: "tank içi", id: "dalam tangki" },
  "on-tank": { vi: "ngoài thùng", es: "fuera de cuba", tr: "tank dışı", id: "luar tangki" },
  "dry-type": { vi: "kiểu khô", es: "de tipo seco", tr: "kuru tip", id: "tipe kering" },
  reactor: { vi: "kiểu điện kháng", es: "de reactancia", tr: "reaktör tipi", id: "tipe reaktor" },
  OCTC: { vi: "không tải (OCTC)", es: "sin carga (OCTC)", tr: "yüksüz (OCTC)", id: "tanpa beban (OCTC)" },
};
const SCOPE_RE = Object.keys(SCOPE)
  .sort((a, b) => b.length - a.length)
  .join("|");
const sc = (en: string) => SCOPE[en];

const RULES: Rule[] = [
  // Engine cautions
  [
    /^Duty ([\d.]+) A is ([\d.]+)% above the (\d+) A rating \(1% commercial tolerance\)\. Confirm with engineering\.$/,
    (m) => ({
      vi: `Dòng yêu cầu ${m[1]} A vượt định mức ${m[3]} A ${m[2]}% (dung sai thương mại 1%). Cần kỹ thuật xác nhận.`,
      es: `La corriente de ${m[1]} A supera en ${m[2]}% la nominal de ${m[3]} A (tolerancia comercial del 1%). Debe confirmarlo ingeniería.`,
      tr: `${m[1]} A ihtiyaç, ${m[3]} A anma akımını %${m[2]} aşıyor (%1 ticari tolerans). Mühendislik onaylamalı.`,
      id: `Arus ${m[1]} A melebihi rating ${m[3]} A sebesar ${m[2]}% (toleransi komersial 1%). Harus dikonfirmasi bagian teknik.`,
    }),
  ],
  [
    /^Step voltage not given: step-voltage and step-capacity limits were not checked\.$/,
    () => ({
      vi: "Chưa cho điện áp nấc: chưa kiểm tra giới hạn điện áp nấc và công suất nấc.",
      es: "Sin tensión de escalón: no se comprobaron los límites de tensión ni de potencia de escalón.",
      tr: "Kademe gerilimi verilmedi: kademe gerilimi ve kademe gücü sınırları kontrol edilmedi.",
      id: "Tegangan tap tidak diberikan: batas tegangan tap dan daya tap tidak diperiksa.",
    }),
  ],
  [
    /^Tap code (\S+) is not a brochure Fig\. 3-3 diagram\. Engineering must confirm the connection\.$/,
    (m) => ({
      vi: `Mã nấc ${m[1]} không thuộc sơ đồ chuẩn Hình 3-3 của catalogue. Kỹ thuật phải xác nhận cách đấu.`,
      es: `El código de tomas ${m[1]} no es un esquema de la Fig. 3-3 del catálogo. Ingeniería debe confirmar la conexión.`,
      tr: `${m[1]} kademe kodu katalog Şekil 3-3 şemalarından biri değil. Bağlantıyı mühendislik onaylamalı.`,
      id: `Kode tap ${m[1]} bukan diagram Gbr. 3-3 katalog. Bagian teknik harus mengonfirmasi sambungannya.`,
    }),
  ],
  [
    /^Selector grade raised from (\S+) to (\S+) \(Um ([\d.]+) kV \/ across-tap stress\)\.$/,
    (m) => ({
      vi: `Cấp bộ chọn nấc nâng từ ${m[1]} lên ${m[2]} (Um ${m[3]} kV hoặc cách điện giữa các nấc).`,
      es: `Grado del selector elevado de ${m[1]} a ${m[2]} (Um ${m[3]} kV o aislamiento entre tomas).`,
      tr: `Seçici sınıfı ${m[1]}'den ${m[2]}'ye yükseltildi (Um ${m[3]} kV veya kademeler arası yalıtım).`,
      id: `Kelas selektor dinaikkan dari ${m[1]} ke ${m[2]} (Um ${m[3]} kV atau isolasi antar-tap).`,
    }),
  ],
  [
    /^(\S+) across-tap withstand is not in the catalogue data: across-tap stress not checked\.$/,
    (m) => ({
      vi: `Khả năng chịu đựng giữa các nấc của ${m[1]} không có trong catalogue: chưa kiểm tra cách điện giữa các nấc.`,
      es: `La rigidez entre tomas de ${m[1]} no figura en el catálogo: no se comprobó el aislamiento entre tomas.`,
      tr: `${m[1]} için kademeler arası dayanım katalogda yok: kademeler arası yalıtım kontrol edilmedi.`,
      id: `Ketahanan antar-tap ${m[1]} tidak ada di data katalog: isolasi antar-tap tidak diperiksa.`,
    }),
  ],
  // Duty notes (lib/transformer.ts)
  [
    /^35 kV-class neutral sized at Um 40\.5; many orders \(Russia, Turkey\) bought 72\.5\. The OS decides\.$/,
    () => ({
      vi: "Trung tính cấp 35 kV chọn theo Um 40.5; nhiều đơn hàng (Nga, Thổ Nhĩ Kỳ) mua 72.5. Theo OS.",
      es: "Neutro de clase 35 kV dimensionado a Um 40.5; muchos pedidos (Rusia, Turquía) compraron 72.5. Decide la OS.",
      tr: "35 kV sınıfı nötr Um 40.5 ile seçildi; birçok sipariş (Rusya, Türkiye) 72.5 aldı. OS belirler.",
      id: "Netral kelas 35 kV dipilih pada Um 40.5; banyak pesanan (Rusia, Turki) membeli 72.5. OS yang menentukan.",
    }),
  ],
  [
    /^Neutral insulation not given: sized at Um ([\d.]+); the OS decides\.$/,
    (m) => ({
      vi: `Chưa cho cách điện trung tính: tạm chọn theo Um ${m[1]}, theo OS.`,
      es: `Aislamiento del neutro no indicado: dimensionado a Um ${m[1]}; decide la OS.`,
      tr: `Nötr yalıtımı verilmedi: Um ${m[1]} ile seçildi; OS belirler.`,
      id: `Isolasi netral tidak diberikan: dipilih pada Um ${m[1]}; OS yang menentukan.`,
    }),
  ],
  [
    /^HMR 230\/121 kV orders used Um 170 on the maker's data\.$/,
    () => ({
      vi: "Các đơn HMR 230/121 kV dùng Um 170 theo số liệu của nhà sản xuất máy biến áp.",
      es: "Los pedidos HMR de 230/121 kV usaron Um 170 según los datos del fabricante.",
      tr: "HMR 230/121 kV siparişleri üretici verisine göre Um 170 kullandı.",
      id: "Pesanan HMR 230/121 kV memakai Um 170 sesuai data pabrikan.",
    }),
  ],
  [
    /^Precedent: (.+) \((\d+ \w+ \d{4})\)\.$/,
    (m) => ({
      vi: `Tiền lệ: ${m[1]} (${m[2]}).`,
      es: `Precedente: ${m[1]} (${m[2]}).`,
      tr: `Emsal: ${m[1]} (${m[2]}).`,
      id: `Preseden: ${m[1]} (${m[2]}).`,
    }),
  ],
  [
    /^Not checked: impulse across the tap winding \(a\), tie-in resistor\.$/,
    () => ({
      vi: "Chưa kiểm tra: xung qua cuộn điều chỉnh (a), điện trở nối.",
      es: "Sin comprobar: impulso a través del devanado de regulación (a), resistencia de enlace.",
      tr: "Kontrol edilmedi: kademe sargısı boyunca darbe (a), bağlantı direnci.",
      id: "Belum diperiksa: impuls melintasi belitan tap (a), resistor pengikat.",
    }),
  ],
  // Engine errors
  [
    /^Enter rated through-current \(A\)\.$/,
    () => ({
      vi: "Nhập dòng điện định mức (A).",
      es: "Introduzca la corriente nominal (A).",
      tr: "Anma akımını girin (A).",
      id: "Masukkan arus pengenal (A).",
    }),
  ],
  [
    /^Enter highest voltage for equipment Um \(kV\)\.$/,
    () => ({
      vi: "Nhập điện áp cao nhất của thiết bị Um (kV).",
      es: "Introduzca la tensión más elevada del equipo Um (kV).",
      tr: "En yüksek donanım gerilimi Um'yi girin (kV).",
      id: "Masukkan tegangan tertinggi peralatan Um (kV).",
    }),
  ],
  [
    /^Step voltage must be a number ≥ 0 \(0 = not given\)\.$/,
    () => ({
      vi: "Điện áp nấc phải là số ≥ 0 (0 = chưa cho).",
      es: "La tensión de escalón debe ser un número ≥ 0 (0 = sin dato).",
      tr: "Kademe gerilimi ≥ 0 bir sayı olmalı (0 = verilmedi).",
      id: "Tegangan tap harus angka ≥ 0 (0 = tidak diberikan).",
    }),
  ],
  [
    /^Earth insulation LI (\S+) \/ PF (\S+) kV is above every catalogue Um\. Contact engineering\.$/,
    (m) => ({
      vi: `Cách điện với đất xung sét ${m[1]} / tần số công nghiệp ${m[2]} kV vượt mọi cấp Um trong catalogue. Liên hệ kỹ thuật.`,
      es: `El aislamiento a tierra rayo ${m[1]} / frecuencia industrial ${m[2]} kV supera todas las Um del catálogo. Contacte con ingeniería.`,
      tr: `Toprağa yalıtım yıldırım ${m[1]} / şebeke frekansı ${m[2]} kV tüm katalog Um değerlerinin üzerinde. Mühendislikle görüşün.`,
      id: `Isolasi ke tanah impuls ${m[1]} / frekuensi daya ${m[2]} kV di atas semua Um katalog. Hubungi bagian teknik.`,
    }),
  ],
  [
    /^Autotransformers take combined types only: compound types \(CV\/CV2\/SV\) stop at 200 kV across the tap winding\.$/,
    () => ({
      vi: "Máy biến áp tự ngẫu chỉ dùng kiểu tổ hợp: kiểu phức hợp (CV/CV2/SV) chỉ chịu 200 kV qua cuộn điều chỉnh.",
      es: "Los autotransformadores solo admiten tipos combinados: los compuestos (CV/CV2/SV) llegan a 200 kV a través del devanado de regulación.",
      tr: "Ototransformatörler yalnızca kombine tip alır: kompakt tipler (CV/CV2/SV) kademe sargısı boyunca 200 kV ile sınırlı.",
      id: "Autotransformator hanya memakai tipe kombinasi: tipe kompon (CV/CV2/SV) terbatas 200 kV melintasi belitan tap.",
    }),
  ],
  [
    /^Tapped windings of 220 kV class and above take combined types only: compound types \(CV\/CV2\/SV\) stop at 200 kV across the tap winding\.$/,
    () => ({
      vi: "Cuộn điều áp cấp 220 kV trở lên chỉ dùng kiểu tổ hợp: kiểu phức hợp (CV/CV2/SV) chỉ chịu 200 kV qua cuộn điều chỉnh.",
      es: "Los devanados regulados de clase 220 kV o más solo admiten tipos combinados: los compuestos (CV/CV2/SV) llegan a 200 kV a través del devanado de regulación.",
      tr: "220 kV sınıfı ve üzeri kademeli sargılar yalnızca kombine tip alır: kompakt tipler (CV/CV2/SV) kademe sargısı boyunca 200 kV ile sınırlı.",
      id: "Belitan bertap kelas 220 kV ke atas hanya memakai tipe kombinasi: tipe kompon (CV/CV2/SV) terbatas 200 kV melintasi belitan tap.",
    }),
  ],
  [
    /^220 kV-class tapped winding: combined types only \(no compound in 2025–2026 orders\)\.$/,
    () => ({
      vi: "Cuộn điều áp cấp 220 kV: chỉ kiểu tổ hợp (đơn hàng 2025–2026 không có kiểu phức hợp).",
      es: "Devanado regulado de clase 220 kV: solo tipos combinados (ningún compuesto en pedidos 2025–2026).",
      tr: "220 kV sınıfı kademeli sargı: yalnızca kombine tip (2025–2026 siparişlerinde kompakt tip yok).",
      id: "Belitan bertap kelas 220 kV: hanya tipe kombinasi (tidak ada tipe kompon di pesanan 2025–2026).",
    }),
  ],
  [
    /^Needs Huaming technical review: (.+)\.$/,
    (m) => ({
      vi: `Cần Huaming xét duyệt kỹ thuật riêng: ${m[1]}.`,
      es: `Requiere revisión técnica de Huaming: ${m[1]}.`,
      tr: `Huaming teknik incelemesi gerekli: ${m[1]}.`,
      id: `Perlu tinjauan teknis Huaming: ${m[1]}.`,
    }),
  ],
  [
    /^Change-over selector above 110 kV: check the recovery voltage and quote the tie-in resistor as an option \(maker's Cw\/Ce needed\)\.$/,
    () => ({
      vi: "Bộ chọn đảo chiều trên 110 kV: kiểm tra điện áp phục hồi, chào điện trở ghim thế như tùy chọn (cần Cw/Ce của nhà sản xuất máy biến áp).",
      es: "Preselector por encima de 110 kV: compruebe la tensión de recuperación y ofrezca la resistencia de fijación de potencial como opción (Cw/Ce del fabricante).",
      tr: "110 kV üzeri ön seçici: geri dönüş gerilimini kontrol edin, potansiyel bağlama direncini opsiyon olarak teklif edin (üreticinin Cw/Ce değerleri gerekli).",
      id: "Pemilih pembalik di atas 110 kV: periksa tegangan pulih, tawarkan resistor pengikat potensial sebagai opsi (perlu Cw/Ce dari pabrikan trafo).",
    }),
  ],
  [
    /^Stated Um ([\d.]+) is below the system class Um ([\d.]+) at this point\. Check the OS\.$/,
    (m) => ({
      vi: `Um đã chọn ${m[1]} thấp hơn cấp hệ thống Um ${m[2]} tại điểm này. Kiểm tra OS.`,
      es: `La Um indicada ${m[1]} está por debajo de la clase del sistema Um ${m[2]} en este punto. Revise la OS.`,
      tr: `Belirtilen Um ${m[1]}, bu noktadaki sistem sınıfı Um ${m[2]} değerinin altında. OS'u kontrol edin.`,
      id: `Um yang disebut ${m[1]} di bawah kelas sistem Um ${m[2]} di titik ini. Periksa OS.`,
    }),
  ],
  [
    /^No (OCTC|OLTC) family matches this mounting \/ medium combination\. Adjust filters or contact engineering\.$/,
    (m) => ({
      vi: `Không có dòng ${m[1]} nào khớp vị trí lắp đặt / môi chất này. Đổi điều kiện hoặc liên hệ kỹ thuật.`,
      es: `Ninguna familia ${m[1]} coincide con este montaje / medio. Ajuste los filtros o contacte con ingeniería.`,
      tr: `Bu montaj / ortam kombinasyonuna uyan ${m[1]} serisi yok. Filtreleri değiştirin veya mühendislikle görüşün.`,
      id: `Tidak ada keluarga ${m[1]} yang cocok dengan pemasangan / media ini. Ubah filter atau hubungi bagian teknik.`,
    }),
  ],
  [
    /^Across-tap insulation is above every selector grade that fits this duty\. Contact engineering\.$/,
    () => ({
      vi: "Cách điện giữa các nấc vượt mọi cấp bộ chọn nấc phù hợp. Liên hệ kỹ thuật.",
      es: "El aislamiento entre tomas supera todos los grados de selector válidos para este servicio. Contacte con ingeniería.",
      tr: "Kademeler arası yalıtım bu göreve uyan tüm seçici sınıflarının üzerinde. Mühendislikle görüşün.",
      id: "Isolasi antar-tap di atas semua kelas selektor yang sesuai. Hubungi bagian teknik.",
    }),
  ],
  [
    /^Parameters out of catalogue range \(current, Um, step voltage, or positions\)\.$/,
    () => ({
      vi: "Thông số vượt phạm vi catalogue (dòng điện, Um, điện áp nấc hoặc số nấc).",
      es: "Parámetros fuera del catálogo (corriente, Um, tensión de escalón o posiciones).",
      tr: "Parametreler katalog aralığı dışında (akım, Um, kademe gerilimi veya kademe sayısı).",
      id: "Parameter di luar rentang katalog (arus, Um, tegangan tap, atau jumlah posisi).",
    }),
  ],
  // No-result lines: one limit blocks every family (engine everyFamilyLine)
  [
    new RegExp(`^Um ([\\d.]+) kV is above the highest (${SCOPE_RE}) class \\(([\\d.]+) kV, (\\S+)\\)\\.$`),
    (m) => ({
      vi: `Um ${m[1]} kV vượt cấp cao nhất loại ${sc(m[2]).vi} (${m[3]} kV, ${m[4]}).`,
      es: `Um ${m[1]} kV supera la clase más alta ${sc(m[2]).es} (${m[3]} kV, ${m[4]}).`,
      tr: `Um ${m[1]} kV, en yüksek ${sc(m[2]).tr} sınıfının üzerinde (${m[3]} kV, ${m[4]}).`,
      id: `Um ${m[1]} kV di atas kelas ${sc(m[2]).id} tertinggi (${m[3]} kV, ${m[4]}).`,
    }),
  ],
  [
    new RegExp(`^Through-current ([\\d.]+) A is above the largest (${SCOPE_RE}) rating \\(([\\d.]+) A, (\\S+)\\)\\.$`),
    (m) => ({
      vi: `Dòng điện ${m[1]} A vượt định mức lớn nhất loại ${sc(m[2]).vi} (${m[3]} A, ${m[4]}).`,
      es: `La corriente de ${m[1]} A supera la mayor nominal ${sc(m[2]).es} (${m[3]} A, ${m[4]}).`,
      tr: `${m[1]} A akım, en büyük ${sc(m[2]).tr} anma değerinin üzerinde (${m[3]} A, ${m[4]}).`,
      id: `Arus ${m[1]} A di atas rating ${sc(m[2]).id} terbesar (${m[3]} A, ${m[4]}).`,
    }),
  ],
  [
    new RegExp(`^(\\d+) positions are above every (${SCOPE_RE}) family \\(max (\\d+), (\\S+)\\)\\.$`),
    (m) => ({
      vi: `${m[1]} vị trí vượt mọi dòng ${sc(m[2]).vi} (tối đa ${m[3]}, ${m[4]}).`,
      es: `${m[1]} posiciones superan todas las familias ${sc(m[2]).es} (máx. ${m[3]}, ${m[4]}).`,
      tr: `${m[1]} kademe, tüm ${sc(m[2]).tr} serilerinin üzerinde (en fazla ${m[3]}, ${m[4]}).`,
      id: `${m[1]} posisi di atas semua keluarga ${sc(m[2]).id} (maks. ${m[3]}, ${m[4]}).`,
    }),
  ],
  [
    new RegExp(`^Step voltage (\\d+) V is above every (${SCOPE_RE}) family at pitch (\\d+) \\(max (\\d+) V, (\\S+)\\)\\.$`),
    (m) => ({
      vi: `Điện áp nấc ${m[1]} V vượt mọi dòng ${sc(m[2]).vi} ở ${m[3]} tiếp điểm (tối đa ${m[4]} V, ${m[5]}).`,
      es: `La tensión de escalón de ${m[1]} V supera todas las familias ${sc(m[2]).es} con ${m[3]} contactos (máx. ${m[4]} V, ${m[5]}).`,
      tr: `${m[1]} V kademe gerilimi, ${m[3]} kontakta tüm ${sc(m[2]).tr} serilerinin üzerinde (en fazla ${m[4]} V, ${m[5]}).`,
      id: `Tegangan tap ${m[1]} V di atas semua keluarga ${sc(m[2]).id} pada ${m[3]} kontak (maks. ${m[4]} V, ${m[5]}).`,
    }),
  ],
  [
    new RegExp(`^Step capacity (\\d+) kVA is above every (${SCOPE_RE}) family at pitch (\\d+) \\(max (\\d+) kVA, (\\S+)\\)\\.$`),
    (m) => ({
      vi: `Công suất nấc ${m[1]} kVA vượt mọi dòng ${sc(m[2]).vi} ở ${m[3]} tiếp điểm (tối đa ${m[4]} kVA, ${m[5]}).`,
      es: `La potencia de escalón de ${m[1]} kVA supera todas las familias ${sc(m[2]).es} con ${m[3]} contactos (máx. ${m[4]} kVA, ${m[5]}).`,
      tr: `${m[1]} kVA kademe gücü, ${m[3]} kontakta tüm ${sc(m[2]).tr} serilerinin üzerinde (en fazla ${m[4]} kVA, ${m[5]}).`,
      id: `Daya tap ${m[1]} kVA di atas semua keluarga ${sc(m[2]).id} pada ${m[3]} kontak (maks. ${m[4]} kVA, ${m[5]}).`,
    }),
  ],
  // No-result lines: one family's own limit (engine familyLine)
  [
    /^(\S+): Um ([\d.]+) kV is above its ([\d.]+) kV\.$/,
    (m) => ({
      vi: `${m[1]}: Um ${m[2]} kV vượt mức ${m[3]} kV của nó.`,
      es: `${m[1]}: Um ${m[2]} kV supera su máximo de ${m[3]} kV.`,
      tr: `${m[1]}: Um ${m[2]} kV, ${m[3]} kV sınırının üzerinde.`,
      id: `${m[1]}: Um ${m[2]} kV di atas batasnya ${m[3]} kV.`,
    }),
  ],
  [
    /^(\S+): through-current ([\d.]+) A is above its ([\d.]+) A\.$/,
    (m) => ({
      vi: `${m[1]}: dòng điện ${m[2]} A vượt định mức ${m[3]} A của nó.`,
      es: `${m[1]}: la corriente de ${m[2]} A supera su nominal de ${m[3]} A.`,
      tr: `${m[1]}: ${m[2]} A akım, ${m[3]} A anma değerinin üzerinde.`,
      id: `${m[1]}: arus ${m[2]} A di atas rating-nya ${m[3]} A.`,
    }),
  ],
  [
    /^(\S+): (\d+) positions are above its (\d+)\.$/,
    (m) => ({
      vi: `${m[1]}: ${m[2]} vị trí vượt mức tối đa ${m[3]} của nó.`,
      es: `${m[1]}: ${m[2]} posiciones superan su máximo de ${m[3]}.`,
      tr: `${m[1]}: ${m[2]} kademe, en fazla ${m[3]} sınırının üzerinde.`,
      id: `${m[1]}: ${m[2]} posisi di atas batasnya ${m[3]}.`,
    }),
  ],
  [
    /^(\S+): step voltage (\d+) V is above its (\d+) V at pitch (\d+)\.$/,
    (m) => ({
      vi: `${m[1]}: điện áp nấc ${m[2]} V vượt mức ${m[3]} V của nó ở ${m[4]} tiếp điểm.`,
      es: `${m[1]}: la tensión de escalón de ${m[2]} V supera su máximo de ${m[3]} V con ${m[4]} contactos.`,
      tr: `${m[1]}: ${m[2]} V kademe gerilimi, ${m[4]} kontakta ${m[3]} V sınırının üzerinde.`,
      id: `${m[1]}: tegangan tap ${m[2]} V di atas batasnya ${m[3]} V pada ${m[4]} kontak.`,
    }),
  ],
  [
    /^(\S+): step capacity (\d+) kVA is above its (\d+) kVA at pitch (\d+)\.$/,
    (m) => ({
      vi: `${m[1]}: công suất nấc ${m[2]} kVA vượt mức ${m[3]} kVA của nó ở ${m[4]} tiếp điểm.`,
      es: `${m[1]}: la potencia de escalón de ${m[2]} kVA supera su máximo de ${m[3]} kVA con ${m[4]} contactos.`,
      tr: `${m[1]}: ${m[2]} kVA kademe gücü, ${m[4]} kontakta ${m[3]} kVA sınırının üzerinde.`,
      id: `${m[1]}: daya tap ${m[2]} kVA di atas batasnya ${m[3]} kVA pada ${m[4]} kontak.`,
    }),
  ],
  // Duty errors (lib/transformer.ts)
  [
    /^Tap position does not fit the transformer kind\.$/,
    () => ({
      vi: "Vị trí bộ ĐAPT không phù hợp loại máy biến áp.",
      es: "La posición del cambiador no corresponde al tipo de transformador.",
      tr: "Kademe değiştirici konumu transformatör tipine uymuyor.",
      id: "Letak OLTC tidak sesuai dengan jenis transformator.",
    }),
  ],
  [
    /^Enter the autotransformer's HV and MV rated voltage\.$/,
    () => ({
      vi: "Nhập điện áp định mức cao áp và trung áp của máy tự ngẫu.",
      es: "Introduzca las tensiones nominales de AT y MT del autotransformador.",
      tr: "Ototransformatörün YG ve OG anma gerilimlerini girin.",
      id: "Masukkan tegangan pengenal TT dan TM autotransformator.",
    }),
  ],
  [
    /^Autotransformer HV must be above MV\.$/,
    () => ({
      vi: "Cao áp của máy tự ngẫu phải lớn hơn trung áp.",
      es: "La AT del autotransformador debe ser mayor que la MT.",
      tr: "Ototransformatörde YG, OG'den büyük olmalı.",
      id: "TT autotransformator harus lebih tinggi dari TM.",
    }),
  ],
  [
    /^Enter the tapped winding's rated voltage\.$/,
    () => ({
      vi: "Nhập điện áp định mức của cuộn điều chỉnh.",
      es: "Introduzca la tensión nominal del devanado de regulación.",
      tr: "Kademeli sargının anma gerilimini girin.",
      id: "Masukkan tegangan pengenal belitan yang di-tap.",
    }),
  ],
  [
    /^A delta winding has no neutral; the tap changer sits at the line end\.$/,
    () => ({
      vi: "Cuộn tam giác không có trung tính; bộ ĐAPT đặt ở đầu dây.",
      es: "Un devanado en triángulo no tiene neutro; el cambiador va en el extremo de línea.",
      tr: "Üçgen sargıda nötr yoktur; kademe değiştirici hat ucundadır.",
      id: "Belitan delta tidak punya netral; OLTC dipasang di ujung saluran.",
    }),
  ],
  [
    /^Voltage above the catalogue: the highest switch class is Um 363 kV\.$/,
    () => ({
      vi: "Điện áp vượt catalogue: cấp cao nhất của bộ ĐAPT là Um 363 kV.",
      es: "Tensión por encima del catálogo: la clase más alta del cambiador es Um 363 kV.",
      tr: "Gerilim katalog üstünde: en yüksek kademe değiştirici sınıfı Um 363 kV.",
      id: "Tegangan di atas katalog: kelas OLTC tertinggi Um 363 kV.",
    }),
  ],
];

export function localizeNote(en: string, lang: Lang): string {
  if (lang !== "vi" && lang !== "es" && lang !== "tr" && lang !== "id") return en;
  for (const [re, make] of RULES) {
    const m = en.match(re);
    if (m) return make(m)[lang];
  }
  return en;
}

/** Pick the note list for the page language. */
export function notesFor(lang: Lang, zh: readonly string[], en: readonly string[]): string[] {
  return lang === "zh" ? [...zh] : en.map((e) => localizeNote(e, lang));
}
