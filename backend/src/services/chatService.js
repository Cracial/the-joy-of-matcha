"use strict";

// Logika rekomendasi terpisah dari API agar bisa diuji tanpa database atau API key.
const rupiah = (value) => `Rp${Number(value).toLocaleString("id-ID")}`;
const normalize = (value) => String(value ?? "").normalize("NFKC").toLocaleLowerCase("id-ID").trim();
const validStock = (p) => Number.isFinite(Number(p.stock)) && Number(p.stock) > 0;
const publicProduct = (product) => ({
  id: String(product._id ?? product.id ?? ""),
  name: String(product.name ?? ""),
  price: Number(product.price),
  stock: Number(product.stock),
  image: typeof product.image === "string" ? product.image : "",
  reason: String(product.description ?? "").slice(0, 145),
});

function parseBudget(message) {
  const text = normalize(message);
  // Hindari menganggap angka kuantitas, nomor telepon, atau tahun sebagai budget.
  const hasMoneyContext = /budget|anggaran|harga|murah|di bawah|dibawah|kurang dari|maksimal|max\b|under\b|sampai|sekitar|rp\.?\s*\d/.test(text);
  const regexp = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{1,7})\s*(juta|ribu|rb|k|jt)?\b/gi;
  const matches = [...text.matchAll(regexp)];
  if (!matches.length) return null;
  const values = matches.map((match) => {
    const raw = match[1];
    const unit = match[2] || "";
    let value = /^[0-9]{1,3}(?:[.,][0-9]{3})+$/.test(raw) ? Number(raw.replace(/[.,]/g, "")) : Number(raw);
    if (["ribu", "rb", "k"].includes(unit)) value *= 1000;
    if (["juta", "jt"].includes(unit)) value *= 1_000_000;
    if (!unit && value < 1000 && hasMoneyContext && /budget|anggaran|di bawah|dibawah|maksimal/.test(text)) value *= 1000;
    return value;
  }).filter((value) => Number.isFinite(value) && value >= 1000 && value <= 10_000_000);
  if (!values.length || (!hasMoneyContext && !/\d\s*(?:rb|ribu|k|jt|juta)\b/.test(text))) return null;
  // Rentang "50–60 ribu" sering berarti batas atas 60 ribu; bila unit
  // hanya di akhir, angka pertama (50) juga perlu dibaca sebagai ribuan.
  return values.at(-1);
}

function budgetIsStrict(message) {
  return /di bawah|dibawah|kurang dari|under\b|<\s*rp?\b/.test(normalize(message));
}

// Pilihan kadar gula bukan bukti karakter rasa minuman.
const asksLessSweet = (text) => /less sweet|kurang manis|tidak terlalu manis|nggak terlalu manis|gak terlalu manis|ga terlalu manis|tak terlalu manis|sedikit manis/.test(normalize(text));
const asksNoSweet = (text) => /no sweet|tanpa gula|tidak manis|gak manis|nggak manis|ga manis/.test(normalize(text));
const isAlternative = (text) => /\b(yang lain|alternatif|selain itu|lainnya|pilihan lain|ada yang lain)\b/.test(normalize(text));

const prefer = {
  creamy: ["creamy", "cream", "krimi", "velvety", "milky"],
  mild: ["lembut", "ringan", "mild", "smooth", "gentle", "delicate"],
  strong: ["bold", "kuat", "intense", "pekat", "strong"],
  roasted: ["roasted", "panggang", "hojicha", "sangrai", "nutty"],
  sweet: ["manis", "sweet", "caramel", "karamel"],
  matcha: ["matcha"],
  hojicha: ["hojicha", "roasted"],
  ube: ["ubee", "ube", "ubi", "ungu"],
  corn: ["corn", "jagung"],
};
function requestedTags(text) {
  const tags = [];
  if (/creamy|krimi|milky|velvety/.test(text)) tags.push("creamy");
  if (/tidak pahit|nggak pahit|ga pahit|gak pahit|kurang pahit|ringan|mild|lembut/.test(text)) tags.push("mild");
  if (/roasted|panggang|nutty|sangrai/.test(text)) tags.push("roasted");
  if (/\bbold\b|\bpekat\b|rasa teh(?:nya)? kuat|teh (?:yang )?kuat|rasa matcha (?:yang )?kuat|karakter (?:teh )?kuat|\bstrong\b|\bintense\b/.test(text)) tags.push("strong");
  if (/\bhojicha\b/.test(text)) tags.push("hojicha");
  if (/\bmatcha\b/.test(text)) tags.push("matcha");
  if (/\bubee?\b|ubi|ungu/.test(text)) tags.push("ube");
  if (/corn|jagung/.test(text)) tags.push("corn");
  // "tidak manis" bukan permintaan rasa yang manis.
  if (/manis|sweet|caramel|karamel/.test(text) && !asksNoSweet(text) && !asksLessSweet(text)) tags.push("sweet");
  return [...new Set(tags)];
}

