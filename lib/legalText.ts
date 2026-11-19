import type { Lang } from "@/lib/i18n";

/** Terms and Privacy, one language at a time (2026-11-18 redesign). Plain
 *  words, same meaning in every language. A section whose `mail` is true ends
 *  with the contact address. Change the date when the text changes. */
export type LegalSection = { h: string; p: string[]; mail?: boolean };
export type LegalDoc = { title: string; sections: LegalSection[] };

export const LEGAL_UPDATED = "2026-11-18";
export const LEGAL_MAIL = "eric.tan.dev@outlook.com";

export const LEGAL_UPDATED_LABEL: Record<Lang, string> = {
  zh: "更新于",
  en: "Updated",
  vi: "Cập nhật",
  es: "Actualizado el",
  tr: "Güncelleme:",
  id: "Diperbarui",
};

export const TERMS: Record<Lang, LegalDoc> = {
  en: {
    title: "Terms of use",
    sections: [
      { h: "What this is", p: ["OLTC Selector is a private project of one person, made for reference and convenience. It is not an official tool, quotation, order sheet (OS) or sales commitment of any company, including any tap-changer maker."] },
      { h: "Results are suggestions", p: ["The page and the command-line tool suggest a type from simplified rules and the published catalogue. A suggestion is not an engineering design, not a type-test approval and does not replace the maker’s engineering check. The order sheet and the maker’s confirmation decide."] },
      { h: "Check before you use a result", p: ["Check every result with qualified engineers and with the maker before you quote, buy, build or install anything."] },
      { h: "No warranty", p: ["The site is provided “as is” and “as available”, with no warranty of any kind, express or implied, including accuracy, completeness, fitness for a purpose and non-infringement. Catalogue data can be incomplete, out of date or wrong for your transformer."] },
      { h: "Liability", p: ["As far as the law allows, the author is not liable for any loss or damage of any kind (direct, indirect, incidental, special, consequential or punitive, including lost profit, data, business or goodwill) that comes from using, or not being able to use, the site, the command-line tool or their results. This includes commercial, contract and technical decisions based on a result."] },
      { h: "Names and brands", p: ["The software is the author’s own work. Product names, type designations and technical data of makers belong to their owners and appear only to identify products. Naming them does not mean a partnership, agency, employment or endorsement. Nothing on this site is a company statement."] },
      { h: "Fair use", p: ["Do not disrupt the hosting, scrape the site in a way that harms it, or present a result as a certified document of a maker. The author can change or stop the site at any time without notice."] },
      { h: "Local law", p: ["Local laws that cannot be excluded still apply."] },
      { h: "Contact", p: ["Questions about these terms:"], mail: true },
    ],
  },
  zh: {
    title: "使用条款",
    sections: [
      { h: "本站是什么", p: ["OLTC Selector 是个人的私人项目，仅供参考和方便使用。它不是任何公司（包括任何分接开关制造商）的官方工具、报价、订货规范（OS）或销售承诺。"] },
      { h: "结果只是建议", p: ["网页和命令行按简化规则和公开样本给出型号建议。建议不是工程设计，不是型式试验认可，也不能代替制造商的工程确认。以订货规范和制造商确认为准。"] },
      { h: "使用前请核实", p: ["报价、采购、制造或安装前，请让合格的工程人员和制造商核实每一个结果。"] },
      { h: "不作保证", p: ["本站按“现状”和“可用”提供，不作任何明示或默示的保证，包括准确、完整、适合某种用途和不侵权。样本数据可能不完整、已过时，或不适合您的变压器。"] },
      { h: "责任", p: ["在法律允许的最大范围内，因使用或无法使用本站、命令行或其结果而造成的任何损失或损害（直接、间接、附带、特殊、后果性或惩罚性的，包括利润、数据、业务或商誉的损失），作者都不承担责任。依据结果所作的商务、合同和技术决定也包括在内。"] },
      { h: "名称和品牌", p: ["本站软件是作者自己的作品。制造商的产品名称、型号和技术资料归其所有者，出现在这里只是为了识别产品。提到它们不表示合作、代理、雇佣或背书关系。本站的任何内容都不是公司声明。"] },
      { h: "合理使用", p: ["请勿干扰托管服务、以损害本站的方式抓取内容，或把结果当作制造商的认证文件。作者可以随时修改或停止本站，不另行通知。"] },
      { h: "当地法律", p: ["当地不能排除的法律仍然适用。"] },
      { h: "联系", p: ["对本条款有疑问，请发邮件至："], mail: true },
    ],
  },
  vi: {
    title: "Điều khoản sử dụng",
    sections: [
      { h: "Trang này là gì", p: ["OLTC Selector là dự án riêng của một cá nhân, chỉ để tham khảo và cho tiện. Đây không phải công cụ chính thức, báo giá, phiếu đặt hàng (OS) hay cam kết bán hàng của bất kỳ công ty nào, kể cả nhà sản xuất bộ chuyển nấc."] },
      { h: "Kết quả chỉ là gợi ý", p: ["Trang web và công cụ dòng lệnh gợi ý mã kiểu theo quy tắc đơn giản hóa và catalogue đã công bố. Gợi ý không phải thiết kế kỹ thuật, không phải phê duyệt thử nghiệm điển hình và không thay thế việc nhà sản xuất kiểm tra kỹ thuật. Phiếu đặt hàng và xác nhận của nhà sản xuất là căn cứ cuối cùng."] },
      { h: "Kiểm tra trước khi dùng kết quả", p: ["Hãy để kỹ sư có chuyên môn và nhà sản xuất kiểm tra mọi kết quả trước khi báo giá, mua, chế tạo hay lắp đặt."] },
      { h: "Không bảo đảm", p: ["Trang được cung cấp “nguyên trạng” và “theo khả năng sẵn có”, không có bất kỳ bảo đảm nào, rõ ràng hay ngụ ý, kể cả về độ chính xác, tính đầy đủ, sự phù hợp cho một mục đích và việc không vi phạm quyền. Dữ liệu catalogue có thể thiếu, cũ hoặc không đúng với máy biến áp của bạn."] },
      { h: "Trách nhiệm", p: ["Trong phạm vi pháp luật cho phép, tác giả không chịu trách nhiệm cho bất kỳ tổn thất hay thiệt hại nào (trực tiếp, gián tiếp, ngẫu nhiên, đặc biệt, hệ quả hoặc mang tính trừng phạt, kể cả mất lợi nhuận, dữ liệu, kinh doanh hay uy tín) phát sinh từ việc dùng, hoặc không dùng được, trang web, công cụ dòng lệnh hay kết quả của chúng. Điều này bao gồm các quyết định thương mại, hợp đồng và kỹ thuật dựa trên kết quả."] },
      { h: "Tên và thương hiệu", p: ["Phần mềm là sản phẩm của chính tác giả. Tên sản phẩm, mã kiểu và dữ liệu kỹ thuật của các nhà sản xuất thuộc về chủ sở hữu và chỉ xuất hiện để nhận biết sản phẩm. Việc nêu tên không có nghĩa là hợp tác, đại lý, quan hệ lao động hay xác nhận. Không nội dung nào trên trang này là tuyên bố của công ty."] },
      { h: "Sử dụng hợp lý", p: ["Không làm gián đoạn dịch vụ lưu trữ, không thu thập dữ liệu theo cách gây hại cho trang, và không trình bày kết quả như tài liệu được nhà sản xuất chứng nhận. Tác giả có thể thay đổi hoặc ngừng trang bất cứ lúc nào mà không báo trước."] },
      { h: "Luật địa phương", p: ["Các luật địa phương không thể loại trừ vẫn được áp dụng."] },
      { h: "Liên hệ", p: ["Câu hỏi về các điều khoản này:"], mail: true },
    ],
  },
  es: {
    title: "Términos de uso",
    sections: [
      { h: "Qué es este sitio", p: ["OLTC Selector es un proyecto privado de una persona, hecho como referencia y por comodidad. No es una herramienta oficial, una oferta, una hoja de pedido (OS) ni un compromiso de venta de ninguna empresa, incluido cualquier fabricante de cambiadores de tomas."] },
      { h: "Los resultados son sugerencias", p: ["La página y la herramienta de línea de comandos sugieren un tipo a partir de reglas simplificadas y del catálogo publicado. Una sugerencia no es un diseño de ingeniería ni una aprobación de ensayo de tipo, y no sustituye la revisión técnica del fabricante. Deciden la hoja de pedido y la confirmación del fabricante."] },
      { h: "Compruebe antes de usar un resultado", p: ["Haga revisar cada resultado por ingenieros cualificados y por el fabricante antes de ofertar, comprar, fabricar o instalar nada."] },
      { h: "Sin garantía", p: ["El sitio se ofrece «tal cual» y «según disponibilidad», sin garantía de ningún tipo, expresa o implícita, incluidas la exactitud, la integridad, la idoneidad para un fin y la no infracción. Los datos del catálogo pueden estar incompletos, desactualizados o no ser adecuados para su transformador."] },
      { h: "Responsabilidad", p: ["En la medida en que lo permita la ley, el autor no responde de ninguna pérdida o daño (directo, indirecto, incidental, especial, consecuente o punitivo, incluida la pérdida de beneficios, datos, negocio o reputación) derivado del uso, o de la imposibilidad de uso, del sitio, de la herramienta de línea de comandos o de sus resultados. Esto incluye las decisiones comerciales, contractuales y técnicas basadas en un resultado."] },
      { h: "Nombres y marcas", p: ["El software es obra del propio autor. Los nombres de producto, las designaciones de tipo y los datos técnicos de los fabricantes pertenecen a sus titulares y aparecen solo para identificar productos. Nombrarlos no implica asociación, representación, relación laboral ni respaldo. Nada en este sitio es una declaración de una empresa."] },
      { h: "Uso razonable", p: ["No interrumpa el alojamiento, no extraiga contenido de forma que perjudique al sitio y no presente un resultado como documento certificado de un fabricante. El autor puede cambiar o cerrar el sitio en cualquier momento y sin aviso."] },
      { h: "Ley local", p: ["Siguen aplicándose las leyes locales que no se pueden excluir."] },
      { h: "Contacto", p: ["Preguntas sobre estos términos:"], mail: true },
    ],
  },
  tr: {
    title: "Kullanım koşulları",
    sections: [
      { h: "Bu site nedir", p: ["OLTC Selector, tek bir kişinin başvuru ve kolaylık için yaptığı özel bir projedir. Herhangi bir şirketin, kademe değiştirici üreticileri dahil, resmî aracı, teklifi, sipariş formu (OS) veya satış taahhüdü değildir."] },
      { h: "Sonuçlar öneridir", p: ["Sayfa ve komut satırı aracı, basitleştirilmiş kurallara ve yayımlanmış kataloğa göre bir tip önerir. Öneri bir mühendislik tasarımı ya da tip testi onayı değildir ve üreticinin mühendislik kontrolünün yerini tutmaz. Sipariş formu ve üreticinin onayı belirleyicidir."] },
      { h: "Kullanmadan önce kontrol edin", p: ["Teklif vermeden, satın almadan, üretmeden veya kurmadan önce her sonucu yetkin mühendislere ve üreticiye kontrol ettirin."] },
      { h: "Garanti yok", p: ["Site “olduğu gibi” ve “mevcut olduğu sürece” sunulur; doğruluk, eksiksizlik, belirli bir amaca uygunluk ve hak ihlali olmaması dahil, açık veya örtülü hiçbir garanti verilmez. Katalog verileri eksik, güncel olmayan veya transformatörünüze uymayan veriler olabilir."] },
      { h: "Sorumluluk", p: ["Yasanın izin verdiği ölçüde yazar; sitenin, komut satırı aracının veya sonuçlarının kullanılmasından ya da kullanılamamasından doğan hiçbir kayıp veya zarardan (doğrudan, dolaylı, arızi, özel, sonuç olarak doğan veya cezai; kâr, veri, iş veya itibar kaybı dahil) sorumlu değildir. Buna bir sonuca dayanılarak alınan ticari, sözleşmesel ve teknik kararlar da dahildir."] },
      { h: "Adlar ve markalar", p: ["Yazılım yazarın kendi eseridir. Üreticilerin ürün adları, tip tanımları ve teknik verileri sahiplerine aittir ve yalnızca ürünleri tanımlamak için yer alır. Bunların anılması ortaklık, temsilcilik, istihdam veya onay anlamına gelmez. Bu sitedeki hiçbir içerik bir şirket açıklaması değildir."] },
      { h: "Makul kullanım", p: ["Barındırma hizmetini aksatmayın, siteye zarar verecek şekilde veri kazımayın ve bir sonucu üreticinin onaylı belgesi gibi sunmayın. Yazar siteyi her zaman, önceden haber vermeden değiştirebilir veya kapatabilir."] },
      { h: "Yerel yasalar", p: ["Hariç tutulamayan yerel yasalar yine de geçerlidir."] },
      { h: "İletişim", p: ["Bu koşullarla ilgili sorular için:"], mail: true },
    ],
  },
  id: {
    title: "Ketentuan penggunaan",
    sections: [
      { h: "Apa situs ini", p: ["OLTC Selector adalah proyek pribadi satu orang, dibuat sebagai acuan dan untuk kemudahan. Situs ini bukan alat resmi, penawaran, lembar pesanan (OS), atau komitmen penjualan perusahaan mana pun, termasuk produsen tap changer."] },
      { h: "Hasil hanyalah saran", p: ["Halaman dan alat baris perintah menyarankan tipe berdasarkan aturan yang disederhanakan dan katalog yang diterbitkan. Saran bukan desain teknik, bukan persetujuan uji tipe, dan tidak menggantikan pemeriksaan teknik oleh produsen. Lembar pesanan dan konfirmasi produsen yang menentukan."] },
      { h: "Periksa sebelum memakai hasil", p: ["Mintalah insinyur yang kompeten dan produsen memeriksa setiap hasil sebelum Anda membuat penawaran, membeli, membuat, atau memasang apa pun."] },
      { h: "Tanpa jaminan", p: ["Situs ini disediakan “apa adanya” dan “sebagaimana tersedia”, tanpa jaminan apa pun, tersurat maupun tersirat, termasuk ketepatan, kelengkapan, kesesuaian untuk tujuan tertentu, dan tidak adanya pelanggaran hak. Data katalog bisa tidak lengkap, usang, atau tidak cocok untuk trafo Anda."] },
      { h: "Tanggung jawab", p: ["Sejauh diizinkan hukum, penulis tidak bertanggung jawab atas kerugian atau kerusakan apa pun (langsung, tidak langsung, insidental, khusus, konsekuensial, atau bersifat hukuman, termasuk hilangnya laba, data, usaha, atau nama baik) yang timbul dari penggunaan, atau ketidakmampuan menggunakan, situs, alat baris perintah, atau hasilnya. Ini termasuk keputusan komersial, kontrak, dan teknis yang didasarkan pada suatu hasil."] },
      { h: "Nama dan merek", p: ["Perangkat lunak ini adalah karya penulis sendiri. Nama produk, penandaan tipe, dan data teknis produsen adalah milik pemiliknya dan hanya muncul untuk mengenali produk. Menyebutnya tidak berarti ada kemitraan, keagenan, hubungan kerja, atau dukungan. Tidak ada isi situs ini yang merupakan pernyataan perusahaan."] },
      { h: "Penggunaan wajar", p: ["Jangan mengganggu layanan hosting, mengambil data dengan cara yang merugikan situs, atau menyajikan hasil sebagai dokumen bersertifikat dari produsen. Penulis dapat mengubah atau menghentikan situs kapan saja tanpa pemberitahuan."] },
      { h: "Hukum setempat", p: ["Hukum setempat yang tidak dapat dikecualikan tetap berlaku."] },
      { h: "Kontak", p: ["Pertanyaan tentang ketentuan ini:"], mail: true },
    ],
  },
};

