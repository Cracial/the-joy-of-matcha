import { useEffect, useState } from "react";
import axios from "axios";
import ProductCard from "../components/ProductCard";
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    axios.get(`${API}/api/products`)
      .then(({ data }) => { if (active) setProducts(Array.isArray(data?.data) ? data.data : []); })
      .catch(() => { if (active) setError("Gagal memuat katalog. Silakan coba lagi."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return (
    <section className="min-h-[65vh] bg-[#f8f1e9]">
      <div className="mx-auto max-w-6xl px-6 py-14 lg:py-20">
        <header className="mb-11 max-w-2xl">
          <p className="joy-eyebrow">Our menu</p>
          <h1 className="joy-section-title mt-3">Our matcha collection.</h1>
          <p className="mt-4 leading-7 text-[#776f61]">Kenali karakter setiap minuman, tentukan penyajian serta sweetness, lalu pilih yang paling sesuai dengan seleramu.</p>
        </header>
        {loading && <p role="status" className="text-[#776f61]">Memuat produk...</p>}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
        {!loading && !error && (products.length ? <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">{products.map(product => <ProductCard key={product._id} product={product}/>)}</div> : <p className="rounded-xl border border-[#e6dccd] bg-[#fffaf4] p-6 text-[#776f61]">Produk belum tersedia.</p>)}
      </div>
    </section>
  );
}
