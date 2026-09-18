import type { Lang } from "./i18n";

export type ReleaseNotes = {
  currentLabel: string;
  earlierLabel: string;
  current: string[];
  earlier: string[];
};

export const RELEASE_NOTES: Record<Lang, ReleaseNotes> = {
  zh: {
    currentLabel: "这一版",
    earlierLabel: "此前",
    current: [
      "箱外安装并选择真空灭弧时，如果真空型号盖不住这个工况，就提示超出目录，不再改用油浸电抗式开关。",
      "选择油灭弧时，结果里不会再出现真空型号。",
      "增加了双断口真空系列 SDZV，最大级电压可以到 6000 V。",
    ],
    earlier: [
      "可以按变压器容量自动计算最大通过电流。",
      "现在可以选出 CMD 型号。",
      "不会再选出样本册里没有的型号，例如三相 D 接的 CM2。",
      "有载开关可以选择复合式或组合式，无载开关可以选择笼式或鼓式。",
    ],
  },
  en: {
    currentLabel: "This version",
    earlierLabel: "Earlier",
    current: [
      "If the tap changer is on-tank and you choose vacuum, and no vacuum type covers the duty, the tool now says the duty is out of range. It no longer substitutes an oil reactor type.",
      "When you choose oil switching, vacuum types no longer appear in the result.",
      "The dual-break vacuum family SDZV is available. Maximum step voltage is 6000 V.",
    ],
    earlier: [
      "You can enter transformer capacity and the tool calculates Imax.",
      "CMD types can be selected.",
      "Types that are not in the brochure no longer appear, for example three-phase delta CM2.",
      "On-load types can be compound or combined. Off-circuit types can be cage or drum.",
    ],
  },
  vi: {
    currentLabel: "Bản này",
    earlierLabel: "Trước đó",
    current: [
      "Khi lắp ngoài thùng và chọn dập hồ quang chân không, nếu không có kiểu chân không phù hợp, công cụ báo ngoài phạm vi catalog, không còn lấy máy dầu kiểu kháng thay thế.",
      "Khi chọn dập hồ quang dầu, kết quả không còn hiện kiểu chân không.",
      "Đã thêm họ chân không hai tiếp điểm SDZV, điện áp cấp lớn nhất 6000 V.",
    ],
    earlier: [
      "Có thể nhập dung lượng máy biến áp để tự tính Imax.",
      "Có thể chọn kiểu CMD.",
      "Không còn chọn kiểu không có trong catalogue, ví dụ CM2 ba pha đấu tam giác.",
      "OLTC có thể chọn kiểu hỗn hợp hoặc tổ hợp. OCTC có thể chọn lồng hoặc trống.",
    ],
  },
  es: {
    currentLabel: "Esta versión",
    earlierLabel: "Antes",
    current: [
      "Si el cambiador va sobre la cuba y elige vacío, y ningún tipo de vacío cubre el régimen, la herramienta indica que está fuera de catálogo. Ya no sustituye un tipo de reactor en aceite.",
      "Si elige conmutación en aceite, los tipos de vacío ya no aparecen en el resultado.",
      "Está disponible la familia de vacío de doble corte SDZV. La tensión de paso máxima es 6000 V.",
    ],
    earlier: [
      "Puede indicar la potencia del transformador y la herramienta calcula Imax.",
      "Se pueden seleccionar tipos CMD.",
      "Ya no aparecen tipos que no están en el catálogo, por ejemplo CM2 trifásico en triángulo.",
      "En carga puede elegir compuesto o combinado. Sin carga puede elegir jaula o tambor.",
    ],
  },
  tr: {
    currentLabel: "Bu sürüm",
    earlierLabel: "Daha önce",
    current: [
      "Kademe değiştirici tank üstündeyse ve vakum seçtiyseniz, vakum tipi bu işletmeyi karşılamıyorsa araç artık katalog dışı der. Yağlı reaktör tipini yerine koymaz.",
      "Yağda kesme seçtiğinizde sonuçta vakum tipleri çıkmaz.",
      "Çift kesmeli vakum ailesi SDZV eklendi. En yüksek kademe gerilimi 6000 V.",
    ],
    earlier: [
      "Transformatör gücünü girince araç Imax’i hesaplar.",
      "CMD tipleri seçilebilir.",
      "Katalogda olmayan tipler artık çıkmaz, örneğin üç faz üçgen CM2.",
      "Yük altında bileşik veya kombine seçilebilir. Yüksüz kafes veya tambur seçilebilir.",
    ],
  },
  ru: {
    currentLabel: "Эта версия",
    earlierLabel: "Ранее",
    current: [
      "Если переключатель стоит на баке и выбран вакуум, а вакуумный тип не закрывает режим, инструмент сообщает, что режим вне каталога. Масляный реакторный тип больше не подставляется.",
      "При выборе масляного гашения вакуумные типы больше не появляются в результате.",
      "Добавлено двухразрывное вакуумное семейство SDZV. Максимальное ступенчатое напряжение 6000 В.",
    ],
    earlier: [
      "Можно ввести мощность трансформатора, и инструмент рассчитает Imax.",
      "Можно подобрать типы CMD.",
      "Типы, которых нет в каталоге, больше не выдаются, например трёхфазный CM2 по схеме треугольника.",
      "Для РПН можно выбрать совмещённую или комбинированную конструкцию. Для ПБВ можно выбрать клетку или барабан.",
    ],
  },
};
