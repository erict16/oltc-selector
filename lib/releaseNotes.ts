import type { Lang } from "./i18n";

export type NoteKind = "fix" | "new" | "imp";
export type NoteGroup = { kind: NoteKind; items: string[] };
export type Release = {
  version: string;
  /** YYYY-MM */
  date: string;
  groups: NoteGroup[];
};

/**
 * Version history, newest first. The footer popover shows the first two
 * releases; /changelog shows all of them, with the sidebar collapsed to
 * minor lines (v1.2, v1.1, …). Versions, dates, group kinds, and item
 * counts must stay identical across languages — only the item text is
 * translated. Keep sentences complete, concrete, and public-facing.
 */
export const RELEASES: Record<Lang, Release[]> = {
  zh: [
    {
      version: "1.2.9",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "真空灭弧也成为硬约束：开关装在油箱外、真空系列又盖不住工况时，会直接提示「超出样本」，不再悄悄换成油浸电抗式开关。",
          ],
        },
      ],
    },
    {
      version: "1.2.8",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: ["油灭弧成为硬约束：选了油灭弧，结果里就不会再出现真空型号。"],
        },
      ],
    },
    {
      version: "1.2.7",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "新增双断口真空系列 SDZV，级电压最高 6000 V、级容量约为 SHZV 的 1.5 倍。",
            "级电压菜单新增 4500、5000、6000 V 三档。",
          ],
        },
        {
          kind: "imp",
          items: ["选型助手教程页改成「装、发、拿型号」三步引导。"],
        },
      ],
    },
    {
      version: "1.2.6",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["选型助手技能移到单独的仓库维护，教程页直接指向它，以后更新更快。"],
        },
      ],
    },
    {
      version: "1.2.5",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "无载开关指定了触头数时，不再被错算成 17 个工位。",
            "命令行的安全系数默认值改为 ×1.0，和网页版一致。",
            "选型理由里的电流数值取整显示，不再出现一长串小数。",
          ],
        },
        {
          kind: "imp",
          items: ["助手列出的假定更完整，相数等参数也会一并说明。"],
        },
      ],
    },
    {
      version: "1.2.4",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "助手和命令行会主动告诉你：哪些参数没填、这次用了哪些默认值。",
            "助手在两个技能市场上架：WorkBuddy SkillHub 和 skillhub.cn。",
          ],
        },
      ],
    },
    {
      version: "1.2.3",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["助手带上华明图标，在 WorkBuddy 技能市场里一眼能认出来。"],
        },
      ],
    },
    {
      version: "1.2.2",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["助手说明文档改写：上半部分给人看，下半部分给 AI 看。"],
        },
      ],
    },
    {
      version: "1.2.1",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "助手能听懂更多参数了：级电压、安装方式（箱内、箱外、干式）、灭弧方式（油或真空）和相数。",
          ],
        },
      ],
    },
    {
      version: "1.2.0",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "命令行工具 oltc 发布，和网页版共用同一套选型引擎。",
            "「选型助手」上线：把变压器参数发给 AI 助手，就能拿回型号。",
            "只填变压器容量也能选型，工具会自动推算最大通过电流。",
            "无载开关可按样本册选择接线方式：II 正反调、IV 线性调、V 单桥跨接、VI Y-D 转换、VII 双桥跨接、VIII 串并联。",
            "结果卡会标明开关结构：复合式、组合式、笼式或鼓式。",
          ],
        },
        {
          kind: "fix",
          items: [
            "不会再选出样本册或 2025 价格表里不存在的型号，比如三相角接的 CM2。",
            "组合式三相有载开关只用于中性点；角接或线端工况会自动改用三台单相。",
          ],
        },
      ],
    },
    {
      version: "1.1.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: [
            "灭弧方式可以选择了：油或真空。",
            "新增 66、110、220 kV 三个预设，点一下即可填好典型工况。",
          ],
        },
        {
          kind: "imp",
          items: ["表单与结果左右同高，宽屏无需滚动即可点击选型。"],
        },
      ],
    },
    {
      version: "1.0.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: ["首次发布：输入变压器参数，即可选出样本册中真实存在的开关型号。"],
        },
      ],
    },
  ],
  en: [
    {
      version: "1.2.9",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "Vacuum switching is now a hard limit too: if the tap changer is mounted on-tank and no vacuum type covers the duty, the tool says the duty is out of catalogue instead of quietly substituting an oil reactor type.",
          ],
        },
      ],
    },
    {
      version: "1.2.8",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "Oil switching is now a hard limit: when you choose oil, vacuum types no longer appear in the result.",
          ],
        },
      ],
    },
    {
      version: "1.2.7",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "The dual-break vacuum family SDZV is available, with step voltage up to 6000 V and about 1.5 times the step capacity of SHZV.",
            "The step voltage menu adds 4500, 5000, and 6000 V.",
          ],
        },
        {
          kind: "imp",
          items: ["The assistant guide is now a three-step walkthrough: install, send, get the type."],
        },
      ],
    },
    {
      version: "1.2.6",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "The assistant skill moved to its own repository and the tutorial page points straight at it, so updates ship faster.",
          ],
        },
      ],
    },
    {
      version: "1.2.5",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "An off-circuit switch with a given contact count is no longer misread as 17 positions.",
            "The command-line safety factor now defaults to ×1.0, matching the web app.",
            "Duty currents in the reason strings are rounded, with no long decimals.",
          ],
        },
        {
          kind: "imp",
          items: ["The assistant relays a fuller list of assumptions, including the phase count."],
        },
      ],
    },
    {
      version: "1.2.4",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "The assistant and the CLI tell you which inputs you left out and which defaults were used, after every run.",
            "The assistant is published on both skill marketplaces: WorkBuddy SkillHub and skillhub.cn.",
          ],
        },
      ],
    },
    {
      version: "1.2.3",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "The assistant ships with the Huaming icon, so it is easy to recognise in the WorkBuddy skill marketplace.",
          ],
        },
      ],
    },
    {
      version: "1.2.2",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["The assistant manual was rewritten: the top half for people, the bottom half for the AI."],
        },
      ],
    },
    {
      version: "1.2.1",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "The assistant understands more inputs: step voltage, mounting (in-tank, on-tank, dry), switching medium (oil or vacuum), and phase count.",
          ],
        },
      ],
    },
    {
      version: "1.2.0",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "The oltc command-line tool is published, sharing the same selection engine as the web app.",
            "The Selection assistant launches: send the transformer data to an AI assistant and get the type back.",
            "You can select with just the transformer capacity — the tool derives the maximum through-current.",
            "Off-circuit switches offer the brochure wiring schemes: II reversing, IV linear, V single bridge, VI Y-D, VII double bridge, VIII series-parallel.",
            "The result card names the construction: compound, combined, cage, or drum.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Types that are not in the brochure or the 2025 list no longer appear, for example three-phase delta CM2.",
            "Combined three-phase on-load switches are star-point only; delta or line-end duties switch to three single-phase units.",
          ],
        },
      ],
    },
    {
      version: "1.1.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: [
            "The interrupter is a choice: oil or vacuum.",
            "Presets for 66, 110, and 220 kV fill a typical duty in one click.",
          ],
        },
        {
          kind: "imp",
          items: ["Form and result sit side by side at the same height, so wide screens need no scrolling to hit Select."],
        },
      ],
    },
    {
      version: "1.0.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: ["First release: enter the transformer data and get a type that exists in the catalogue."],
        },
      ],
    },
  ],
  vi: [
    {
      version: "1.2.9",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "Dập hồ quang chân không cũng trở thành giới hạn cứng: khi lắp ngoài thùng mà không có kiểu chân không phù hợp, công cụ báo ngoài catalogue thay vì lặng lẽ đổi sang máy dầu kiểu kháng.",
          ],
        },
      ],
    },
    {
      version: "1.2.8",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "Dập hồ quang dầu trở thành giới hạn cứng: khi chọn dầu, kết quả không còn hiện kiểu chân không.",
          ],
        },
      ],
    },
    {
      version: "1.2.7",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Thêm họ chân không hai tiếp điểm SDZV: điện áp cấp tới 6000 V, dung lượng cấp khoảng 1,5 lần SHZV.",
            "Menu điện áp cấp thêm ba nấc 4500, 5000 và 6000 V.",
          ],
        },
        {
          kind: "imp",
          items: ["Trang hướng dẫn trợ lý đổi thành ba bước: cài, gửi, nhận kiểu."],
        },
      ],
    },
    {
      version: "1.2.6",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "Kỹ năng trợ lý chuyển sang kho riêng, trang hướng dẫn trỏ thẳng tới đó nên cập nhật nhanh hơn.",
          ],
        },
      ],
    },
    {
      version: "1.2.5",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "Khi đã cho số tiếp điểm, máy không tải không còn bị tính nhầm thành 17 vị trí.",
            "Hệ số an toàn của dòng lệnh mặc định là ×1.0, giống bản web.",
            "Dòng điện trong phần giải thích được làm tròn, không còn dãy số lẻ dài.",
          ],
        },
        {
          kind: "imp",
          items: ["Trợ lý liệt kê giả định đầy đủ hơn, kể cả số pha."],
        },
      ],
    },
    {
      version: "1.2.4",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Trợ lý và dòng lệnh chủ động cho biết bạn chưa nhập thông số nào và giá trị mặc định nào đang được dùng.",
            "Trợ lý đã lên hai chợ kỹ năng: WorkBuddy SkillHub và skillhub.cn.",
          ],
        },
      ],
    },
    {
      version: "1.2.3",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["Trợ lý có biểu tượng Huaming, dễ nhận ra trong chợ kỹ năng WorkBuddy."],
        },
      ],
    },
    {
      version: "1.2.2",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["Tài liệu trợ lý được viết lại: nửa trên cho người đọc, nửa dưới cho AI."],
        },
      ],
    },
    {
      version: "1.2.1",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "Trợ lý hiểu thêm nhiều thông số: điện áp cấp, kiểu lắp (trong thùng, ngoài thùng, khô), môi trường dập hồ quang (dầu hoặc chân không) và số pha.",
          ],
        },
      ],
    },
    {
      version: "1.2.0",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Công cụ dòng lệnh oltc ra mắt, dùng chung bộ máy chọn kiểu với bản web.",
            "Ra mắt Trợ lý chọn kiểu: gửi thông số máy biến áp cho trợ lý AI và nhận lại kiểu máy.",
            "Chỉ cần nhập dung lượng máy biến áp, công cụ tự tính dòng qua lớn nhất.",
            "Máy không tải chọn được sơ đồ nối dây theo catalogue: II đảo chiều, IV tuyến tính, V cầu đơn, VI Y-D, VII cầu kép, VIII nối tiếp-song song.",
            "Thẻ kết quả ghi rõ kết cấu: hỗn hợp, tổ hợp, lồng hoặc trống.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Không còn chọn kiểu không có trong catalogue hoặc bảng 2025, ví dụ CM2 ba pha đấu tam giác.",
            "Máy có tải ba pha kiểu tổ hợp chỉ dùng cho điểm trung tính; đấu tam giác hoặc đầu dây tự chuyển sang ba máy một pha.",
          ],
        },
      ],
    },
    {
      version: "1.1.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: [
            "Chọn được kiểu dập hồ quang: dầu hoặc chân không.",
            "Ba cài sẵn 66, 110 và 220 kV, một cú nhấp là điền xong điều kiện điển hình.",
          ],
        },
        {
          kind: "imp",
          items: ["Biểu mẫu và kết quả đặt cạnh nhau cùng chiều cao, màn hình rộng không cần cuộn để bấm chọn."],
        },
      ],
    },
    {
      version: "1.0.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: ["Bản đầu tiên: nhập thông số máy biến áp, chọn ra kiểu có thật trong catalogue."],
        },
      ],
    },
  ],
  es: [
    {
      version: "1.2.9",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "La conmutación en vacío también es un límite estricto: si el cambiador va sobre la cuba y ningún tipo de vacío cubre el régimen, la herramienta indica que está fuera de catálogo en lugar de sustituirlo por un tipo de reactor en aceite.",
          ],
        },
      ],
    },
    {
      version: "1.2.8",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "La conmutación en aceite es un límite estricto: al elegir aceite, los tipos de vacío ya no aparecen en el resultado.",
          ],
        },
      ],
    },
    {
      version: "1.2.7",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Está disponible la familia de vacío de doble corte SDZV, con tensión de paso de hasta 6000 V y una capacidad de paso de aproximadamente 1,5 veces la de SHZV.",
            "El menú de tensión de paso añade 4500, 5000 y 6000 V.",
          ],
        },
        {
          kind: "imp",
          items: ["La guía del asistente ahora es un recorrido de tres pasos: instalar, enviar y obtener el tipo."],
        },
      ],
    },
    {
      version: "1.2.6",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "La skill del asistente pasa a su propio repositorio y la página del tutorial apunta directamente a él, así las actualizaciones llegan antes.",
          ],
        },
      ],
    },
    {
      version: "1.2.5",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "Un cambiador sin carga con número de contactos indicado ya no se interpreta por error como 17 posiciones.",
            "El factor de seguridad de la línea de comandos ahora es ×1.0 por defecto, igual que en la web.",
            "Las corrientes en las explicaciones se redondean, sin decimales interminables.",
          ],
        },
        {
          kind: "imp",
          items: ["El asistente enumera supuestos más completos, incluido el número de fases."],
        },
      ],
    },
    {
      version: "1.2.4",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "El asistente y la CLI le dicen qué datos no indicó y qué valores por defecto se usaron, tras cada ejecución.",
            "El asistente está publicado en los dos mercados de skills: WorkBuddy SkillHub y skillhub.cn.",
          ],
        },
      ],
    },
    {
      version: "1.2.3",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "El asistente incluye el icono de Huaming, fácil de reconocer en el mercado de skills de WorkBuddy.",
          ],
        },
      ],
    },
    {
      version: "1.2.2",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["El manual del asistente se reescribió: la mitad superior para personas, la inferior para la IA."],
        },
      ],
    },
    {
      version: "1.2.1",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "El asistente entiende más parámetros: tensión de paso, montaje (dentro del tanque, sobre el tanque, en seco), medio de conmutación (aceite o vacío) y número de fases.",
          ],
        },
      ],
    },
    {
      version: "1.2.0",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Se publica la herramienta de línea de comandos oltc, con el mismo motor de selección que la web.",
            "Se estrena el Asistente de selección: envíe los datos del transformador a un asistente de IA y reciba el tipo.",
            "Basta indicar la potencia del transformador: la herramienta calcula la corriente máxima.",
            "Los cambiadores sin carga ofrecen los esquemas de conexión del catálogo: II inversión, IV lineal, V puente simple, VI Y-D, VII puente doble, VIII serie-paralelo.",
            "La tarjeta de resultado indica la construcción: compuesto, combinado, jaula o tambor.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Ya no aparecen tipos que no están en el catálogo ni en la lista 2025, por ejemplo CM2 trifásico en triángulo.",
            "Los cambiadores en carga trifásicos combinados son solo para punto neutro; en triángulo o extremo de línea se pasa a tres unidades monofásicas.",
          ],
        },
      ],
    },
    {
      version: "1.1.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: [
            "El tipo de extinción es elegible: aceite o vacío.",
            "Preajustes de 66, 110 y 220 kV que rellenan un régimen típico con un clic.",
          ],
        },
        {
          kind: "imp",
          items: ["Formulario y resultado lado a lado a la misma altura; en pantallas anchas no hay que desplazarse para pulsar Seleccionar."],
        },
      ],
    },
    {
      version: "1.0.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: ["Primera versión: introduzca los datos del transformador y obtenga un tipo que existe en el catálogo."],
        },
      ],
    },
  ],
  tr: [
    {
      version: "1.2.9",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "Vakum da artık kesin bir sınır: kademe değiştirici tank üstündeyse ve hiçbir vakum tipi işletmeyi karşılamıyorsa, araç yağlı reaktör tipini sessizce koymak yerine katalog dışı olduğunu söyler.",
          ],
        },
      ],
    },
    {
      version: "1.2.8",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: ["Yağda kesme kesin bir sınır oldu: yağ seçtiğinizde sonuçta vakum tipleri çıkmaz."],
        },
      ],
    },
    {
      version: "1.2.7",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Çift kesmeli vakum ailesi SDZV eklendi: kademe gerilimi 6000 V’e kadar, kademe kapasitesi SHZV’nin yaklaşık 1,5 katı.",
            "Kademe gerilimi menüsüne 4500, 5000 ve 6000 V kademeleri eklendi.",
          ],
        },
        {
          kind: "imp",
          items: ["Asistan kılavuzu üç adımlı bir akışa dönüştü: kur, gönder, tipi al."],
        },
      ],
    },
    {
      version: "1.2.6",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "Asistan becerisi kendi deposuna taşındı ve eğitim sayfası doğrudan oraya bağlanıyor; güncellemeler artık daha hızlı.",
          ],
        },
      ],
    },
    {
      version: "1.2.5",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "Kontak sayısı verilen bir yüksüz kademe değiştirici artık yanlışlıkla 17 kademe sayılmıyor.",
            "Komut satırında güvenlik katsayısı artık varsayılan ×1.0, web ile aynı.",
            "Açıklamalardaki akım değerleri yuvarlanıyor, uzun ondalıklar yok.",
          ],
        },
        {
          kind: "imp",
          items: ["Asistan artık faz sayısı dahil daha eksiksiz varsayımlar listeliyor."],
        },
      ],
    },
    {
      version: "1.2.4",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Asistan ve CLI, hangi girdileri vermediğinizi ve hangi varsayılanların kullanıldığını her çalıştırmadan sonra bildirir.",
            "Asistan iki beceri marketinde yayında: WorkBuddy SkillHub ve skillhub.cn.",
          ],
        },
      ],
    },
    {
      version: "1.2.3",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["Asistan Huaming simgesiyle geliyor; WorkBuddy beceri marketinde kolayca tanınır."],
        },
      ],
    },
    {
      version: "1.2.2",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["Asistan kılavuzu yeniden yazıldı: üst yarı insanlar için, alt yarı yapay zekâ için."],
        },
      ],
    },
    {
      version: "1.2.1",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "Asistan daha fazla girdiyi anlıyor: kademe gerilimi, montaj (tank içi, tank üstü, kuru), kesme ortamı (yağ veya vakum) ve faz sayısı.",
          ],
        },
      ],
    },
    {
      version: "1.2.0",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "oltc komut satırı aracı yayınlandı; web ile aynı seçim motorunu paylaşıyor.",
            "Seçim asistanı yayında: transformatör verilerini bir yapay zekâ asistanına gönderin, tipi geri alın.",
            "Yalnızca transformatör gücünü girmeniz yeterli; araç en yüksek geçiş akımını kendisi hesaplar.",
            "Yüksüz kademe değiştiriciler katalogdaki bağlantı şemalarını sunar: II ters çevirme, IV doğrusal, V tek köprü, VI Y-D, VII çift köprü, VIII seri-paralel.",
            "Sonuç kartı yapıyı belirtir: bileşik, kombine, kafes veya tambur.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Katalogda veya 2025 listesinde olmayan tipler artık çıkmaz, örneğin üç faz üçgen CM2.",
            "Kombine üç faz yük-altı kademe değiştiriciler yalnızca yıldız noktası içindir; üçgen veya hat ucu işletmelerde üç tek fazlı üniteye geçilir.",
          ],
        },
      ],
    },
    {
      version: "1.1.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: [
            "Söndürme tipi seçilebilir: yağ veya vakum.",
            "66, 110 ve 220 kV ön ayarları tek tıkla tipik işletmeyi doldurur.",
          ],
        },
        {
          kind: "imp",
          items: ["Form ve sonuç yan yana, aynı yükseklikte; geniş ekranda Seç düğmesi için kaydırmaya gerek yok."],
        },
      ],
    },
    {
      version: "1.0.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: ["İlk sürüm: transformatör verilerini girin, katalogda var olan tipi alın."],
        },
      ],
    },
  ],
  ru: [
    {
      version: "1.2.9",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "Вакуум тоже стал жёстким ограничением: если переключатель стоит на баке и ни один вакуумный тип не закрывает режим, инструмент сообщает, что режим вне каталога, а не подставляет масляный реакторный тип.",
          ],
        },
      ],
    },
    {
      version: "1.2.8",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "Масляное гашение стало жёстким ограничением: при выборе масла вакуумные типы не появляются в результате.",
          ],
        },
      ],
    },
    {
      version: "1.2.7",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Добавлено двухразрывное вакуумное семейство SDZV: ступенчатое напряжение до 6000 В, ступенчатая мощность примерно в 1,5 раза выше SHZV.",
            "В меню ступенчатого напряжения добавлены 4500, 5000 и 6000 В.",
          ],
        },
        {
          kind: "imp",
          items: ["Руководство по ассистенту теперь состоит из трёх шагов: установить, отправить, получить тип."],
        },
      ],
    },
    {
      version: "1.2.6",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "Навык ассистента переехал в отдельный репозиторий, а страница руководства ссылается прямо на него, поэтому обновления выходят быстрее.",
          ],
        },
      ],
    },
    {
      version: "1.2.5",
      date: "2026-09",
      groups: [
        {
          kind: "fix",
          items: [
            "ПБВ с заданным числом контактов больше не ошибочно считается 17-позиционным.",
            "Коэффициент запаса в командной строке по умолчанию ×1.0, как на сайте.",
            "Токи в пояснениях округляются, без длинных дробей.",
          ],
        },
        {
          kind: "imp",
          items: ["Ассистент перечисляет допущения полнее, включая число фаз."],
        },
      ],
    },
    {
      version: "1.2.4",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Ассистент и CLI сообщают, какие данные вы не указали и какие значения по умолчанию использованы, после каждого запуска.",
            "Ассистент опубликован на обоих маркетах навыков: WorkBuddy SkillHub и skillhub.cn.",
          ],
        },
      ],
    },
    {
      version: "1.2.3",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["Ассистент получил значок Huaming, его легко узнать на маркете навыков WorkBuddy."],
        },
      ],
    },
    {
      version: "1.2.2",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: ["Инструкция ассистента переписана: верхняя половина для людей, нижняя для ИИ."],
        },
      ],
    },
    {
      version: "1.2.1",
      date: "2026-09",
      groups: [
        {
          kind: "imp",
          items: [
            "Ассистент понимает больше параметров: ступенчатое напряжение, способ монтажа (в баке, на баке, сухой), среду гашения (масло или вакуум) и число фаз.",
          ],
        },
      ],
    },
    {
      version: "1.2.0",
      date: "2026-09",
      groups: [
        {
          kind: "new",
          items: [
            "Опубликована утилита командной строки oltc — тот же механизм подбора, что и на сайте.",
            "Запущен ассистент подбора: отправьте данные трансформатора ИИ-ассистенту и получите тип.",
            "Достаточно ввести мощность трансформатора — инструмент сам рассчитает наибольший сквозной ток.",
            "Для ПБВ доступны схемы соединений из каталога: II реверсивная, IV линейная, V одиночный мост, VI Y-D, VII двойной мост, VIII последовательно-параллельная.",
            "Карточка результата указывает конструкцию: совмещённая, комбинированная, клетка или барабан.",
          ],
        },
        {
          kind: "fix",
          items: [
            "Типы, которых нет в каталоге или списке 2025, больше не выдаются, например трёхфазный CM2 по схеме треугольника.",
            "Комбинированные трёхфазные РПН — только для нейтрали; при треугольнике или на конце линии подбираются три однофазных аппарата.",
          ],
        },
      ],
    },
    {
      version: "1.1.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: [
            "Тип гашения можно выбрать: масло или вакуум.",
            "Пресеты 66, 110 и 220 кВ заполняют типовой режим одним нажатием.",
          ],
        },
        {
          kind: "imp",
          items: ["Форма и результат рядом на одной высоте — на широком экране не нужно прокручивать, чтобы нажать «Подобрать»."],
        },
      ],
    },
    {
      version: "1.0.0",
      date: "2026-08",
      groups: [
        {
          kind: "new",
          items: ["Первый выпуск: введите данные трансформатора и получите тип, существующий в каталоге."],
        },
      ],
    },
  ],
};
