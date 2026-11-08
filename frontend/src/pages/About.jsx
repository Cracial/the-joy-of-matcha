import { Link } from "react-router-dom";

export default function About() {
  const items = [
    ["01", "Discover", "Lihat informasi produk, harga, stok, dan pilihan minuman yang tersedia."],
    ["02", "Personalize", "Pilih cara penyajian dan tingkat sweetness sesuai preferensimu."],
    ["03", "Enjoy", "Pesan melalui Guest Checkout, lalu pantau status dengan tautan pelacakan."],
  ];
  return (
    <section className="min-h-[65vh] bg-[#f8f1e9]">
      <div className="joy-page">
        <p className="joy-eyebrow">Our story</p>
        <h1 className="joy-hero-title mt-4 max-w-3xl">The joy is<br/><em>in the little things.</em></h1>
        <p className="mt-6 max-w-3xl text-lg leading-9 text-[#766e60]">The Joy of Matcha menghadirkan katalog minuman yang bisa dijelajahi dengan mudah. Kenali menu melalui informasi produk dan bantuan Joy, asisten chat yang membantu menjawab pertanyaan dan menemukan pilihan sesuai selera.</p>
        <div className="mt-12 grid gap-5 md:grid-cols-3">{items.map(([number, title, body]) => (
          <article key={number} className="joy-panel joy-panel-inner">
            <span className="text-xs font-semibold tracking-widest text-[#9b9b77]">{number}</span>
            <h2 className="mt-5 text-2xl text-[#455039]">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-[#786f60]">{body}</p>
          </article>
        ))}</div>
        <Link to="/products" className="joy-button mt-10">Jelajahi menu ↗</Link>
      </div>
    </section>
  );
}
