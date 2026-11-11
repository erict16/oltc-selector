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
  // Engine cautions. The 1% over-rating note went with the tolerance
  // (2026-11-04 audit D2: IEC 60214-2 says "not less than").
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
  // 2026-11-04 r2 engine track (ENGINE-1/2/3, ORDERS-1/9)
  [
    /^Selector grade (\S+) is below the Um ([\d.]+) kV default (\S+), from the stated across-tap LI ([\d.]+) \/ AC ([\d.]+) kV\.$/,
    (m) => ({
      vi: `Cấp bộ chọn nấc ${m[1]} thấp hơn mặc định ${m[3]} của Um ${m[2]} kV, theo cách điện giữa các nấc đã cho LI ${m[4]} / AC ${m[5]} kV.`,
      es: `El grado del selector ${m[1]} está por debajo del grado por defecto ${m[3]} para Um ${m[2]} kV, según el aislamiento entre tomas indicado LI ${m[4]} / AC ${m[5]} kV.`,
      tr: `Seçici sınıfı ${m[1]}, Um ${m[2]} kV için varsayılan ${m[3]} sınıfının altında; verilen kademeler arası yalıtıma göre LI ${m[4]} / AC ${m[5]} kV.`,
      id: `Kelas selektor ${m[1]} di bawah bawaan ${m[3]} untuk Um ${m[2]} kV, berdasarkan isolasi antar-tap yang diberikan LI ${m[4]} / AC ${m[5]} kV.`,
    }),
  ],
  [
    /^Selector grade raised one step to (\S+): winding of 330 kV class or above\.$/,
    (m) => ({
      vi: `Cấp bộ chọn nấc nâng một bậc lên ${m[1]}: cuộn dây cấp 330 kV trở lên.`,
      es: `Grado del selector elevado un escalón a ${m[1]}: devanado de clase 330 kV o superior.`,
      tr: `Seçici sınıfı bir kademe ${m[1]}'ye yükseltildi: 330 kV sınıfı ve üzeri sargı.`,
      id: `Kelas selektor dinaikkan satu tingkat ke ${m[1]}: belitan kelas 330 kV ke atas.`,
    }),
  ],
  [
    /^Positions must be a whole number of at least 2\.$/,
    () => ({
      vi: "Số vị trí phải là số nguyên, ít nhất là 2.",
      es: "El número de posiciones debe ser un entero de al menos 2.",
      tr: "Kademe sayısı en az 2 olan bir tam sayı olmalı.",
      id: "Jumlah posisi harus bilangan bulat, paling sedikit 2.",
    }),
  ],
  [
    /^Contact (\S+) covers (\d+) positions; (\d+) were asked\.$/,
    (m) => ({
      vi: `Tiếp điểm ${m[1]} chỉ có ${m[2]} vị trí; yêu cầu ${m[3]}.`,
      es: `El contacto ${m[1]} cubre ${m[2]} posiciones; se pidieron ${m[3]}.`,
      tr: `${m[1]} kontağı ${m[2]} kademeyi karşılar; ${m[3]} istendi.`,
      id: `Kontak ${m[1]} mencakup ${m[2]} posisi; yang diminta ${m[3]}.`,
    }),
  ],
  [
    /^(\S+) drum OCTC is sold for star \(Y\) points only; for delta \(D\) use a cage type\.$/,
    (m) => ({
      vi: `${m[1]} kiểu trống (OCTC) chỉ bán cho điểm sao (Y); với tam giác (D) hãy dùng kiểu lồng.`,
      es: `${m[1]} de tambor (OCTC) solo se vende para puntos en estrella (Y); para triángulo (D) use un tipo de jaula.`,
      tr: `${m[1]} tambur tipi (OCTC) yalnız yıldız (Y) noktası için satılır; üçgen (D) için kafes tipi kullanın.`,
      id: `${m[1]} tipe drum (OCTC) hanya dijual untuk titik bintang (Y); untuk delta (D) gunakan tipe sangkar.`,
    }),
  ],
  // 2026-11-04 r3 engine track (ENGINE-6/7/8/10)
  [
    /^(\S+) drum OCTC is sold for star \(Y\) points only\.$/,
    (m) => ({
      vi: `${m[1]} kiểu trống (OCTC) chỉ bán cho điểm sao (Y).`,
      es: `${m[1]} de tambor (OCTC) solo se vende para puntos en estrella (Y).`,
      tr: `${m[1]} tambur tipi (OCTC) yalnız yıldız (Y) noktası için satılır.`,
      id: `${m[1]} tipe drum (OCTC) hanya dijual untuk titik bintang (Y).`,
    }),
  ],
  [
    /^No ([\d.]+) kV list row covers this duty: next class ([\d.]+) kV\.$/,
    (m) => ({
      vi: `Không có dòng ${m[1]} kV nào trong bảng giá đáp ứng chế độ này: lên cấp kế tiếp ${m[2]} kV.`,
      es: `Ninguna fila de la lista a ${m[1]} kV cubre este servicio: siguiente clase ${m[2]} kV.`,
      tr: `Listede bu görevi karşılayan ${m[1]} kV satırı yok: bir üst sınıf ${m[2]} kV.`,
      id: `Tidak ada baris daftar ${m[1]} kV yang memenuhi tugas ini: kelas berikutnya ${m[2]} kV.`,
    }),
  ],
  [
    /^Selector grade (\S+) from the stated across-tap (.+) kV \(330 kV-class step gives (\S+)\)\.$/,
    (m) => ({
      vi: `Cấp bộ chọn nấc ${m[1]} theo cách điện giữa các nấc đã cho ${m[2]} kV (bậc cấp 330 kV cho ${m[3]}).`,
      es: `Grado del selector ${m[1]} por el aislamiento entre tomas indicado ${m[2]} kV (el escalón de clase 330 kV da ${m[3]}).`,
      tr: `Seçici sınıfı ${m[1]}, verilen kademeler arası yalıtıma göre ${m[2]} kV (330 kV sınıfı adımı ${m[3]} verir).`,
      id: `Kelas selektor ${m[1]} dari isolasi antar-tap yang diberikan ${m[2]} kV (langkah kelas 330 kV memberi ${m[3]}).`,
    }),
  ],
  [
    /^Minus range ([\d.]+)% is unusually large: lowest-tap current ([\d.]+) A, check the OS\.$/,
    (m) => ({
      vi: `Dải nấc âm ${m[1]}% lớn bất thường: dòng ở nấc thấp nhất ${m[2]} A, hãy kiểm tra OS.`,
      es: `El rango negativo de ${m[1]}% es inusualmente grande: corriente en la toma más baja ${m[2]} A, revise la OS.`,
      tr: `Eksi kademe aralığı %${m[1]} alışılmadık derecede büyük: en düşük kademe akımı ${m[2]} A, OS'yi kontrol edin.`,
      id: `Rentang minus ${m[1]}% luar biasa besar: arus tap terendah ${m[2]} A, periksa OS.`,
    }),
  ],
  [
    /^Selector grade raised to (\S+): (\S+) is usual on Turkish 110 kV-class neutrals \((\S+) also fits\)\.$/,
    (m) => ({
      vi: `Cấp bộ chọn nấc nâng lên ${m[1]}: trung tính cấp 110 kV ở Thổ Nhĩ Kỳ thường dùng ${m[2]} (${m[3]} cũng đáp ứng).`,
      es: `Grado del selector elevado a ${m[1]}: en neutros de clase 110 kV en Turquía es habitual ${m[2]} (${m[3]} también sirve).`,
      tr: `Seçici sınıfı ${m[1]}'ye yükseltildi: Türkiye'de 110 kV sınıfı nötrlerde genellikle ${m[2]} kullanılır (${m[3]} de uygun).`,
      id: `Kelas selektor dinaikkan ke ${m[1]}: netral kelas 110 kV di Turki biasanya memakai ${m[2]} (${m[3]} juga memenuhi).`,
    }),
  ],
  [
    /^Minus range ≥ 100%\.$/,
    () => ({
      vi: "Dải nấc âm ≥ 100%.",
      es: "Rango negativo ≥ 100%.",
      tr: "Eksi kademe aralığı ≥ %100.",
      id: "Rentang minus ≥ 100%.",
    }),
  ],
  // Duty notes (lib/transformer.ts)
  [
    /^35 kV-class neutral sized at Um 40\.5 kV; many projects specify 72\.5; the order specification \(OS\) decides\. CM\/CM2\/SHZV start at 72\.5\.$/,
    () => ({
      vi: "Trung tính cấp 35 kV chọn theo Um 40.5 kV; nhiều dự án yêu cầu 72.5; theo quy cách đặt hàng (OS). CM/CM2/SHZV thấp nhất là 72.5.",
      es: "Neutro de clase 35 kV dimensionado a Um 40.5 kV; muchos proyectos especifican 72.5; decide la especificación de pedido (OS). CM/CM2/SHZV empiezan en 72.5.",
      tr: "35 kV sınıfı nötr Um 40.5 kV ile seçildi; birçok proje 72.5 ister; sipariş şartnamesi (OS) belirler. CM/CM2/SHZV 72.5'ten başlar.",
      id: "Netral kelas 35 kV dipilih pada Um 40.5 kV; banyak proyek meminta 72.5; spesifikasi pesanan (OS) yang menentukan. CM/CM2/SHZV mulai dari 72.5.",
    }),
  ],
  [
    /^Italy: neutral sized at the line class, Um ([\d.]+) kV \(some projects use 72\.5\); the order specification \(OS\) decides\.$/,
    (m) => ({
      vi: `Ý: trung tính chọn theo cấp đầu dây, Um ${m[1]} kV (một số dự án dùng 72.5); theo quy cách đặt hàng (OS).`,
      es: `Italia: neutro dimensionado a la clase de línea, Um ${m[1]} kV (algunos proyectos usan 72.5); decide la especificación de pedido (OS).`,
      tr: `İtalya: nötr hat sınıfına göre seçildi, Um ${m[1]} kV (bazı projeler 72.5 kullanır); sipariş şartnamesi (OS) belirler.`,
      id: `Italia: netral dipilih pada kelas saluran, Um ${m[1]} kV (sebagian proyek memakai 72.5); spesifikasi pesanan (OS) yang menentukan.`,
    }),
  ],
  [
    /^Turkey: 220 kV-class and above neutral sized at Um ([\d.]+) kV \(126 or 170 is usual, not 72\.5\); the order specification \(OS\) decides\.$/,
    (m) => ({
      vi: `Thổ Nhĩ Kỳ: trung tính cấp 220 kV trở lên chọn theo Um ${m[1]} kV (thường là 126 hoặc 170, không dùng 72.5); theo quy cách đặt hàng (OS).`,
      es: `Turquía: neutro de clase 220 kV o superior dimensionado a Um ${m[1]} kV (lo habitual es 126 o 170, no 72.5); decide la especificación de pedido (OS).`,
      tr: `Türkiye: 220 kV sınıfı ve üstü nötr Um ${m[1]} kV ile seçildi (genellikle 126 veya 170, 72.5 değil); sipariş şartnamesi (OS) belirler.`,
      id: `Turki: netral kelas 220 kV ke atas dipilih pada Um ${m[1]} kV (biasanya 126 atau 170, bukan 72.5); spesifikasi pesanan (OS) yang menentukan.`,
    }),
  ],
  [
    /^Neutral of a 400 kV-class winding sized at Um ([\d.]+) kV \(126 is usual in Turkey and Portugal; 72\.5 in Brazil at 440\/500 kV\); the order specification \(OS\) decides\.$/,
    (m) => ({
      vi: `Trung tính cuộn dây cấp 400 kV chọn theo Um ${m[1]} kV (Thổ Nhĩ Kỳ và Bồ Đào Nha thường dùng 126; Brazil 440/500 kV thường dùng 72.5); theo quy cách đặt hàng (OS).`,
      es: `Neutro de un devanado de clase 400 kV dimensionado a Um ${m[1]} kV (en Turquía y Portugal es habitual 126; en Brasil a 440/500 kV, 72.5); decide la especificación de pedido (OS).`,
      tr: `400 kV sınıfı sargının nötrü Um ${m[1]} kV ile seçildi (Türkiye ve Portekiz'de genellikle 126; Brezilya'da 440/500 kV için 72.5); sipariş şartnamesi (OS) belirler.`,
      id: `Netral belitan kelas 400 kV dipilih pada Um ${m[1]} kV (di Turki dan Portugal biasanya 126; di Brasil 440/500 kV biasanya 72.5); spesifikasi pesanan (OS) yang menentukan.`,
    }),
  ],
  [
    /^MV line lead sized at the MV class, Um ([\d.]+) kV; the order specification \(OS\) decides\.$/,
    (m) => ({
      vi: `Đầu ra trung áp chọn theo cấp trung áp, Um ${m[1]} kV; theo quy cách đặt hàng (OS).`,
      es: `Salida de MT dimensionada a la clase de MT, Um ${m[1]} kV; decide la especificación de pedido (OS).`,
      tr: `OG hat çıkışı OG sınıfına göre seçildi, Um ${m[1]} kV; sipariş şartnamesi (OS) belirler.`,
      id: `Saluran TM dipilih pada kelas TM, Um ${m[1]} kV; spesifikasi pesanan (OS) yang menentukan.`,
    }),
  ],
  [
    /^Autotransformer junction sized at the HV class, Um ([\d.]+) kV; the order specification \(OS\) decides\.$/,
    (m) => ({
      vi: `Điểm nối nối tiếp – chung của máy biến áp tự ngẫu chọn theo cấp cao áp, Um ${m[1]} kV; theo quy cách đặt hàng (OS).`,
      es: `Unión serie – común del autotransformador dimensionada a la clase de AT, Um ${m[1]} kV; decide la especificación de pedido (OS).`,
      tr: `Ototransformatörün seri – ortak bağlantısı YG sınıfına göre seçildi, Um ${m[1]} kV; sipariş şartnamesi (OS) belirler.`,
      id: `Sambungan seri – bersama autotransformator dipilih pada kelas TT, Um ${m[1]} kV; spesifikasi pesanan (OS) yang menentukan.`,
    }),
  ],
  [
    /^Variable flux: Ust and current differ per tap; Ust at the extreme tap is not checked\. Get the maker's per-tap table\.$/,
    () => ({
      vi: "Từ thông thay đổi: Ust và dòng điện khác nhau ở mỗi nấc; chưa kiểm tra Ust ở nấc cực biên. Hãy lấy bảng từng nấc của nhà sản xuất.",
      es: "Flujo variable: la Ust y la corriente cambian en cada toma; no se comprobó la Ust en la toma extrema. Pida al fabricante la tabla por toma.",
      tr: "Değişken akı: Ust ve akım her kademede farklıdır; uç kademedeki Ust kontrol edilmedi. Üreticiden kademe tablosunu isteyin.",
      id: "Fluks variabel: Ust dan arus berbeda di tiap tap; Ust di tap ekstrem tidak diperiksa. Minta tabel per tap dari pabrikan.",
    }),
  ],
  [
    /^OS Imax ([\d.]+) A is below the rated ([\d.]+) A: not used, sized on the full-range ([\d.]+) A\. Check the OS\.$/,
    (m) => ({
      vi: `Imax trong OS ${m[1]} A thấp hơn dòng định mức ${m[2]} A: không dùng, chọn theo dòng toàn dải ${m[3]} A. Kiểm tra OS.`,
      es: `La Imax de la OS, ${m[1]} A, es menor que la nominal de ${m[2]} A: no se usa, dimensionado con los ${m[3]} A de todo el rango. Revise la OS.`,
      tr: `OS Imax ${m[1]} A, ${m[2]} A anma akımının altında: kullanılmadı, tüm aralık akımı ${m[3]} A ile seçildi. OS'yi kontrol edin.`,
      id: `Imax OS ${m[1]} A di bawah arus pengenal ${m[2]} A: tidak dipakai, dipilih pada arus seluruh rentang ${m[3]} A. Periksa OS.`,
    }),
  ],
  [
    /^OS Imax ([\d.]+) A is below the full-range ([\d.]+) A: the maker caps the current below −([\d.]+)% \(maximum-current tapping\)\. Sized on the OS figure\.$/,
    (m) => ({
      vi: `Imax trong OS ${m[1]} A thấp hơn ${m[2]} A của toàn dải: nhà sản xuất giới hạn dòng dưới −${m[3]}% (nấc dòng cực đại). Chọn theo số OS.`,
      es: `La Imax de la OS, ${m[1]} A, es menor que los ${m[2]} A de todo el rango: el fabricante limita la corriente por debajo de −${m[3]}% (toma de corriente máxima). Dimensionado con el valor de la OS.`,
      tr: `OS Imax ${m[1]} A, tam aralıktaki ${m[2]} A'nın altında: üretici akımı −%${m[3]} altında sınırlıyor (maksimum akım kademesi). OS değerine göre seçildi.`,
      id: `Imax OS ${m[1]} A di bawah ${m[2]} A rentang penuh: pabrikan membatasi arus di bawah −${m[3]}% (tap arus maksimum). Dipilih pada angka OS.`,
    }),
  ],
  [
    /^OS Imax ([\d.]+) A is far above the full-range ([\d.]+) A: line current or a data error\? Sized on the OS figure\.$/,
    (m) => ({
      vi: `Imax trong OS ${m[1]} A cao hơn nhiều so với ${m[2]} A của toàn dải: dòng dây hay lỗi số liệu? Chọn theo số OS.`,
      es: `La Imax de la OS, ${m[1]} A, está muy por encima de los ${m[2]} A de todo el rango: ¿corriente de línea o error de datos? Dimensionado con el valor de la OS.`,
      tr: `OS Imax ${m[1]} A, tam aralıktaki ${m[2]} A'nın çok üstünde: hat akımı mı, veri hatası mı? OS değerine göre seçildi.`,
      id: `Imax OS ${m[1]} A jauh di atas ${m[2]} A rentang penuh: arus saluran atau salah data? Dipilih pada angka OS.`,
    }),
  ],
  [
    /^OS Ust (\d+) V is below the (\d+) V from the rating and step\. Sized on (\d+) V\.$/,
    (m) => ({
      vi: `Ust trong OS ${m[1]} V thấp hơn ${m[2]} V tính từ công suất và nấc. Chọn theo ${m[3]} V.`,
      es: `La Ust de la OS, ${m[1]} V, es menor que los ${m[2]} V de la potencia y el escalón. Dimensionado con ${m[3]} V.`,
      tr: `OS Ust ${m[1]} V, güç ve kademeden çıkan ${m[2]} V değerinin altında. ${m[3]} V ile seçildi.`,
      id: `Ust OS ${m[1]} V di bawah ${m[2]} V dari rating dan tap. Dipilih pada ${m[3]} V.`,
    }),
  ],
  [
    /^OS Ust (\d+) V looks like a line value; the physical step is (\d+) V\. Sized on the OS figure\.$/,
    (m) => ({
      vi: `Ust trong OS ${m[1]} V giống giá trị điện áp dây; điện áp nấc thực là ${m[2]} V. Chọn theo số OS.`,
      es: `La Ust de la OS, ${m[1]} V, parece un valor de línea; el escalón real es ${m[2]} V. Dimensionado con el valor de la OS.`,
      tr: `OS Ust ${m[1]} V hat değeri gibi görünüyor; gerçek kademe ${m[2]} V. OS değerine göre seçildi.`,
      id: `Ust OS ${m[1]} V tampak seperti nilai saluran; tegangan tap sebenarnya ${m[2]} V. Dipilih pada angka OS.`,
    }),
  ],
  // 2026-11-04 final ENGINE-12: the step a stated Ust implies.
  [
    /^OS Ust (\d+) V is ([\d.]+) % per step, not the ([\d.]+) % default; lowest tap sized on ([\d.]+) %\.$/,
    (m) => ({
      vi: `Ust trong OS ${m[1]} V là ${m[2]} % mỗi nấc, không phải ${m[3]} % mặc định; dòng ở nấc thấp nhất tính theo ${m[4]} %.`,
      es: `La Ust de la OS, ${m[1]} V, es ${m[2]} % por escalón, no el ${m[3]} % por defecto; la toma más baja se dimensiona con ${m[4]} %.`,
      tr: `OS Ust ${m[1]} V kademe başına %${m[2]}, varsayılan %${m[3]} değil; en düşük kademe %${m[4]} ile boyutlandırıldı.`,
      id: `Ust OS ${m[1]} V adalah ${m[2]} % per tap, bukan ${m[3]} % bawaan; tap terendah dihitung pada ${m[4]} %.`,
    }),
  ],
  [
    /^OS Ust (\d+) V is ([\d.]+) % per step, not the stated ([\d.]+) %; lowest tap sized on ([\d.]+) %\. Check the OS\.$/,
    (m) => ({
      vi: `Ust trong OS ${m[1]} V là ${m[2]} % mỗi nấc, không khớp ${m[3]} % đã cho; dòng ở nấc thấp nhất tính theo ${m[4]} %. Kiểm tra OS.`,
      es: `La Ust de la OS, ${m[1]} V, es ${m[2]} % por escalón, no el ${m[3]} % indicado; la toma más baja se dimensiona con ${m[4]} %. Revise la OS.`,
      tr: `OS Ust ${m[1]} V kademe başına %${m[2]}, belirtilen %${m[3]} değil; en düşük kademe %${m[4]} ile boyutlandırıldı. OS'yi kontrol edin.`,
      id: `Ust OS ${m[1]} V adalah ${m[2]} % per tap, bukan ${m[3]} % yang dinyatakan; tap terendah dihitung pada ${m[4]} %. Periksa OS.`,
    }),
  ],
  [
    /^Neutral insulation not given: sized at Um ([\d.]+) kV; the order specification \(OS\) decides\.$/,
    (m) => ({
      vi: `Chưa cho cách điện trung tính: tạm chọn theo Um ${m[1]} kV, theo quy cách đặt hàng (OS).`,
      es: `Aislamiento del neutro no indicado: dimensionado a Um ${m[1]} kV; decide la especificación de pedido (OS).`,
      tr: `Nötr yalıtımı verilmedi: Um ${m[1]} kV ile seçildi; sipariş şartnamesi (OS) belirler.`,
      id: `Isolasi netral tidak diberikan: dipilih pada Um ${m[1]} kV; spesifikasi pesanan (OS) yang menentukan.`,
    }),
  ],
  [
    /^230\/121 kV autotransformer MV line lead: Um 170 kV is usual; check the maker's data\.$/,
    () => ({
      vi: "Đầu ra trung áp máy tự ngẫu 230/121 kV thường dùng Um 170 kV; hãy đối chiếu số liệu của nhà sản xuất.",
      es: "Salida de MT de autotransformador 230/121 kV: lo habitual es Um 170 kV; compruebe los datos del fabricante.",
      tr: "230/121 kV ototransformatör OG hat çıkışı: genellikle Um 170 kV; üretici verisiyle doğrulayın.",
      id: "Saluran TM autotransformator 230/121 kV: biasanya Um 170 kV; periksa data pabrikan.",
    }),
  ],
  [
    /^Reference: (.+)\.$/,
    (m) => ({
      vi: `Tham khảo: ${m[1]}.`,
      es: `Referencia: ${m[1]}.`,
      tr: `Referans: ${m[1]}.`,
      id: `Referensi: ${m[1]}.`,
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
    /^220 kV-class tapped winding: combined types only\.$/,
    () => ({
      vi: "Cuộn điều áp cấp 220 kV: chỉ kiểu tổ hợp.",
      es: "Devanado regulado de clase 220 kV: solo tipos combinados.",
      tr: "220 kV sınıfı kademeli sargı: yalnızca kombine tip.",
      id: "Belitan bertap kelas 220 kV: hanya tipe kombinasi.",
    }),
  ],
  [
    /^Needs the maker's technical review: (.+)\.$/,
    (m) => ({
      vi: `Cần nhà sản xuất xét duyệt kỹ thuật riêng: ${m[1]}.`,
      es: `Requiere revisión técnica del fabricante: ${m[1]}.`,
      tr: `Üretici teknik incelemesi gerekli: ${m[1]}.`,
      id: `Perlu tinjauan teknis pabrikan: ${m[1]}.`,
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
    /^Stated Um ([\d.]+) kV is below the system class Um ([\d.]+) kV at this point\. Check the OS\.$/,
    (m) => ({
      vi: `Um đã chọn ${m[1]} kV thấp hơn cấp hệ thống Um ${m[2]} kV tại điểm này. Kiểm tra OS.`,
      es: `La Um indicada ${m[1]} kV está por debajo de la clase del sistema Um ${m[2]} kV en este punto. Revise la OS.`,
      tr: `Belirtilen Um ${m[1]} kV, bu noktadaki sistem sınıfı Um ${m[2]} kV değerinin altında. OS'u kontrol edin.`,
      id: `Um yang disebut ${m[1]} kV di bawah kelas sistem Um ${m[2]} kV di titik ini. Periksa OS.`,
    }),
  ],
  [
    /^Autotransformer: combined types only \(compound types stop at 200 kV across the tap winding\)\.$/,
    () => ({
      vi: "Máy biến áp tự ngẫu: chỉ kiểu tổ hợp (kiểu phức hợp chỉ chịu 200 kV qua cuộn điều chỉnh).",
      es: "Autotransformador: solo tipos combinados (los compuestos llegan a 200 kV a través del devanado de regulación).",
      tr: "Ototransformatör: yalnızca kombine tip (kompakt tipler kademe sargısı boyunca 200 kV ile sınırlı).",
      id: "Autotransformator: hanya tipe kombinasi (tipe kompon terbatas 200 kV melintasi belitan tap).",
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
  [
    /^Autotransformer HV class Um ([\d.]+) kV is above the catalogue \(top 363 kV\)\. Give the switch's insulation to earth from the OS \(CLI: --earth-um\): ([\d., ]+) kV\.$/,
    (m) => ({
      vi: `Cấp cao áp của biến áp tự ngẫu Um ${m[1]} kV vượt catalogue (cao nhất 363 kV). Nhập cách điện với đất của bộ ĐAPT theo OS: ${m[2]} kV.`,
      es: `La clase de AT del autotransformador, Um ${m[1]} kV, supera el catálogo (máx. 363 kV). Indique el aislamiento a tierra del cambiador según la OS: ${m[2]} kV.`,
      tr: `Ototransformatör YG sınıfı Um ${m[1]} kV katalog üstünde (en yüksek 363 kV). Kademe değiştiricinin toprağa yalıtımını OS'den girin: ${m[2]} kV.`,
      id: `Kelas TT autotransformator Um ${m[1]} kV di atas katalog (maks. 363 kV). Masukkan isolasi ke tanah OLTC dari OS: ${m[2]} kV.`,
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