function productNamesIn(message, products) {
  const text = normalize(message);
  const matches = new Set();
  for (const product of products) {
    const full = normalize(product.name);
    if (!full) continue;
    if (text.includes(full)) { matches.add(product); continue; }
    // Alias unik seperti "Ubee", "Majicha" atau "Corn", bukan kata umum
    // "Matcha" atau "Latte" yang dimiliki banyak nama produk.
    const distinctive = full.split(/\s+/).filter((word) => word.length >= 3 && !["matcha", "latte", "milk", "series", "specials"].includes(word));
    const found = distinctive.some((word) => {
      const owners = products.filter((candidate) => normalize(candidate.name).split(/\s+/).includes(word));
      return owners.length === 1 && new RegExp(`(^|[^a-z0-9])${word}(?=$|[^a-z0-9])`, "i").test(text);
    });
    if (found) matches.add(product);
  }
  return [...matches];
}

// Hanya riwayat dari sesi chat customer untuk memahami konteks, bukan sumber
// harga/stok. Data produk selalu berasal dari query MongoDB yang baru.
function resolveQuestion(message, history = []) {
  const current = normalize(message);
  const isFollowup = /^(kalau|kalo|yang|terus|trus|bagaimana|gimana|lainnya|yang lain|selain itu|kalau begitu|dan|lebih murah|lebih mahal|gimana kalau|ada alternatif|ada yang lain|alternatif lain|pilihan lain)\b/.test(current);
  if (!isFollowup || !Array.isArray(history)) return current;
  // Ambil permintaan substantif terbaru meskipun pelanggan sudah beberapa
  // kali bertanya "ada alternatif lain?". Jangan mempertahankan budget jika
  // pelanggan secara eksplisit meminta "tanpa batas harga".
  const users = history.filter((item) => item?.role === "user" && typeof item.content === "string");
  const relevant = [...users].reverse().find((item) => {
    const text = normalize(item.content);
    if (isAlternative(text) || /^(lebih murah|lebih mahal|kalau yang|yang lebih murah|yang lebih mahal)/.test(text)) return false;
    return /rekomendasi|saran|cocok|menu|pilih|budget|harga|pahit|creamy|matcha|hojicha|ribu|murah|ringan|manis|cold|dingin/.test(text);
  });
  const prior = relevant ? normalize(relevant.content) : "";
  return [prior, current].filter(Boolean).join(" ");
}

// Daftar yang BENAR-BENAR ditawarkan dalam jawaban chat sebelumnya, bukan
// sekadar nama yang disebut pengguna, menjadi sumber untuk menghindari siklus.
function listedProducts(content, products) {
  const offered = [];
  for (const line of String(content || "").split(/\r?\n/)) {
    const match = line.match(/^\s*•\s*(.*?)\s+—\s+Rp[0-9.]+/i);
    if (!match) continue;
    const product = products.find((p) => normalize(p.name) === normalize(match[1]));
    if (product && !offered.includes(product)) offered.push(product);
  }
  return offered;
}

function getPreviouslyOffered(history, products) {
  if (!Array.isArray(history)) return [];
  let start = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index]?.role === "user" && !isAlternative(history[index]?.content)) {
      start = index;
      break;
    }
  }
  return [...new Set(history.slice(start).filter((item) => item?.role === "assistant")
    .flatMap((item) => listedProducts(item.content, products)))];
}

