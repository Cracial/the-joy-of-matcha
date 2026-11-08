"use strict";

const { normalize, productNamesIn } = require("./chatService");

const ORDER_WORDS = /\b(pesan|pesenin|pesankan|beli|belikan|order|checkout|tambah|tambahkan|tambahin|masukkan|masukin|masukkin)\b|\bmasuk(?:kan)?\s+(?:ke\s+)?keranjang\b/i;
const NOT_ORDER = /\b(cara|bagaimana|gimana|tutorial|panduan|bisa nggak|bisa gak|bisa ga)\s+(?:untuk\s+)?(?:pesan|beli|order|checkout|masukkan)\b/i;
const REFER_BACK = /\b(yang tadi|yang itu|itu aja|itu saja|pilihan tadi|minuman tadi)\b/i;

function customerOrderIntent(message) {
  const text = normalize(message);
  // Only explicit purchase intent can generate a purchase-selection card.
  return ORDER_WORDS.test(text) && !NOT_ORDER.test(text);
}

function mentionedQuantity(message) {
  const text = normalize(message);
  const amount = text.match(/\b(\d{1,3})\s*(?:cup|gelas|botol|pcs|porsi|buah|x)\b/) ||
    text.match(/\b(?:pesan|beli|order|ambil|tambah|tambahkan)\s+(\d{1,3})\b/) ||
    text.match(/\b(\d{1,3})\s+(?:mori|hinoka|kinko|ubee|majicha|corn)\b/);
  if (!amount) return 1;
  const quantity = Number(amount[1]);
  return Number.isSafeInteger(quantity) && quantity >= 1 ? quantity : null;
}

function selectedOption(message, allowed, kind) {
  const text = normalize(message);
  if (kind === "style") {
    const cold = /\b(dingin|iced|cold|es)\b/.test(text);
    const hot = /\b(panas|hangat|hot|warm)\b/.test(text);
    if (cold && hot) return null;
    const wanted = cold ? "cold" : hot ? "hot" : null;
    if (!wanted) return null;
    return allowed.find((v) => normalize(v).includes(wanted)) || null;
  }
  let wanted = null;
  if (/\b(no sweet|tanpa gula|tidak manis|nggak manis|gak manis)\b/.test(text)) wanted = "no sweet";
  else if (/\b(less sweet|kurang manis|tidak terlalu manis|nggak terlalu manis|ga terlalu manis|sedikit manis)\b/.test(text)) wanted = "less sweet";
  else if (/\b(normal sweet|normal|gula biasa|manis biasa)\b/.test(text)) wanted = "normal";
  return wanted ? allowed.find((v) => normalize(v) === wanted) || null : null;
}

function orderPlan(message, products, history = []) {
  if (!customerOrderIntent(message)) return null;
  let named = productNamesIn(message, products);
  const userText = normalize(message);
  if (named.length === 0 && REFER_BACK.test(userText)) {
    const last = [...history].reverse().find((entry) => entry?.role === "assistant" && typeof entry.content === "string");
    if (last) {
      const possible = productNamesIn(last.content, products);
      if (possible.length === 1) named = possible;
    }
  }
  if (named.length !== 1) {
    return { reply: named.length > 1
      ? "Kamu menyebut beberapa minuman. Pilih satu dulu dari kartu menu, lalu atur penyajian, sweetness, dan jumlahnya, ya."
      : "Boleh! Minuman yang mana? Sebutkan nama menu (misalnya Mori) atau pilih dari katalog, ya.",
      quickReplies: ["Lihat menu", "Rekomendasi yang creamy"] };
  }
  const p = named[0];
  if (!Number.isInteger(Number(p.stock)) || Number(p.stock) < 1) {
    return { reply: `${p.name} sedang habis. Aku bisa bantu carikan alternatif dari menu yang masih tersedia.`, quickReplies: ["Lihat menu", "Rekomendasi yang creamy"] };
  }
  const quantity = mentionedQuantity(message);
  if (!quantity || quantity > 100) return { reply: "Jumlah yang kamu minta belum valid. Pilih 1 sampai 10 gelas per penambahan di kartu pemesanan, ya." };
  const styles = Array.isArray(p.availableStyles) ? p.availableStyles.filter((v) => typeof v === "string") : [];
  const sweetness = Array.isArray(p.availableSweetness) ? p.availableSweetness.filter((v) => typeof v === "string") : [];
  if (styles.length === 0 || sweetness.length === 0) return { reply: `Varian ${p.name} belum dikonfigurasi. Silakan lihat detailnya atau pilih menu lain.` };
  const style = selectedOption(message, styles, "style");
  const sweet = selectedOption(message, sweetness, "sweetness");
  const explicitStyle = /\b(dingin|iced|cold|es|panas|hangat|hot|warm)\b/.test(userText);
  const explicitSweet = /\b(no sweet|tanpa gula|tidak manis|nggak manis|gak manis|less sweet|kurang manis|tidak terlalu manis|nggak terlalu manis|ga terlalu manis|sedikit manis|normal)\b/.test(userText);
  const notes = [];
  if (explicitStyle && !style) notes.push("Pilihan suhu yang disebut belum tersedia atau belum jelas, silakan pilih di bawah.");
  if (explicitSweet && !sweet) notes.push("Pilihan sweetness yang disebut belum tersedia, silakan pilih di bawah.");
  const qty = Math.min(quantity, 10, Number(p.stock));
  if (quantity > qty) notes.push(`Jumlah dibatasi menjadi ${qty} sesuai batas penambahan dan stok saat ini.`);
  return {
    reply: `Siap, kita atur ${p.name} dulu. Periksa varian dan jumlahnya, lalu tekan Konfirmasi Tambah ke Keranjang. Belum ada pesanan atau pembayaran yang dibuat.${notes.length ? "\n" + notes.join("\n") : ""}`,
    proposal: {
      productId: String(p._id), quantity: qty,
      selectedStyle: style, selectedSweetness: sweet,
      name: p.name, price: Number(p.price), image: p.image || "", stock: Number(p.stock),
      availableStyles: styles, availableSweetness: sweetness,
    },
  };
}

module.exports = { customerOrderIntent, mentionedQuantity, selectedOption, orderPlan };
