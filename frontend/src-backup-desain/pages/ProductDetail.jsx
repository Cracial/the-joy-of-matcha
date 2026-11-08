import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProductImage from "../components/ProductImage";
import { useCart } from "../context/CartContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const rupiah = (n) => `Rp${Number(n || 0).toLocaleString("id-ID")}`;

export default function ProductDetail() {
  const { id } = useParams();
  const { addConfiguredToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState("");
  const [selectedSweetness, setSelectedSweetness] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setNotice("");
    fetch(`${API}/api/products/${encodeURIComponent(id)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success || !json.data) throw new Error(json.message || "Produk tidak ditemukan.");
        return json.data;
      })
      .then((p) => {
        if (!active) return;
        setProduct(p);
        setSelectedStyle(p.availableStyles?.[0] || "");
        setSelectedSweetness(p.availableSweetness?.includes("Normal") ? "Normal" : p.availableSweetness?.[0] || "");
        setQuantity(1);
      })
      .catch((e) => { if (active) setError(e.message || "Gagal mengambil detail produk."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function addProduct() {
    if (!product || !selectedStyle || !selectedSweetness || adding) return;
    setNotice(""); setAdding(true);
    try {
      const response = await fetch(`${API}/api/products/${encodeURIComponent(id)}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error("Gagal memeriksa produk terbaru.");
      const current = result.data;
      if (Number(current.price) !== Number(product.price)) {
        setProduct(current);
        throw new Error(`Harga terbaru ${rupiah(current.price)}. Periksa lagi sebelum menambah ke keranjang.`);
      }
      if (!current.availableStyles.includes(selectedStyle) || !current.availableSweetness.includes(selectedSweetness)) {
        setProduct(current);
        throw new Error("Pilihan varian berubah. Pilih ulang sebelum menambahkan.");
      }
      if (!addConfiguredToCart(current, { selectedStyle, selectedSweetness, quantity }))
        throw new Error("Stok tidak mencukupi atau jumlah tidak valid. Periksa keranjang, ya.");
      setNotice(`${quantity} × ${current.name} berhasil masuk keranjang.`);
    } catch (e) { setNotice(e.message || "Ada masalah saat menambahkan produk."); }
    finally { setAdding(false); }
  }

  if (loading) return <section className="mx-auto max-w-6xl px-6 py-12"><p>Memuat produk...</p></section>;
  if (error || !product) return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <p role="alert" className="text-red-700">{error || "Produk tidak ditemukan."}</p>
      <Link to="/products" className="mt-4 inline-block text-green-800 underline">← Kembali ke menu</Link>
    </section>
  );

  const soldOut = Number(product.stock) <= 0;
  const hasVariants = !!(product.availableStyles?.length && product.availableSweetness?.length);
  const maxQuantity = Math.max(1, Math.min(Number(product.stock) || 0, 10));
  const canAdd = !soldOut && hasVariants && Number.isSafeInteger(Number(quantity)) && quantity >= 1 && quantity <= maxQuantity;

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <Link to="/products" className="text-sm text-green-800 hover:underline">← Kembali ke Produk</Link>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <ProductImage image={product.image} name={product.name} detail />
        <div>
          <p className="text-sm font-medium text-green-700">{product.category}</p>
          <h1 className="mt-2 text-4xl font-bold text-gray-900">{product.name}</h1>
          <p className="mt-4 text-2xl font-bold text-green-800">{rupiah(product.price)}</p>
          <p className="mt-5 whitespace-pre-line leading-7 text-gray-600">{product.description}</p>
          <p className={`mt-5 text-sm font-medium ${soldOut ? "text-red-700" : "text-green-800"}`}>
            {soldOut ? "Stok habis" : `Stok tersedia: ${product.stock}`}
          </p>

          <div className="mt-7 space-y-5 rounded-2xl border border-green-100 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">Atur minumanmu</h2>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-gray-800">Penyajian</legend>
              <div className="flex flex-wrap gap-2">{product.availableStyles?.map((style) => (
                <button key={style} type="button" aria-pressed={selectedStyle === style} onClick={() => { setSelectedStyle(style); setNotice(""); }}
                  className={`rounded-lg border px-4 py-2 text-sm ${selectedStyle === style ? "border-green-800 bg-green-800 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-green-800"}`}>{style}</button>
              ))}</div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-gray-800">Sweetness</legend>
              <div className="flex flex-wrap gap-2">{product.availableSweetness?.map((sweet) => (
                <button key={sweet} type="button" aria-pressed={selectedSweetness === sweet} onClick={() => { setSelectedSweetness(sweet); setNotice(""); }}
                  className={`rounded-lg border px-4 py-2 text-sm ${selectedSweetness === sweet ? "border-green-800 bg-green-800 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-green-800"}`}>{sweet}</button>
              ))}</div>
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="text-sm font-semibold text-gray-800">Jumlah
                <input type="number" min="1" max={maxQuantity} step="1" disabled={soldOut} value={quantity}
                  onChange={(e) => { setQuantity(Number(e.target.value)); setNotice(""); }}
                  className="ml-3 w-20 rounded-lg border border-gray-300 p-2 text-center text-sm" />
              </label>
              <span className="text-lg font-bold text-green-900">{rupiah(product.price * (quantity || 0))}</span>
            </div>
            {!hasVariants && <p className="text-sm text-amber-800">Opsi produk belum dikonfigurasi admin.</p>}
            {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
            <button onClick={addProduct} disabled={!canAdd || adding} className="w-full rounded-xl bg-green-800 px-6 py-3 font-semibold text-white hover:bg-green-900 disabled:bg-gray-400">
              {soldOut ? "Stok Habis" : adding ? "Memeriksa harga & stok..." : "Tambah ke Keranjang"}
            </button>
            <Link to="/cart" className="block text-center text-sm font-medium text-green-800 underline">Lihat Keranjang →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