function scoreProduct(question, product) {
  const text = normalize(`${product.name} ${product.category} ${product.description}`);
  const style = normalize((product.availableStyles || []).join(" "));
  const sweetness = normalize((product.availableSweetness || []).join(" "));
  const tags = requestedTags(question);
  const matching = tags.filter((tag) => prefer[tag]?.some((word) => text.includes(word)));
  let score = matching.length * 5;
  if (question.includes(normalize(product.name))) score += 9;
  if (/dingin|iced|cold/.test(question)) score += style.includes("cold") ? 3 : -15;
  if (/panas|hangat|hot/.test(question)) score += style.includes("hot") ? 3 : -15;
  if (asksNoSweet(question)) score += sweetness.includes("no sweet") ? 3 : -15;
  else if (asksLessSweet(question)) score += sweetness.includes("less sweet") ? 3 : -15;
  return { score, matching };
}

function getRecommendations(message, products, history = []) {
  const question = resolveQuestion(message, history);
  const limit = parseBudget(question);
  const strict = budgetIsStrict(question);
  const comparison = normalize(message);
  const mentioned = productNamesIn(comparison, products);
  let anchor = mentioned.length === 1 ? mentioned[0] : null;
  let anchorFromList = false;
  if (!anchor && mentioned.length === 0 && /lebih murah|lebih mahal|di bawah harga|di atas harga/.test(comparison)) {
    const previousAnswer = [...history].reverse().find((entry) => entry?.role === "assistant")?.content || "";
    const previousList = listedProducts(previousAnswer, products);
    if (previousList.length === 1) anchor = previousList[0];
    else if (previousList.length > 1) {
      // "Lebih murah" setelah tiga pilihan = lebih murah dari pilihan
      // termurah tadi, bukan meminta pengguna mengulang nama menu.
      anchorFromList = true;
      anchor = /lebih murah|di bawah harga/.test(comparison)
        ? previousList.reduce((best, p) => Number(p.price) < Number(best.price) ? p : best)
        : previousList.reduce((best, p) => Number(p.price) > Number(best.price) ? p : best);
    } else {
      const previousNames = productNamesIn(previousAnswer, products);
      if (previousNames.length === 1) anchor = previousNames[0];
    }
  }
  const relativeCheaper = /lebih murah|di bawah harga/.test(comparison) && Boolean(anchor);
  const relativePricier = /lebih mahal|di atas harga/.test(comparison) && Boolean(anchor);
  const available = products.filter(validStock).filter((p) => {
    if (limit !== null && !(strict ? Number(p.price) < limit : Number(p.price) <= limit)) return false;
    if (anchor && relativeCheaper && !(Number(p.price) < Number(anchor.price))) return false;
    if (anchor && relativePricier && !(Number(p.price) > Number(anchor.price))) return false;
    if (anchor && isAlternative(comparison) && p === anchor) return false;
    return true;
  });
  const wantsCold = /dingin|iced|cold/.test(question);
  const wantsHot = /panas|hangat|hot/.test(question);
  const wantsNoSweet = asksNoSweet(question);
  const wantsLessSweet = asksLessSweet(question);
  const suitable = available.filter((p) => {
    const styles = normalize((p.availableStyles || []).join(" "));
    const sweetness = normalize((p.availableSweetness || []).join(" "));
    return (!wantsCold || styles.includes("cold")) && (!wantsHot || styles.includes("hot")) &&
      (!wantsNoSweet || sweetness.includes("no sweet")) && (!wantsLessSweet || sweetness.includes("less sweet"));
  });
  const scored = suitable.map((p) => ({ product: p, ...scoreProduct(question, p) }));
  const cheapest = /paling murah|termurah/.test(comparison);
  const priciest = /paling mahal|termahal/.test(comparison);
  scored.sort((a, b) => priciest ? Number(b.product.price) - Number(a.product.price) : cheapest
    ? Number(a.product.price) - Number(b.product.price)
    : b.score - a.score || Number(a.product.price) - Number(b.product.price));
  const flavorSpecific = requestedTags(question).filter((tag) => tag !== "matcha");
  const matchCount = (item) => item.matching.filter((tag) => flavorSpecific.includes(tag)).length;
  const bestMatch = Math.max(0, ...scored.map(matchCount));
  // Pertanyaan rasa tidak boleh dibalas dengan produk tanpa dukungan
  // deskripsi. Jika ada dua preferensi, pilih yang memenuhi paling banyak;
  // beri catatan jelas jika hanya sebagian yang terbukti dari katalog.
  let selected = flavorSpecific.length ? scored.filter((entry) => matchCount(entry) === bestMatch && bestMatch > 0) : scored;
  const partialPreference = flavorSpecific.length > 1 && bestMatch > 0 && bestMatch < flavorSpecific.length;
  let exhausted = false;
  if (isAlternative(comparison)) {
    const shown = getPreviouslyOffered(history, products);
    const unseen = selected.filter(({ product }) => !shown.includes(product));
    if (shown.length && selected.length && unseen.length === 0) exhausted = true;
    selected = unseen;
  }
  return {
    exhausted, items: selected.slice(0, cheapest || priciest ? 1 : 3).map(({ product, matching }) => ({ ...publicProduct(product), matched: matching })),
    budget: limit, strict, partialPreference,
    matchedFlavor: bestMatch > 0, askedFlavor: flavorSpecific.length > 0, totalEligible: suitable.length,
    wantsLessSweet, wantsNoSweet,
    relative: anchor && (relativeCheaper || relativePricier) ? { name: anchor.name, price: Number(anchor.price), cheaper: relativeCheaper, fromList: anchorFromList } : null,
  };
}

