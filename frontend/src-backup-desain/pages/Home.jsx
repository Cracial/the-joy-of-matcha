import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import ProductCard from "../components/ProductCard";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    axios.get(`${API}/api/products`)
      .then(({ data }) => { if (active) setProducts(Array.isArray(data?.data) ? data.data : []); })
      .catch(() => { if (active) setError("Katalog sedang tidak bisa dimuat. Silakan coba kembali."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // Foto dipilih dari produk nyata di MongoDB, bukan gambar statis/AI.
  const featured = products.find((p) => p.image && p.stock > 0) || products.find((p) => p.image);

  return (
    <>
      <section className="joy-hero">
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.15fr_.85fr] lg:gap-20 lg:py-24">
          <div className="relative z-10">
            <p className="joy-eyebrow">Welcome to the joy of matcha</p>
            <h1 className="joy-hero-title mt-5">A little <em>joy</em><br />in every sip.</h1>
            <p className="joy-hero-body mt-6">Nikmati momen kecil bersama pilihan minuman matcha. Jelajahi menu, pilih penyajian sesuai selera, dan pesan dengan mudah—tanpa perlu login.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link className="joy-button" to="/products">Jelajahi menu <span aria-hidden="true">↗</span></Link>
              <Link className="joy-button joy-button-outline" to="/about">Cerita kami</Link>
            </div>
            <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold uppercase tracking-widest text-[#817963]">
              <span>✦ Hot & Cold</span><span>✦ Sesuaikan sweetness</span><span>✦ Tanya Joy</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[390px]">
            <div className="joy-hero-photo relative aspect-[4/5]">
              {featured ? <img src={featured.image} alt={`Pilihan menu The Joy of Matcha: ${featured.name}`} className="absolute inset-0 h-full w-full object-contain" /> : <div className="joy-hero-placeholder"><span className="joy-display text-center text-5xl leading-tight text-[#6b7655]">the joy<br/>of matcha</span></div>}
            </div>
            <p className="joy-hero-note mt-6 text-center">Good drinks · Good moments</p>
          </div>
        </div>
      </section>
      <section id="produk" className="bg-[#f8f1e9]">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="joy-eyebrow">From our collection</p>
              <h2 className="joy-section-title mt-3">Temukan favoritmu.</h2>
              <p className="mt-3 max-w-2xl leading-7 text-[#776f61]">Setiap selera punya pilihannya sendiri. Jelajahi menu yang tersedia dan pilih varian yang kamu suka.</p>
            </div>
            <Link to="/products" className="joy-card-link">Lihat semua menu ↗</Link>
          </div>
          {loading && <p role="status" className="py-10 text-[#706b60]">Memuat produk...</p>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
          {!loading && !error && (
            products.length ? <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">{products.slice(0, 6).map(product => <ProductCard key={product._id} product={product} />)}</div>
              : <div className="rounded-2xl border border-[#e0d7c7] bg-[#fffaf4] p-9 text-[#6a645a]">Belum ada produk yang ditampilkan.</div>
          )}
        </div>
      </section>
      <section className="bg-[#e9eadc]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-13 md:flex-row md:items-center md:justify-between">
          <div><p className="joy-eyebrow">Need a little help?</p><h2 className="joy-display mt-2 text-3xl text-[#455039]">Bingung memilih minuman?</h2><p className="mt-2 text-sm text-[#686e58]">Tanya Joy tentang menu, harga, stok, dan rekomendasi sesuai selera.</p></div>
          <Link to="/products" className="joy-button self-start">Mulai dari menu ↗</Link>
        </div>
      </section>
    </>
  );
}
