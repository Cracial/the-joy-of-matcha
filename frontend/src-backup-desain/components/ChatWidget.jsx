import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProductImage from "./ProductImage";
import { useCart } from "../context/CartContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const money = (price) => `Rp${Number(price || 0).toLocaleString("id-ID")}`;
const welcome = { role: "assistant", content: "Hai! 🍵 Aku Joy, asisten The Joy of Matcha. Aku bisa bantu pilih minuman sesuai selera dan budget, mengatur variannya, sampai memasukkannya ke keranjang. Mau mulai dari mana?" };
const starters = ["Lihat menu dan harga", "Rekomendasi untuk pemula", "Minuman creamy maksimal 60 ribu", "Cara pesan tanpa login"];
const localCartQuestion = (s) => /\b(isi keranjang|keranjangku|keranjang saya|total belanja|total keranjang|berapa di keranjang)\b/i.test(s);

function messageRecord(entry) { return { role: entry.role, content: entry.content }; }
function productId(product) { return String(product?.productId || product?.id || product?._id || ""); }
function displayAnswer(entry) {
  const content = String(entry.content || "");
  if (!entry.suggestions?.length) return content;
  const lines = content.split("\n");
  const listed = lines.filter((line) => /^\s*•\s+/.test(line));
  // Only remove repeated bullet listing when all listed products have visible
  // cards; never hide a full menu that includes more products than 3 cards.
  if (listed.length && listed.length === entry.suggestions.length) {
    return lines.filter((line) => !/^\s*•\s+/.test(line) && !/^(?:Buka kartu|Klik produk)/i.test(line.trim()))
      .join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  return content;
}

export default function ChatWidget() {
  const navigate = useNavigate();
  const { cartItems, totalItems, totalPrice, addConfiguredToCart } = useCart();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([welcome]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(null);
  const [config, setConfig] = useState(null);
  const [productLoading, setProductLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ block: "end" }); }, [messages, loading, config, open]);
  useEffect(() => () => abortRef.current?.abort(), []);

  function pushAssistant(content, extra = {}) {
    setMessages((items) => [...items, { role: "assistant", content, ...extra }]);
  }
  async function sendMessage(event, picked) {
    event?.preventDefault?.();
    const message = (typeof picked === "string" ? picked : draft).trim();
    if (!message || loading || productLoading || saving) return;
    const history = messages.slice(-24).map(messageRecord);
    setMessages((items) => [...items, { role: "user", content: message }]);
    setDraft("");
    setConfig(null);
    setActionError("");

    // The cart is local guest data. Never send it or customer PII to an AI service.
    if (localCartQuestion(message)) {
      const lines = cartItems.map((item) => `• ${item.quantity} × ${item.name} (${item.selectedStyle}, ${item.selectedSweetness})`);
      pushAssistant(lines.length
        ? `Ini isi keranjangmu saat ini:\n${lines.join("\n")}\nTotal perkiraan: ${money(totalPrice)}. Harga dan stok akan diverifikasi lagi saat pembayaran.`
        : "Keranjangmu masih kosong. Mau aku bantu pilih minuman?", { quickReplies: ["Lihat menu dan harga"] });
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      let response;
      try {
        response = await fetch(`${API}/api/chat`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, history }), signal: controller.signal,
        });
      } catch (networkError) {
        if (networkError.name === "AbortError") throw networkError;
        throw new Error("Tidak bisa terhubung ke Joy. Periksa koneksi dan pastikan backend berjalan.");
      }
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Joy belum bisa menjawab.");
      if (abortRef.current !== controller) return;
      const answer = json.data || {};
      setMode(answer.mode === "ai" ? "ai" : "catalog");
      pushAssistant(typeof answer.reply === "string" ? answer.reply : "Boleh diulang pertanyaannya?", {
        suggestions: Array.isArray(answer.suggestions) ? answer.suggestions.slice(0, 6) : [],
        quickReplies: Array.isArray(answer.quickReplies) ? answer.quickReplies.slice(0, 3) : [],
        cartProposal: answer.cartProposal || null,
      });
      if (answer.cartProposal) {
        setConfig({ proposal: answer.cartProposal, selectedStyle: answer.cartProposal.selectedStyle || "",
          selectedSweetness: answer.cartProposal.selectedSweetness || "", quantity: answer.cartProposal.quantity || 1 });
      }
    } catch (error) {
      if (error.name !== "AbortError" && abortRef.current === controller) pushAssistant(error.message || "Ada kendala. Coba lagi, ya.");
    } finally {
      if (abortRef.current === controller) { abortRef.current = null; setLoading(false); }
    }
  }

  async function configureProduct(product, suggested = null) {
    const id = productId(product);
    if (!id) return;
    setProductLoading(true);
    setActionError("");
    try {
      const response = await fetch(`${API}/api/products/${encodeURIComponent(id)}`);
      const body = await response.json();
      if (!response.ok || !body.success || !body.data) throw new Error(body.message || "Produk tidak tersedia.");
      const latest = body.data;
      if (Number(latest.stock) < 1) throw new Error(`${latest.name} sedang habis.`);
      if (!latest.availableStyles?.length || !latest.availableSweetness?.length) throw new Error("Pilihan produk belum dikonfigurasi oleh admin.");
      setConfig({ proposal: { ...latest, productId: String(latest._id) },
        selectedStyle: latest.availableStyles.includes(suggested?.selectedStyle) ? suggested.selectedStyle : latest.availableStyles[0],
        selectedSweetness: latest.availableSweetness.includes(suggested?.selectedSweetness)
          ? suggested.selectedSweetness : latest.availableSweetness.includes("Normal") ? "Normal" : latest.availableSweetness[0],
        quantity: Math.max(1, Math.min(Number(suggested?.quantity || 1), 10, Number(latest.stock))) });
    } catch (error) { setActionError(error.message || "Tidak dapat membuka varian."); }
    finally { setProductLoading(false); }
  }

  async function confirmAdd() {
    if (!config || saving) return;
    if (!config.selectedStyle || !config.selectedSweetness) {
      setActionError("Pilih style dan sweetness sebelum menambahkan minuman."); return;
    }
    setSaving(true);
    setActionError("");
    try {
      // Critical: never trust AI-provided price, stock or available variants.
      const id = productId(config.proposal);
      const response = await fetch(`${API}/api/products/${encodeURIComponent(id)}`);
      const body = await response.json();
      if (!response.ok || !body.success || !body.data) throw new Error("Produk tidak tersedia lagi.");
      const latest = body.data;
      if (Number(latest.price) !== Number(config.proposal.price)) {
        setConfig((previous) => ({ ...previous, proposal: { ...latest, productId: String(latest._id) } }));
        throw new Error(`Harga ${latest.name} berubah menjadi ${money(latest.price)}. Periksa subtotal dan konfirmasi lagi.`);
      }
      if (!latest.availableStyles.includes(config.selectedStyle) ||
          !latest.availableSweetness.includes(config.selectedSweetness)) {
        throw new Error("Pilihan varian produk berubah. Pilih ulang dari kartu produk.");
      }
      if (!addConfiguredToCart(latest, { quantity: Number(config.quantity), selectedStyle: config.selectedStyle,
        selectedSweetness: config.selectedSweetness })) {
        throw new Error("Stok tidak mencukupi atau jumlah tidak valid. Periksa keranjang dan coba lagi.");
      }
      pushAssistant(`Sudah ditambahkan ke keranjang: ${config.quantity} × ${latest.name}, ${config.selectedStyle}, ${config.selectedSweetness}. ✅\nKamu bisa lanjut pilih minuman lain atau periksa keranjang sebelum checkout.`,
        { cartSuccess: true, quickReplies: ["Ada rekomendasi lain?", "Cara pesan tanpa login"] });
      setConfig(null);
    } catch (error) { setActionError(error.message || "Gagal menambahkan ke keranjang."); }
    finally { setSaving(false); }
  }

  function resetConversation() {
    abortRef.current?.abort();
    setMessages([welcome]); setDraft(""); setConfig(null); setActionError(""); setLoading(false); setMode(null);
  }
  const latestMessage = messages.at(-1);
  const promptOptions = messages.length === 1 ? starters : latestMessage?.role === "assistant" ? latestMessage.quickReplies || [] : [];

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {open && (
        <section aria-label="Joy AI Shopping Assistant" className="mb-3 flex h-[min(680px,84dvh)] w-[min(440px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-green-100 bg-white shadow-2xl">
          <header className="flex shrink-0 items-center justify-between gap-2 bg-green-900 px-4 py-3 text-white">
            <div className="min-w-0">
              <h2 className="font-semibold">🍵 Joy · Asisten Belanja</h2>
              <p className="text-xs text-green-100">{mode === "ai" ? "Groq AI aktif · data dari katalog" : "Asisten katalog · siap bantu pesan"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={resetConversation} className="rounded-lg px-2 py-2 text-xs hover:bg-green-800" title="Mulai ulang chat">Ulangi</button>
              <button type="button" aria-label="Tutup Joy" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2 hover:bg-green-800">✕</button>
            </div>
          </header>
          <div className="flex shrink-0 items-center justify-between border-b border-green-100 bg-white px-4 py-2 text-xs text-green-900">
            <span>🛒 {totalItems} minuman · {money(totalPrice)}</span>
            <div className="flex gap-3 font-semibold">
              <button type="button" onClick={() => { navigate("/cart"); setOpen(false); }} className="hover:underline">Keranjang</button>
              {totalItems > 0 && <button type="button" onClick={() => { navigate("/cart"); setOpen(false); }} className="hover:underline">Periksa & checkout</button>}
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-[#f8faf7] p-3 sm:p-4" aria-live="polite">
            {messages.map((entry, index) => (
              <div key={index} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[98%] space-y-2">
                  <p className={`whitespace-pre-line rounded-xl px-3 py-2 text-sm leading-6 ${entry.role === "user" ? "bg-green-800 text-white" : "border border-green-100 bg-white text-gray-800"}`}>{displayAnswer(entry)}</p>
                  {entry.suggestions?.length > 0 && <div className="space-y-2">
                    {entry.suggestions.map((product) => (
                      <div key={product.id} className="flex items-center gap-2 rounded-xl border border-green-100 bg-white p-2 shadow-sm">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg"><ProductImage image={product.image} name={product.name} thumbnail /></div>
                        <div className="min-w-0 flex-1">
                          <strong className="block text-sm text-green-950">{product.name}</strong>
                          <p className="text-xs text-gray-600">{money(product.price)} · Stok {product.stock}</p>
                          {product.reason && <p className="mt-1 line-clamp-2 text-xs text-gray-600">{product.reason}</p>}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                            <Link to={`/products/${product.id}`} onClick={() => setOpen(false)} className="text-green-800 underline">Detail</Link>
                            <button type="button" disabled={productLoading || product.stock < 1} onClick={() => configureProduct(product)} className="rounded-lg bg-green-800 px-2 py-1 text-white disabled:opacity-50">Pilih & tambah</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>}
                  {entry.cartSuccess && <button type="button" onClick={() => { navigate("/cart"); setOpen(false); }} className="rounded-lg bg-green-800 px-3 py-2 text-xs font-semibold text-white">Periksa keranjang →</button>}
                  {entry.cartProposal && <button type="button" disabled={productLoading} onClick={() => configureProduct(entry.cartProposal, entry.cartProposal)} className="rounded-lg border border-green-700 bg-white px-3 py-2 text-xs font-semibold text-green-800">Ubah pilihan {entry.cartProposal.name}</button>}
                </div>
              </div>
            ))}
            {config && (
              <div className="rounded-xl border-2 border-green-700 bg-white p-3 shadow-sm" aria-label="Konfirmasi pilihan minuman">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-green-900">Atur {config.proposal.name}</h3>
                  <button type="button" onClick={() => { setConfig(null); setActionError(""); }} className="text-xs text-gray-600 underline">Batal</button>
                </div>
                <p className="mb-3 text-xs text-gray-600">{money(config.proposal.price)} per gelas · Stok {config.proposal.stock}</p>
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-gray-700">Penyajian
                    <select value={config.selectedStyle} onChange={(e) => setConfig((c) => ({ ...c, selectedStyle: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm">
                      <option value="">Pilih style</option>
                      {config.proposal.availableStyles?.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-gray-700">Sweetness
                    <select value={config.selectedSweetness} onChange={(e) => setConfig((c) => ({ ...c, selectedSweetness: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm">
                      <option value="">Pilih sweetness</option>
                      {config.proposal.availableSweetness?.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-gray-700">Jumlah gelas
                    <input type="number" min="1" max={Math.min(10, Number(config.proposal.stock))} step="1" value={config.quantity} onChange={(e) => setConfig((c) => ({ ...c, quantity: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm" />
                  </label>
                </div>
                <p className="mt-3 text-sm font-semibold text-green-900">Subtotal: {money(Number(config.proposal.price) * Number(config.quantity))}</p>
                <p className="my-2 text-xs text-gray-600">Belum ada transaksi. Pilihan akan masuk keranjang setelah kamu konfirmasi.</p>
                <button type="button" disabled={saving || productLoading || !config.selectedStyle || !config.selectedSweetness || !Number.isInteger(Number(config.quantity)) || Number(config.quantity) < 1 || Number(config.quantity) > Math.min(10, Number(config.proposal.stock))} onClick={confirmAdd} className="w-full rounded-lg bg-green-800 px-3 py-3 text-sm font-semibold text-white disabled:bg-gray-400">{saving ? "Memeriksa stok..." : "Konfirmasi Tambah ke Keranjang"}</button>
              </div>
            )}
            {actionError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{actionError}</p>}
            {productLoading && <p role="status" className="text-xs text-gray-500">Mengambil varian dan stok terbaru...</p>}
            {!loading && !config && promptOptions.length > 0 && <div className="flex flex-wrap gap-2">{promptOptions.map((prompt) => <button type="button" key={prompt} onClick={() => sendMessage(null, prompt)} className="rounded-full border border-green-200 bg-white px-3 py-2 text-xs text-green-800 hover:bg-green-100">{prompt}</button>)}</div>}
            {loading && <p role="status" className="text-sm text-gray-500">Joy sedang memikirkan jawaban...</p>}
            <div ref={bottomRef} />
          </div>
          <p className="shrink-0 border-t px-3 py-2 text-[11px] leading-4 text-gray-500">Harga & stok dicek ulang saat pembayaran. Jangan kirim nomor HP, bukti bayar, atau tautan rahasia ke chat.</p>
          <form onSubmit={sendMessage} className="flex shrink-0 gap-2 bg-white p-3">
            <input aria-label="Tulis pesan untuk Joy" value={draft} maxLength={500} onChange={(e) => setDraft(e.target.value)} placeholder="Contoh: pesan 2 Mori dingin less sweet" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-700" />
            <button disabled={loading || saving || productLoading || !draft.trim()} type="submit" className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300">Kirim</button>
          </form>
        </section>
      )}
      <button type="button" aria-label={open ? "Tutup asisten" : "Buka asisten belanja"} onClick={() => setOpen((v) => !v)} className="ml-auto flex items-center gap-2 rounded-full bg-green-900 px-5 py-3 font-semibold text-white shadow-lg hover:bg-green-800">💬 {open ? "Tutup" : "Tanya Joy"}</button>
    </div>
  );
}