export const PRIVACY: Record<Lang, LegalDoc> = {
  en: {
    title: "Privacy",
    sections: [
      { h: "What this is", p: ["OLTC Selector is a private, non-commercial project. It is not an official product of any maker, employer or brand, and none of them endorse it."] },
      { h: "No accounts, no tracking", p: ["There are no user accounts, no analytics, no ads and no tracking cookies. The selection runs in your browser. The values you enter are not sent to a server of this project."] },
      { h: "What stays in your browser", p: ["Your language choice is kept in the browser’s local storage.", "The form values are kept in the page address, after the “#”, so a reload or a shared link opens the same selection. That part is never sent to a server, but it stays in your browser history and goes to anyone you send the link to.", "You can clear this site’s data in your browser at any time."] },
      { h: "Hosting", p: ["The page is served by Vercel and GitHub Pages. They may log standard technical data such as IP address, browser type and time of request, under their own policies. Fonts and scripts come from this site; the page loads nothing from other servers."] },
      { h: "The command-line tool", p: ["On each run the command-line tool asks the npm registry whether a newer version exists. The request carries none of your values. Turn it off with --no-update-check."] },
      { h: "Contact", p: ["Privacy questions:"], mail: true },
    ],
  },
  zh: {
    title: "隐私",
    sections: [
      { h: "本站是什么", p: ["OLTC Selector 是私人的非商业项目。它不是任何制造商、雇主或品牌的官方产品，也没有得到它们的背书。"] },
      { h: "没有账号，没有跟踪", p: ["本站没有用户账号，没有统计分析，没有广告，也没有跟踪 Cookie。选型在您的浏览器里完成，您输入的数值不会发送到本项目的服务器。"] },
      { h: "留在浏览器里的内容", p: ["您选的语言保存在浏览器的本地存储里。", "表单的数值保存在网址里“#”之后的部分，这样刷新或分享链接时能打开同一个选型。这部分不会发送到服务器，但会留在浏览器历史记录里，也会随链接发给对方。", "您可以随时在浏览器里清除本站的数据。"] },
      { h: "托管", p: ["网页由 Vercel 和 GitHub Pages 提供。它们可能按各自的政策记录 IP 地址、浏览器类型和访问时间等常规技术数据。字体和脚本都由本站提供，页面不从其他服务器加载内容。"] },
      { h: "命令行", p: ["命令行每次运行时会向 npm 询问有没有新版本。这个请求不带您的任何数值。用 --no-update-check 可以关掉。"] },
      { h: "联系", p: ["隐私问题请发邮件至："], mail: true },
    ],
  },
  vi: {
    title: "Quyền riêng tư",
    sections: [
      { h: "Trang này là gì", p: ["OLTC Selector là dự án riêng, phi thương mại. Đây không phải sản phẩm chính thức của nhà sản xuất, chủ lao động hay thương hiệu nào, và không được họ xác nhận."] },
      { h: "Không tài khoản, không theo dõi", p: ["Không có tài khoản người dùng, không có phân tích, không quảng cáo và không có cookie theo dõi. Việc chọn mã kiểu chạy trong trình duyệt của bạn. Các giá trị bạn nhập không được gửi tới máy chủ của dự án này."] },
      { h: "Những gì lưu trong trình duyệt", p: ["Ngôn ngữ bạn chọn được lưu trong bộ nhớ cục bộ của trình duyệt.", "Các giá trị của biểu mẫu được lưu trong địa chỉ trang, sau dấu “#”, để khi tải lại hoặc mở liên kết được chia sẻ sẽ thấy cùng lựa chọn. Phần này không bao giờ được gửi tới máy chủ, nhưng nó nằm trong lịch sử trình duyệt và đi theo liên kết tới người bạn gửi.", "Bạn có thể xóa dữ liệu của trang này trong trình duyệt bất cứ lúc nào."] },
      { h: "Lưu trữ", p: ["Trang được phục vụ bởi Vercel và GitHub Pages. Họ có thể ghi lại dữ liệu kỹ thuật thông thường như địa chỉ IP, loại trình duyệt và thời điểm truy cập, theo chính sách riêng của họ. Phông chữ và mã lệnh đều do trang này cung cấp; trang không tải gì từ máy chủ khác."] },
      { h: "Công cụ dòng lệnh", p: ["Mỗi lần chạy, công cụ dòng lệnh hỏi kho npm xem có phiên bản mới hơn không. Yêu cầu này không mang theo giá trị nào của bạn. Tắt bằng --no-update-check."] },
      { h: "Liên hệ", p: ["Câu hỏi về quyền riêng tư:"], mail: true },
    ],
  },
  es: {
    title: "Privacidad",
    sections: [
      { h: "Qué es este sitio", p: ["OLTC Selector es un proyecto privado y sin fines comerciales. No es un producto oficial de ningún fabricante, empleador ni marca, y ninguno de ellos lo respalda."] },
      { h: "Sin cuentas y sin rastreo", p: ["No hay cuentas de usuario, analítica, anuncios ni cookies de rastreo. La selección se hace en su navegador. Los valores que introduce no se envían a ningún servidor de este proyecto."] },
      { h: "Lo que queda en su navegador", p: ["El idioma que elige se guarda en el almacenamiento local del navegador.", "Los valores del formulario se guardan en la dirección de la página, después de «#», para que al recargar o abrir un enlace compartido se vea la misma selección. Esa parte nunca se envía a un servidor, pero queda en el historial del navegador y llega a quien reciba el enlace.", "Puede borrar los datos de este sitio en su navegador cuando quiera."] },
      { h: "Alojamiento", p: ["La página se sirve desde Vercel y GitHub Pages. Pueden registrar datos técnicos habituales, como la dirección IP, el tipo de navegador y la hora de la petición, según sus propias políticas. Las fuentes y los scripts vienen de este sitio; la página no carga nada de otros servidores."] },
      { h: "La herramienta de línea de comandos", p: ["En cada ejecución, la herramienta de línea de comandos pregunta al registro de npm si hay una versión más nueva. La petición no lleva ninguno de sus valores. Se desactiva con --no-update-check."] },
      { h: "Contacto", p: ["Preguntas sobre privacidad:"], mail: true },
    ],
  },
  tr: {
    title: "Gizlilik",
    sections: [
      { h: "Bu site nedir", p: ["OLTC Selector özel ve ticari olmayan bir projedir. Hiçbir üreticinin, işverenin veya markanın resmî ürünü değildir ve hiçbiri tarafından onaylanmamıştır."] },
      { h: "Hesap yok, izleme yok", p: ["Kullanıcı hesabı, analiz, reklam ve izleme çerezi yoktur. Seçim tarayıcınızda yapılır. Girdiğiniz değerler bu projenin herhangi bir sunucusuna gönderilmez."] },
      { h: "Tarayıcınızda kalanlar", p: ["Seçtiğiniz dil, tarayıcının yerel depolamasında tutulur.", "Form değerleri, sayfa adresinde “#” işaretinden sonra tutulur; böylece yenilediğinizde veya paylaşılan bir bağlantıyı açtığınızda aynı seçim gelir. Bu kısım hiçbir zaman bir sunucuya gönderilmez, ancak tarayıcı geçmişinizde kalır ve bağlantıyı gönderdiğiniz herkese ulaşır.", "Bu sitenin verilerini tarayıcınızdan istediğiniz zaman silebilirsiniz."] },
      { h: "Barındırma", p: ["Sayfa Vercel ve GitHub Pages üzerinden sunulur. Bunlar kendi politikalarına göre IP adresi, tarayıcı türü ve istek zamanı gibi standart teknik verileri kaydedebilir. Yazı tipleri ve betikler bu siteden gelir; sayfa başka sunuculardan hiçbir şey yüklemez."] },
      { h: "Komut satırı aracı", p: ["Komut satırı aracı her çalıştığında npm kayıt deposuna daha yeni bir sürüm olup olmadığını sorar. Bu istek değerlerinizin hiçbirini taşımaz. --no-update-check ile kapatılır."] },
      { h: "İletişim", p: ["Gizlilikle ilgili sorular için:"], mail: true },
    ],
  },
  id: {
    title: "Privasi",
    sections: [
      { h: "Apa situs ini", p: ["OLTC Selector adalah proyek pribadi dan nonkomersial. Situs ini bukan produk resmi produsen, pemberi kerja, atau merek mana pun, dan tidak didukung oleh mereka."] },
      { h: "Tanpa akun, tanpa pelacakan", p: ["Tidak ada akun pengguna, analitik, iklan, atau cookie pelacak. Pemilihan berjalan di peramban Anda. Nilai yang Anda masukkan tidak dikirim ke server proyek ini."] },
      { h: "Yang tersimpan di peramban Anda", p: ["Bahasa yang Anda pilih disimpan di penyimpanan lokal peramban.", "Nilai formulir disimpan di alamat halaman, setelah tanda “#”, agar saat dimuat ulang atau saat tautan yang dibagikan dibuka, pilihan yang sama muncul. Bagian ini tidak pernah dikirim ke server, tetapi tersimpan di riwayat peramban dan ikut terkirim kepada siapa pun yang menerima tautan.", "Anda dapat menghapus data situs ini di peramban kapan saja."] },
      { h: "Hosting", p: ["Halaman disajikan oleh Vercel dan GitHub Pages. Mereka dapat mencatat data teknis biasa seperti alamat IP, jenis peramban, dan waktu permintaan, sesuai kebijakan masing-masing. Font dan skrip berasal dari situs ini; halaman tidak memuat apa pun dari server lain."] },
      { h: "Alat baris perintah", p: ["Setiap kali dijalankan, alat baris perintah menanyakan ke registri npm apakah ada versi yang lebih baru. Permintaan ini tidak membawa nilai Anda sama sekali. Matikan dengan --no-update-check."] },
      { h: "Kontak", p: ["Pertanyaan tentang privasi:"], mail: true },
    ],
  },
};
