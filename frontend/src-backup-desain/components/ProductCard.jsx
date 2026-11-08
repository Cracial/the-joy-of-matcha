import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import ProductImage from "./ProductImage";

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  return (
    <article className="joy-product-card">
      <div className="joy-product-image"><ProductImage image={product.image} name={product.name} /></div>
      <div className="p-6">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#72785c]">{product.category}</p>
        <h3 className="mt-2 text-[1.55rem] leading-tight text-[#35402e]">{product.name}</h3>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-lg font-semibold text-[#4b583a]">Rp{Number(product.price || 0).toLocaleString("id-ID")}</p>
          <span className={`rounded-full px-3 py-1 text-xs ${product.stock > 0 ? "bg-[#e9eddf] text-[#576044]" : "bg-[#fae9e6] text-[#a25341]"}`}>{product.stock > 0 ? "Tersedia" : "Habis"}</span>
        </div>
        <div className="mt-5 flex gap-2">
          <Link to={`/products/${product._id}`} className="joy-card-link flex-1">Lihat detail</Link>
          <button type="button" onClick={() => addToCart(product)} disabled={product.stock <= 0} className="joy-card-link joy-card-primary flex-1">{product.stock > 0 ? "+ Keranjang" : "Habis"}</button>
        </div>
      </div>
    </article>
  );
}
