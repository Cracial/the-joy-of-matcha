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

  if (loading) return <section className="joy-page"><p role="status">Memuat produk...</p></section>;
  if (error || !product) return (
    <section className="joy-page">
      <p role="alert" className="text-red-700">{error || "Produk tidak ditemukan."}</p>
      <Link to="/products" className="mt-4 inline-block text-green-800 underline">← Kembali ke menu</Link>
    </section>
  );

  const soldOut = Number(product.stock) <= 0;
  const hasVariants = !!(product.availableStyles?.length && product.availableSweetness?.length);
  const maxQuantity = Math.max(1, Math.min(Number(product.stock) || 0, 10));
  const canAdd = !soldOut && hasVariants && Number.isSafeInteger(Number(quantity)) && quantity >= 1 && quantity <= maxQuantity;

  return (
    <section className="joy-page">
      <Link to="/products" className="joy-text-link">← Kembali ke menu</Link>
      <div className="mt-9 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <ProductImage image={product.image} name={product.name} detail />
        <div>
          <p className="joy-eyebrow">{product.category}</p>
          <h1 className="joy-page-title mt-3">{product.name}</h1>
          <p className="mt-5 text-2xl font-semibold text-green-800">{rupiah(product.price)}</p>
          <p className="mt-5 whitespace-pre-line leading-8 text-gray-600">{product.description}</p>
          <p className={`mt-5 text-sm font-medium ${soldOut ? "text-red-700" : "text-green-800"}`}>
            {soldOut ? "Stok habis" : `Stok tersedia: ${product.stock}`}
          </p>

          <div className="joy-panel joy-panel-inner mt-8 space-y-6">
            <h2 className="text-2xl">Atur minumanmu</h2>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-gray-800">Penyajian</legend>
              <div className="flex flex-wrap gap-2">{product.availableStyles?.map((style) => (
                <button key={style} type="button" aria-pressed={selectedStyle === style} onClick={() => { setSelectedStyle(style); setNotice(""); }}
                  className="joy-choice">{style}</button>
              ))}</div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-gray-800">Sweetness</legend>
              <div className="flex flex-wrap gap-2">{product.availableSweetness?.map((sweet) => (
                <button key={sweet} type="button" aria-pressed={selectedSweetness === sweet} onClick={() => { setSelectedSweetness(sweet); setNotice(""); }}
                  className="joy-choice">{sweet}</button>
              ))}</div>
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="text-sm font-semibold text-gray-800">Jumlah
                <input type="number" min="1" max={maxQuantity} step="1" disabled={soldOut} value={quantity}
                  onChange={(e) => { setQuantity(Number(e.target.value)); setNotice(""); }}
                  className="joy-input ml-3 w-20 text-center text-sm" />
              </label>
              <span className="text-lg font-bold text-green-900">{rupiah(product.price * (quantity || 0))}</span>
            </div>
            {!hasVariants && <p className="text-sm text-amber-800">Opsi produk belum dikonfigurasi admin.</p>}
            {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
            <button onClick={addProduct} disabled={!canAdd || adding} className="joy-button w-full disabled:bg-gray-400">
              {soldOut ? "Stok Habis" : adding ? "Memeriksa harga & stok..." : "Tambah ke Keranjang"}
            </button>
            <Link to="/cart" className="joy-text-link mt-3 w-full justify-center">Lihat Keranjang →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