function recommendProducts(message, products, history = []) {
  return getRecommendations(message, products, history).items.map(({ matched, ...p }) => p);
}

function wantsSuggestions(message) {
  return /harga|menu|produk|varian|rekomendasi|saran|cocok|pilihan|stok|manis|pahit|creamy|dingin|panas|murah|budget|di bawah|dibawah|maksimal|rasa|minuman|matcha|hojicha|ubi|jagung|corn|latte|roasted|nutty|alternatif|yang lain|rasa teh|rasa tehnya|teh kuat|bold|pekat|ringan/.test(normalize(message));
}

function chatReply(message, products, history = []) {
  const question = normalize(message);
  const fullQuestion = resolveQuestion(message, history);
  let names = productNamesIn(question, products);
  // "Berapa harganya?" bisa merujuk satu produk dari jawaban sebelumnya.
  if (!names.length && /^(berapa harganya|harganya|stoknya|rasanya|bisa dingin|bisa panas|manisnya|yang itu|yang tadi)\b/.test(question)) {
    const lastAnswer = [...history].reverse().find((item) => item?.role === "assistant")?.content || "";
    const possible = productNamesIn(lastAnswer, products);
    if (possible.length === 1) names = possible;
  }
  const explicitRec = /rekomendasi|saran|pilihin|pilihkan|pilih mana|alternatif|yang lain|mirip|lebih murah|lebih mahal|di bawah harga|paling murah|termurah|paling mahal|termahal/.test(question);
  const quick = (arr) => arr;
  const noSuggestions = (reply, quickReplies = []) => ({ reply, suggestions: [], quickReplies });

  if (/alergi|alergen|kalori|gizi|laktosa|vegan|diabet|hamil|kafein|gluten|halal|tanpa susu|bebas susu|tidak pakai susu|nggak pakai susu|gak pakai susu|ga pake susu|dairy.free|lactose.free|laktosa|aman untuk kesehatan/.test(question)) {
    return noSuggestions("Informasi kandungan, alergen, kalori, dan sertifikasi produk belum tercatat lengkap di katalog. Untuk keamanan, konfirmasi langsung ke pengelola sebelum memesan, ya.", quick(["Lihat menu", "Cara pesan"]));
  }
  if (/status|lacak|riwayat|pesanan saya|sudah dibayar|sudah masuk|sudah sampai/.test(question)) {
    return noSuggestions("Untuk cek status, buka tautan rahasia Lacak Pesanan yang kamu terima setelah upload bukti. Aku tidak bisa melihat pesanan pribadi atau memverifikasi pembayaran melalui chat. Jangan bagikan tautannya kepada siapa pun.", quick(["Cara bayar QRIS", "Lihat menu"]));
  }
  if (/bayar|qris|transfer|bukti|verifikasi|pembayaran|ditolak|refund|pengembalian/.test(question)) {
    return noSuggestions("Bayar hanya melalui QRIS resmi pada halaman pembayaran. Unggah bukti, lalu admin akan memverifikasi penerimaan dana. Jika ditolak, gunakan tautan Lacak Pesanan untuk melihat alasannya dan mengirim ulang bukti. Jika halaman bertanda MODE DEMO, jangan transfer uang sungguhan.", quick(["Cara pesan tanpa login", "Lacak pesanan"]));
  }
  if (/antar|delivery|pickup|ambil|ongkir|kirim ke|pengantaran/.test(question)) {
    return noSuggestions("Saat ini pesanan menggunakan Pickup. Delivery belum dibuka karena area layanan dan ongkir belum dikonfigurasi.", quick(["Cara pesan tanpa login", "Lihat menu"]));
  }
  if (/jam buka|buka jam|tutup jam|operasional|lokasi|alamat toko|dimana toko|di mana toko/.test(question)) {
    return noSuggestions("Jam buka dan alamat toko belum diverifikasi dalam aplikasi. Sebaiknya konfirmasi ke pengelola terlebih dahulu, ya.");
  }
  if (/^(terima kasih|makasih|thanks|thank you|sip|oke|ok[ea]?)\b/.test(question)) {
    return noSuggestions("Sama-sama! 🍵 Kalau mau pilih minuman lain atau butuh bantuan checkout, tinggal tanya Joy, ya.", quick(["Lihat menu", "Rekomendasi yang creamy"]));
  }
  if (/\b(halo|hai|hello|hi|pagi|siang|sore|malam)\b/.test(question) && question.length < 30) {
    return noSuggestions("Hai! 🍵 Lagi pengin minuman yang seperti apa? Aku bisa bantu pilih sesuai budget, karakter rasa yang tertulis di katalog, atau jelaskan cara order tanpa login.", quick(["Rekomendasi yang creamy", "Menu dan harga", "Cara pesan tanpa login"]));
  }
  // Pertanyaan terbuka dari pembeli pertama kali lebih berguna dijawab
  // dengan satu pertanyaan preferensi daripada menebak rasa produk.
  const firstTimer = /pertama kali|pemula|baru coba|baru mau coba|belum pernah (?:coba|minum)|first time|bingung (?:pilih|mau)|pilihin dong|rekomendasi dong|saran dong/.test(question);
  const specificPreference = /\b\d+\s*(?:ribu|rb|k)\b|\brp\s*[\d.]|budget|di bawah|maksimal|creamy|lembut|pahit|manis|roasted|hojicha|dingin|cold|hot|panas|mori|hinoka|kinko|ubee|majicha|corn/.test(question);
  if (firstTimer && !specificPreference && productNamesIn(question, products).length === 0) {
    return noSuggestions("Bisa banget! 🍵 Biar tidak asal pilih, kamu lebih suka rasa creamy dan ringan atau karakter teh yang kuat? Kalau ada budget, sebutkan juga ya.",
      quick(["Yang creamy dan ringan", "Yang rasa tehnya kuat", "Di bawah 60 ribu"]));
  }
  if (/\bpesan\b|\bbeli\b|\bcheckout\b|\bkeranjang\b|\border\b|cara memesan|cara order/.test(question) && !/rekomendasi/.test(question)) {
    return noSuggestions("Pesan tanpa login: pilih produk → atur penyajian dan sweetness → keranjang → isi nama, WhatsApp, serta jadwal Pickup → bayar lewat QRIS di halaman pembayaran → upload bukti. Simpan tautan Lacak Pesanan untuk memantau statusnya.", quick(["Lihat menu", "Cara bayar QRIS"]));
  }
  if (/(beda|bedanya|banding|vs\b|perbandingan|\batau\b|lebih enak)/.test(question) && names.length >= 2) {
    const selected = names.slice(0, 3);
    const text = selected.map((p) => `${p.name}: ${rupiah(p.price)}; ${validStock(p) ? `stok ${p.stock}` : "stok habis"}. ${p.description || "Belum ada deskripsi rasa."}`).join("\n");
    return { reply: `Ini perbandingannya berdasarkan data katalog, bukan penilaian rasa pribadi:\n${text}\n\nMau aku bantu pilih berdasarkan budget atau preferensi rasa?`,
      suggestions: selected.filter(validStock).map(publicProduct), quickReplies: quick(["Rekomendasi yang creamy", "Menu di bawah 60 ribu"]) };
  }
  if (/lebih murah|lebih mahal|di bawah harga|di atas harga/.test(question) && names.length === 0) {
    const last = [...history].reverse().find((entry) => entry?.role === "assistant")?.content || "";
    if (productNamesIn(last, products).length !== 1 && listedProducts(last, products).length === 0) {
      return noSuggestions("Mau dibandingkan dengan menu yang mana? Sebutkan nama produknya, misalnya 'lebih murah dari Mori', supaya aku tidak salah membandingkan.", quick(["Lihat menu", "Yang paling murah"]));
    }
  }
  const asksRecs = /rekomendasi|saran|cocok|pilihin|pilihkan|pilih mana|enak|favorit|murah|budget|di bawah|dibawah|maksimal|alternatif|yang lain|dingin|panas|creamy|pahit|manis|roasted|nutty|lebih lembut|sedikit pahit|suka/.test(question);
  // Jika menyebut satu produk dan menanyakan harga/detail, jawab hanya dari produk tersebut.
  if (names.length === 1 && !explicitRec) {
    const p = names[0];
    const styles = (p.availableStyles || []).join(", ") || "belum dicatat";
    const sweetness = (p.availableSweetness || []).join(", ") || "belum dicatat";
    const unsupported = [];
    if (/dingin|iced|cold/.test(question) && !normalize(styles).includes("cold")) unsupported.push("Cold Whisked");
    if (/panas|hangat|hot/.test(question) && !normalize(styles).includes("hot")) unsupported.push("Hot Whisked");
    if (/no sweet|tanpa gula|tidak manis|gak manis|nggak manis/.test(question) && !normalize(sweetness).includes("no sweet")) unsupported.push("No Sweet");
    else if (/less sweet|kurang manis|tidak terlalu manis|nggak terlalu manis|ga terlalu manis/.test(question) && !normalize(sweetness).includes("less sweet")) unsupported.push("Less Sweet");
    const unsupportedText = unsupported.length ? `\nCatatan: opsi ${unsupported.join(" dan ")} belum tersedia untuk ${p.name}.` : "";
    return { reply: `Tentang ${p.name}: ${p.description || "Deskripsi rasa belum tersedia di katalog."}\nHarga ${rupiah(p.price)}; stok saat ini ${p.stock}${validStock(p) ? "." : " (sedang habis)."}\nPilihan penyajian: ${styles}. Sweetness: ${sweetness}.${unsupportedText}\nKalau ingin memastikan rasa atau bahan yang tidak dijelaskan di katalog, silakan konfirmasi ke pengelola.`,
      suggestions: validStock(p) ? [publicProduct(p)] : [], quickReplies: quick(["Bandingkan menu", "Cara pesan tanpa login"]) };
  }
  if (/menu|daftar|minuman apa|jual apa|semua produk|produk apa/.test(question) && !asksRecs) {
    if (!products.length) return noSuggestions("Katalog sedang kosong. Coba lagi nanti.");
    const list = products.slice(0, 10).map((p) => `• ${p.name} — ${rupiah(p.price)} (${validStock(p) ? `stok ${p.stock}` : "habis"})`).join("\n");
    return { reply: `Ini daftar menu The Joy of Matcha:\n${list}${products.length > 10 ? `\n...dan ${products.length - 10} menu lainnya.` : ""}\n\nMau rekomendasi berdasarkan rasa atau budget?`,
      suggestions: products.filter(validStock).slice(0, 3).map(publicProduct), quickReplies: quick(["Rekomendasi yang creamy", "Menu di bawah 60 ribu"]) };
  }
  if (wantsSuggestions(question) || explicitRec || names.length || /jual|tersedia/.test(question)) {
    if (!products.length) return noSuggestions("Katalog sedang tidak tersedia. Coba lagi sebentar, ya.");
    const found = getRecommendations(message, products, history);
    if (!found.items.length) {
      if (found.exhausted) {
        return noSuggestions("Alternatif yang sesuai sudah kutampilkan semua. Mau coba budget yang berbeda atau lihat seluruh menu?", quick(["Lihat menu", "Rekomendasi tanpa batas harga"]));
      }
      if (found.askedFlavor && !found.matchedFlavor && found.totalEligible > 0) {
        const condition = found.relative
          ? `yang ${found.relative.cheaper ? "lebih murah" : "lebih mahal"} daripada ${found.relative.name}`
          : found.budget !== null ? `sesuai batas ${rupiah(found.budget)}` : "yang tersedia";
        return noSuggestions(`Ada menu ${condition}, tetapi deskripsinya belum memastikan karakter rasa yang kamu minta. Aku tidak mau asal mengklaim rasanya cocok. Kalau mau, kita bisa utamakan harga atau ubah preferensinya.`,
          quick(["Yang paling murah", "Lihat menu"]));
      }
      return noSuggestions(found.relative
        ? `Belum ada produk berstok yang ${found.relative.cheaper ? "lebih murah" : "lebih mahal"} daripada ${found.relative.name} dan cocok dengan pilihanmu. Kamu bisa melihat menu lainnya.`
        : found.budget !== null
          ? `Belum ada menu berstok dengan harga ${found.strict ? "di bawah" : "maksimal"} ${rupiah(found.budget)} dan pilihan penyajian yang kamu minta. Coba naikkan budget atau ubah pilihannya, ya.`
          : "Saat ini belum ada produk dengan stok dan pilihan penyajian yang cocok. Coba opsi lain, ya.", quick(["Lihat menu", "Rekomendasi tanpa batas harga"]));
    }
    const limitText = found.relative
      ? ` (${found.relative.cheaper ? "lebih murah" : "lebih mahal"} daripada ${found.relative.name}${found.relative.fromList ? ", pilihan " + (found.relative.cheaper ? "termurah" : "termahal") + " dari daftar tadi" : ""})`
      : found.budget === null ? "" : ` dengan harga ${found.strict ? "di bawah" : "maksimal"} ${rupiah(found.budget)}`;
    const tasteNote = found.partialPreference
      ? "Belum ada deskripsi yang memastikan semua karakter rasa yang kamu minta sekaligus. Ini pilihan yang paling mendekati. "
      : "";
    const sweetnessNote = found.wantsLessSweet
      ? "Semua pilihan berikut menyediakan opsi Less Sweet; ini bukan jaminan rasa asli produk tidak manis. "
      : found.wantsNoSweet ? "Semua pilihan berikut menyediakan opsi No Sweet. " : "";
    const listing = found.items.map((p) => `• ${p.name} — ${rupiah(p.price)} (stok ${p.stock})`).join("\n");
    return { reply: `${tasteNote}${sweetnessNote}Aku menemukan ${found.items.length} pilihan${limitText}:\n${listing}\n\nBuka kartu produk untuk memilih varian dan melanjutkan pemesanan.`,
      suggestions: found.items.map(({ matched, ...p }) => p), quickReplies: quick(["Ada alternatif lain?", "Cara pesan tanpa login"]) };
  }
  return noSuggestions("Aku bisa bantu tentang menu, harga, stok, rekomendasi berdasarkan katalog, dan cara pesan. Contohnya: 'Mori dan Hinoka bedanya apa?' atau 'Rekomendasi minuman dingin di bawah 60 ribu'.", quick(["Menu dan harga", "Rekomendasi yang creamy", "Cara pesan tanpa login"]));
}

const getFaqAnswer = (message, products, history = []) => chatReply(message, products, history).reply;
module.exports = { rupiah, normalize, parseBudget, budgetIsStrict, recommendProducts, getRecommendations, getFaqAnswer, chatReply, wantsSuggestions, productNamesIn };
