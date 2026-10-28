import type { Lang } from "./i18n";

/**
 * Engine and duty notes are written in Chinese and English. The other UI
 * languages translate the English text by template here, so the engine keeps
 * one source per note. A note with no template stays in English.
 */
type Tr = Record<"vi" | "es" | "tr" | "id", string>;
type Rule = [RegExp, (m: RegExpMatchArray) => Tr];

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
